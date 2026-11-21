import { loadEnv } from './config/env.js';
import { createDatabase } from './config/database.js';
import { createLogger } from './lib/logger.js';
import { createBoss } from './jobs/boss.js';
import { registerJobQueuesAndWorkers } from './jobs/register-jobs.js';
import { assertNoDummyData } from './config/production-data.js';

const env = loadEnv();
if (env.isProd && !env.WORKER_DATABASE_URL)
  throw new Error('WORKER_DATABASE_URL khusus worker wajib dikonfigurasi untuk production.');
const logger = createLogger(env.LOG_LEVEL);
const db = createDatabase(
  env.WORKER_DATABASE_URL || env.DATABASE_ADMIN_URL || env.DATABASE_URL,
  env
);
const boss = createBoss(env, logger);

async function start() {
  if (env.isProd) await assertNoDummyData(db);
  await boss.start();
  await registerJobQueuesAndWorkers(boss, db, logger, env);
  logger.info('worker_started', { appMode: env.APP_MODE });
}

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  logger.info('worker_shutting_down', { signal });
  try {
    await boss.stop({ graceful: true, timeout: 5000 });
  } catch (err) {
    logger.error('worker_stop_error', { msg: err?.message });
  }
  await db.destroy();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch(async (err) => {
  logger.error('worker_startup_failed', { msg: err?.message });
  await db.destroy();
  process.exit(1);
});
