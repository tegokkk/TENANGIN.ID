import { loadEnv } from './config/env.js';
import { createDatabase } from './config/database.js';
import { createLogger } from './lib/logger.js';
import { createApp } from './app.js';
import { assertNoDummyData } from './config/production-data.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const db = createDatabase(env.DATABASE_URL, env);
if (env.isProd) await assertNoDummyData(db);

const { app, close: closeApp } = createApp({ db, env, logger });

const server = app.listen(env.PORT, '127.0.0.1', () => {
  logger.info('api_server_started', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    appMode: env.APP_MODE,
  });
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('api_server_shutting_down', { signal });
  server.close(async () => {
    await closeApp();
    await db.destroy();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
