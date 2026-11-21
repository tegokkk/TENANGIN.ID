import knex from 'knex';
import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';

export function createDatabase(databaseUrl, poolOrEnv = {}) {
  // Pastikan kolom DATE dikembalikan sebagai string YYYY-MM-DD agar tidak bergeser zona waktu
  pg.types.setTypeParser(1082, (val) => val);

  const min = poolOrEnv.DB_POOL_MIN ?? poolOrEnv.min ?? 1;
  const max = poolOrEnv.DB_POOL_MAX ?? poolOrEnv.max ?? 10;
  const timeoutMs = Number(poolOrEnv.DB_STATEMENT_TIMEOUT_MS ?? poolOrEnv.statementTimeoutMs ?? 0);

  const db = knex({
    client: 'pg',
    connection: databaseUrl,
    pool: {
      min,
      max,
      ...(poolOrEnv.isServerless ? { idleTimeoutMillis: 5000, reapIntervalMillis: 1000 } : {}),
      ...(timeoutMs > 0
        ? {
            afterCreate(conn, done) {
              conn.query(`SET statement_timeout TO ${timeoutMs}`, (err) => {
                done(err, conn);
              });
            },
          }
        : {}),
    },
  });

  if (poolOrEnv.isServerless) {
    // Tarn exposes release(resource); adapt it to the documented pool interface.
    // Include the reap interval so idle clients close before Fluid Compute suspends.
    const pool = db.client.pool;
    attachDatabasePool({
      options: { idleTimeoutMillis: pool.idleTimeoutMillis + pool.reapIntervalMillis },
      on: (_event, released) => pool.on('release', (client) => released(null, client)),
    });
  }

  return db;
}
