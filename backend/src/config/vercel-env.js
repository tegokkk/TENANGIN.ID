import { loadEnv } from './env.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'database.internal']);

export function loadVercelEnv(source = process.env) {
  const env = loadEnv({
    ...source,
    NODE_ENV: 'production',
    TRUST_PROXY: source.TRUST_PROXY ?? '1',
    DB_POOL_MIN: source.DB_POOL_MIN ?? '0',
    DB_POOL_MAX: source.DB_POOL_MAX ?? '3',
  });
  const database = new URL(env.DATABASE_URL);
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    LOCAL_HOSTS.has(database.hostname)
  ) {
    throw new Error(
      'DATABASE_URL Vercel harus memakai PostgreSQL yang dapat dijangkau dari deployment.'
    );
  }
  if (/\/(tenangin_test|tenangin_demo)(?:\?|$)/i.test(database.href)) {
    throw new Error('Vercel tidak boleh memakai database test atau demo.');
  }
  if (env.TRUST_PROXY !== 1) {
    throw new Error('Konfigurasi Vercel ini membutuhkan TRUST_PROXY=1 untuk cookie HTTPS.');
  }
  return { ...env, isServerless: true };
}
