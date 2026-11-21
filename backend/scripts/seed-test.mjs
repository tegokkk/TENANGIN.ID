process.env.NODE_ENV = 'test';
const { loadEnv } = await import('../src/config/env.js');
const { createDatabase } = await import('../src/config/database.js');
const { runDemoSeed } = await import('../database/seeds/demo-seed.js');
const env = loadEnv({ APP_MODE: 'demo', ALLOW_DEMO_SEED: 'true' });
if (!env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL wajib diisi.');
const db = createDatabase(env.TEST_DATABASE_URL);
try {
  await runDemoSeed(db, env);
  console.log('Fixture pengujian diisi pada database test terpisah.');
} finally {
  await db.destroy();
}
