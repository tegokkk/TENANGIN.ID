import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const pgBinDir = process.env.PG_BIN_DIR || 'D:\\ProgramFile\\PostgreSQL\\15\\bin';
const dataDir = path.resolve(repoRoot, '.local', 'pgdata');
const logFile = path.resolve(repoRoot, '.local', 'postgres.log');
const backendEnvPath = path.resolve(repoRoot, 'backend', '.env');
const pgPort = process.env.LOCAL_PG_PORT || '5433';

function binPath(name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  return path.join(pgBinDir, exe);
}

function runPgTool(tool, args, extraEnv = {}, detachStdio = false) {
  return execFileSync(binPath(tool), args, {
    encoding: 'utf8',
    stdio: detachStdio ? 'ignore' : ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...extraEnv },
  });
}

function ensureLocalEnvSecrets() {
  if (fs.existsSync(backendEnvPath)) {
    const content = fs.readFileSync(backendEnvPath, 'utf8');
    const getVal = (key) => {
      const m = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
      return m ? m[1].trim() : '';
    };
    const adminUrl = getVal('DATABASE_ADMIN_URL');
    const appUrl = getVal('DATABASE_URL');
    const adminPassMatch = adminUrl.match(/tenangin_admin:([^@]+)@/);
    const appPassMatch = appUrl.match(/tenangin_app:([^@]+)@/);
    return {
      adminPass: adminPassMatch ? adminPassMatch[1] : 'tenangin_admin_local_dev',
      appPass: appPassMatch ? appPassMatch[1] : 'tenangin_app_local_dev',
      postgresPass: 'postgres_local_dev',
    };
  }

  const adminPass = crypto.randomBytes(16).toString('hex');
  const appPass = crypto.randomBytes(16).toString('hex');
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const encKey = crypto.randomBytes(32).toString('hex');

  const envBody = [
    'NODE_ENV=development',
    'APP_MODE=pilot',
    'PORT=3000',
    'APP_ORIGIN=http://127.0.0.1:5173',
    'TRUST_PROXY=0',
    `DATABASE_URL=postgres://tenangin_app:${appPass}@127.0.0.1:${pgPort}/tenangin_production`,
    `DATABASE_ADMIN_URL=postgres://tenangin_admin:${adminPass}@127.0.0.1:${pgPort}/tenangin_production`,
    `TEST_DATABASE_URL=postgres://tenangin_admin:${adminPass}@127.0.0.1:${pgPort}/tenangin_test`,
    `TEST_APP_DATABASE_URL=postgres://tenangin_app:${appPass}@127.0.0.1:${pgPort}/tenangin_test`,
    `SESSION_SECRET=${sessionSecret}`,
    `ENCRYPTION_KEY_ID=k1`,
    `ENCRYPTION_KEY=${encKey}`,
    'ENCRYPTION_KEYRING=',
    'ALLOW_DEMO_SEED=false',
    'LOG_LEVEL=info',
    '',
  ].join('\n');

  fs.writeFileSync(backendEnvPath, envBody, 'utf8');
  return { adminPass, appPass, postgresPass: 'postgres_local_dev' };
}

function isRunning() {
  if (!fs.existsSync(dataDir)) return false;
  try {
    runPgTool('pg_ctl', ['-D', dataDir, 'status']);
    return true;
  } catch {
    return false;
  }
}

