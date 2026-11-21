import PgBoss from 'pg-boss';

// Run only as the migration operator; the worker retains no database-wide DDL permission.
export async function prepareWorkerSchema(db, env) {
  if (!env.WORKER_DATABASE_URL)
    throw new Error('WORKER_DATABASE_URL wajib diisi untuk menyiapkan schema worker.');
  const worker = new URL(env.WORKER_DATABASE_URL);
  const operator = new URL(env.DATABASE_ADMIN_URL);
  const actual = (await db.raw('SELECT current_database() AS name')).rows[0].name;
  const role = decodeURIComponent(worker.username);
  if (
    worker.host !== operator.host ||
    decodeURIComponent(worker.pathname.slice(1)) !== actual ||
    role === decodeURIComponent(operator.username)
  ) {
    throw new Error('Worker harus memakai role tersendiri pada database yang sama dengan migrasi.');
  }
  const schemaAccess = await db.raw(
    "SELECT has_schema_privilege(?, 'pgboss', 'USAGE') AND has_schema_privilege(?, 'pgboss', 'CREATE') AS allowed",
    [role, role]
  );
  if (!schemaAccess.rows[0].allowed)
    await db.raw('GRANT USAGE, CREATE ON SCHEMA pgboss TO ??', [role]);
  const installed =
    (await db('pg_catalog.pg_tables')
      .where({ schemaname: 'pgboss', tablename: 'version' })
      .first()) !== undefined;
  const canCreate = (
    await db.raw("SELECT has_database_privilege(?, ?, 'CREATE') AS allowed", [role, actual])
  ).rows[0].allowed;
  const temporaryGrant = !installed && !canCreate;
  const boss = new PgBoss({
    connectionString: env.WORKER_DATABASE_URL,
    schema: 'pgboss',
    migrate: true,
  });
  boss.on('error', () => {});
  try {
    if (temporaryGrant) await db.raw('GRANT CREATE ON DATABASE ?? TO ??', [actual, role]);
    await boss.start();
  } finally {
    try {
      await boss.stop({ graceful: true, timeout: 5000 });
    } finally {
      if (temporaryGrant) await db.raw('REVOKE CREATE ON DATABASE ?? FROM ??', [actual, role]);
    }
  }
}
