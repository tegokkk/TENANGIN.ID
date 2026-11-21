import { createApp } from './app.js';
import { createDatabase } from './config/database.js';
import { loadVercelEnv } from './config/vercel-env.js';
import { assertNoDummyData } from './config/production-data.js';
import { createLogger } from './lib/logger.js';

export async function createVercelRuntime({ env = loadVercelEnv() } = {}) {
  const logger = createLogger(env.LOG_LEVEL);
  const db = createDatabase(env.DATABASE_URL, env);
  let application;
  try {
    await assertNoDummyData(db);
    application = createApp({ db, env, logger, serveFrontend: false });
  } catch (error) {
    await db.destroy();
    throw error;
  }
  return {
    app: application.app,
    close: async () => {
      await application.close();
      await db.destroy();
    },
  };
}
