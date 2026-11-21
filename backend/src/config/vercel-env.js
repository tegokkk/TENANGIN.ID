import { loadEnv } from './env.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'database.internal']);

function deploymentOrigin(source) {
  const domains =
    source.VERCEL_ENV === 'production'
      ? [source.VERCEL_PROJECT_PRODUCTION_URL, source.VERCEL_URL]
      : [source.VERCEL_URL, source.VERCEL_PROJECT_PRODUCTION_URL];
  for (const domain of domains) {
    if (typeof domain !== 'string' || !domain.trim()) continue;
    try {
      const hostname = domain.trim().toLowerCase();
      const url = new URL(`https://${hostname}`);
      if (
        url.host === hostname &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password &&
        !LOCAL_HOSTS.has(url.hostname)
      )
        return url.origin;
    } catch {
      /* Ignore a malformed platform hostname; validate APP_ORIGIN below. */
    }
  }
  return undefined;
}

function appOrigin(source) {
  const hosted = deploymentOrigin(source);
  const configured = typeof source.APP_ORIGIN === 'string' ? source.APP_ORIGIN.trim() : '';
  if (!configured && hosted) return hosted;
  if (!configured)
    throw new Error(
      'APP_ORIGIN belum tersedia. Isi origin HTTPS atau aktifkan system environment variables Vercel.'
    );
  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('APP_ORIGIN harus berupa origin HTTPS yang valid.');
  }
  if (url.username || url.password) throw new Error('APP_ORIGIN tidak boleh memuat kredensial.');
  // A copied local development origin must never become the cloud origin.
  if (hosted && LOCAL_HOSTS.has(url.hostname)) return hosted;
  // Vercel's own hostname is always served with TLS.
  if (hosted && url.protocol === 'http:' && url.host === new URL(hosted).host) return hosted;
  return url.origin;
}

export function loadVercelEnv(source = process.env) {
  const env = loadEnv({
    ...source,
    NODE_ENV: 'production',
    APP_ORIGIN: appOrigin(source),
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