function initCluster() {
  const { adminPass, appPass, postgresPass } = ensureLocalEnvSecrets();
  fs.mkdirSync(path.dirname(dataDir), { recursive: true });

  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    const pwFile = path.resolve(repoRoot, '.local', 'pgpass.tmp');
    fs.writeFileSync(pwFile, `${postgresPass}\n`, 'utf8');
    try {
      runPgTool('initdb', [
        '-D',
        dataDir,
        '-U',
        'postgres',
        '--encoding=UTF8',
        '--locale=C',
        '--auth=scram-sha-256',
        `--pwfile=${pwFile}`,
      ]);
    } finally {
      if (fs.existsSync(pwFile)) fs.unlinkSync(pwFile);
    }

    const confPath = path.join(dataDir, 'postgresql.conf');
    fs.appendFileSync(
      confPath,
      `\nlisten_addresses = '127.0.0.1'\nport = ${pgPort}\nmax_connections = 50\n`,
      'utf8'
    );
  }

  if (!isRunning()) {
    runPgTool('pg_ctl', ['-D', dataDir, '-l', logFile, '-w', 'start'], {}, true);
  }

  const sqlEsc = (val) => val.replaceAll("'", "''");
  const bootstrapSql = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenangin_admin') THEN
    CREATE ROLE tenangin_admin WITH LOGIN PASSWORD '${sqlEsc(adminPass)}';
  ELSE
    ALTER ROLE tenangin_admin WITH LOGIN PASSWORD '${sqlEsc(adminPass)}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenangin_app') THEN
    CREATE ROLE tenangin_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${sqlEsc(appPass)}';
  ELSE
    ALTER ROLE tenangin_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${sqlEsc(appPass)}';
  END IF;
END
$$;
`;
  runPgTool(
    'psql',
    [
      '-h',
      '127.0.0.1',
      '-p',
      pgPort,
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      bootstrapSql,
    ],
    { PGPASSWORD: postgresPass }
  );

  for (const dbName of ['tenangin_production', 'tenangin_test']) {
    const existsOut = runPgTool(
      'psql',
      [
        '-h',
        '127.0.0.1',
        '-p',
        pgPort,
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-tAc',
        `SELECT 1 FROM pg_database WHERE datname='${dbName}'`,
      ],
      { PGPASSWORD: postgresPass }
    ).trim();

    if (existsOut !== '1') {
      runPgTool(
        'psql',
        [
          '-h',
          '127.0.0.1',
          '-p',
          pgPort,
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-v',
          'ON_ERROR_STOP=1',
          '-c',
          `CREATE DATABASE ${dbName} OWNER tenangin_admin ENCODING 'UTF8'`,
        ],
        { PGPASSWORD: postgresPass }
      );
    }

    const grantSql = `
GRANT CONNECT ON DATABASE ${dbName} TO tenangin_app;
GRANT USAGE ON SCHEMA public TO tenangin_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CREATE, USAGE ON SCHEMA public TO tenangin_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE tenangin_admin IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tenangin_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tenangin_admin IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tenangin_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenangin_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tenangin_app;
`;
    runPgTool(
      'psql',
      [
        '-h',
        '127.0.0.1',
        '-p',
        pgPort,
        '-U',
        'postgres',
        '-d',
        dbName,
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        grantSql,
      ],
      { PGPASSWORD: postgresPass }
    );
  }

  console.log(
    `Local PostgreSQL 15 siap di 127.0.0.1:${pgPort} (tenangin_production & tenangin_test).`
  );
}

function startCluster() {
  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    initCluster();
    return;
  }
  if (isRunning()) {
    console.log(`Local PostgreSQL sudah berjalan di 127.0.0.1:${pgPort}.`);
    return;
  }
  runPgTool('pg_ctl', ['-D', dataDir, '-l', logFile, '-w', 'start'], {}, true);
  console.log(`Local PostgreSQL dimulai di 127.0.0.1:${pgPort}.`);
}

function stopCluster() {
  if (!isRunning()) {
    console.log('Local PostgreSQL tidak sedang berjalan.');
    return;
  }
  runPgTool('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
  console.log('Local PostgreSQL dihentikan.');
}

function statusCluster() {
  console.log(isRunning() ? `Running on 127.0.0.1:${pgPort}` : 'Stopped');
}

function serveCluster() {
  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    initCluster();
    stopCluster();
  }
  const child = spawn(binPath('postgres'), ['-D', dataDir], {
    stdio: 'inherit',
  });
  const shutdown = () => {
    child.kill('SIGINT');
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  child.on('exit', (code) => process.exit(code ?? 0));
}

const cmd = process.argv[2] || 'status';
if (cmd === 'init') initCluster();
else if (cmd === 'start') startCluster();
else if (cmd === 'stop') stopCluster();
else if (cmd === 'status') statusCluster();
else if (cmd === 'serve') serveCluster();
else {
  console.error('Perintah valid: init | start | stop | status | serve');
  process.exit(1);
}
