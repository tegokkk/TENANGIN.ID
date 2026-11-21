import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';

const PgSessionStore = connectPgSimple(session);

export function createSessionMiddleware(env) {
  const sessionPool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: env.isServerless ? 2 : 5,
    idleTimeoutMillis: env.isServerless ? 5000 : 10000,
    allowExitOnIdle: Boolean(env.isServerless),
  });
  if (env.isServerless) attachDatabasePool(sessionPool);

  const store = new PgSessionStore({
    pool: sessionPool,
    tableName: 'user_sessions',
    createTableIfMissing: false,
    pruneSessionInterval: env.isTest || env.isServerless ? false : 900,
  });

  const middleware = session({
    name: 'tenangin.sid',
    store,
    secret: env.SESSION_SECRET,
    proxy: env.TRUST_PROXY > 0 ? true : undefined,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
    },
  });

  return {
    middleware,
    store,
    close: async () => {
      await sessionPool.end();
    },
  };
}
