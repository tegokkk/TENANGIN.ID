import { createApp } from './app.js';
import { createDatabase } from './config/database.js';
import { loadVercelEnv } from './config/vercel-env.js';
import { assertNoDummyData } from './config/production-data.js';
import { createLogger } from './lib/logger.js';
import { startupError } from './lib/startup-error.js';

export async function createVercelRuntime({ env } = {}) {
  try {
    env ??= loadVercelEnv();
  } catch (error) {
    throw startupError('configuration', error);
  }
  const logger = createLogger(env.LOG_LEVEL);
  let db;
  try {
    db = createDatabase(env.DATABASE_URL, env);
  } catch (error) {
    throw startupError('database_pool', error);
  }
  let application;
  let stage = 'database_check';
  try {
    await assertNoDummyData(db);
    stage = 'application';
    application = createApp({ db, env, logger, serveFrontend: false });
  } catch (error) {
    await db.destroy();
    throw startupError(stage, error);
  }
  return {
    app: application.app,
    close: async () => {
      await application.close();
      await db.destroy();
    },
  };
}
