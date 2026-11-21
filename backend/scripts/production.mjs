import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Select the production profile before importing modules that read configuration.
process.env.NODE_ENV = 'production';
const operation = process.argv[2] || 'server';
if (!['server', 'worker', 'migrate', 'bootstrap'].includes(operation))
  throw new Error('Operasi production tidak dikenal.');

if (operation === 'migrate') {
  const { loadEnv } = await import('../src/config/env.js');
  const { createDatabase } = await import('../src/config/database.js');
  const env = loadEnv();
  if (!env.DATABASE_ADMIN_URL)
    throw new Error('Migrasi production membutuhkan DATABASE_ADMIN_URL milik operator.');
  if (/\/tenangin_demo(?:\?|$)/i.test(env.DATABASE_ADMIN_URL))
    throw new Error('Migrasi production tidak boleh menargetkan database demo.');
  const db = createDatabase(env.DATABASE_ADMIN_URL, env);
  try {
    const directory = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../database/migrations'
    );
    const [batch, files] = await db.migrate.latest({ directory });
    const { prepareWorkerSchema } = await import('./prepare-worker.mjs');
    await prepareWorkerSchema(db, env);
    console.log(`Migrasi production batch ${batch}: ${files.length} file.`);
  } finally {
    await db.destroy();
  }
} else if (operation === 'bootstrap') {
  const { main } = await import('./bootstrap-admin.js');
  await main();
} else {
  await import(operation === 'worker' ? '../src/worker.js' : '../src/server.js');
}
