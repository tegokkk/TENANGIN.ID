import PgBoss from 'pg-boss';

export function createBoss(env, logger) {
  const boss = new PgBoss({
    connectionString:
      env.WORKER_DATABASE_URL ||
      (env.isProd ? env.DATABASE_URL : env.DATABASE_ADMIN_URL || env.DATABASE_URL),
    schema: 'pgboss',
    migrate: !env.isProd,
  });

  boss.on('error', (err) => {
    if (logger) {
      logger.error('pgboss_error', { msg: err?.message });
    }
  });

  return boss;
}
