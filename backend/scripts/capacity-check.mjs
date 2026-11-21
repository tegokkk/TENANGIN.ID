import request from 'supertest';
import { performance } from 'node:perf_hooks';
import { loadEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { createLogger } from '../src/lib/logger.js';
import { createApp } from '../src/app.js';

async function runCapacityCheck() {
  const env = loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent' });
  const db = createDatabase(env.TEST_DATABASE_URL || env.DATABASE_URL, env);
  const { app, close } = createApp({ db, env, logger: createLogger('silent') });

  try {
    const t0 = performance.now();
    await db.raw(
      `EXPLAIN (FORMAT JSON) SELECT id, grade_group, occurred_at FROM activity_metadata_events WHERE school_id = ? AND occurred_at >= NOW() - INTERVAL '30 days' ORDER BY occurred_at DESC LIMIT 50`,
      ['00000000-0000-0000-0000-000000000000']
    );
    await db.raw(
      `EXPLAIN (FORMAT JSON) SELECT id, action, created_at FROM audit_events WHERE school_id = ? ORDER BY created_at DESC LIMIT 50`,
      ['00000000-0000-0000-0000-000000000000']
    );
    const explainMs = Math.round(performance.now() - t0);

    const b0 = performance.now();
    const paths = ['/api/health', '/api/articles', '/api/exercises', '/api/public/config'];
    const burst = [];
    for (let i = 0; i < 24; i++) {
      burst.push(request(app).get(paths[i % paths.length]));
    }
    const responses = await Promise.all(burst);
    const failed = responses.filter((r) => r.status !== 200);
    const burstMs = Math.round(performance.now() - b0);

    if (failed.length > 0) {
      throw new Error(`${failed.length} permintaan burst gagal.`);
    }

    const pool = db.client?.pool;
    console.log('Uji kapasitas & indeks berhasil:', {
      explainMs,
      burstRequests: responses.length,
      burstTotalMs: burstMs,
      poolConfig: {
        min: env.DB_POOL_MIN,
        max: env.DB_POOL_MAX,
        statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
      },
      poolUsedAfterBurst: typeof pool?.numUsed === 'function' ? pool.numUsed() : 0,
    });
  } finally {
    await close();
    await db.destroy();
  }
}

runCapacityCheck().catch((err) => {
  console.error('Uji kapasitas gagal:', err.message);
  process.exit(1);
});
