const STAGES = new Set([
  'module_load',
  'configuration',
  'database_pool',
  'database_check',
  'application',
]);
const CODES = new Set([
  'ERR_MODULE_NOT_FOUND',
  'MODULE_NOT_FOUND',
  'ERR_DLOPEN_FAILED',
  'ERR_INVALID_URL',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'SELF_SIGNED_CERT_IN_CHAIN',
  '28P01',
  '28000',
  '3D000',
  '42P01',
  '42501',
  '53300',
]);
const ENV_FIELDS = [
  'NODE_ENV',
  'APP_MODE',
  'ALLOW_DEMO_SEED',
  'APP_ORIGIN',
  'DATABASE_URL',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'ENCRYPTION_KEY_ID',
  'ENCRYPTION_KEYRING',
  'DB_POOL_MIN',
  'DB_POOL_MAX',
  'DB_STATEMENT_TIMEOUT_MS',
  'TRUST_PROXY',
  'LOG_LEVEL',
  'PORT',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'FRONTEND_DIST_DIR',
  'SERVE_FRONTEND_DIST',
];

export function startupError(stage, cause) {
  return Object.assign(new Error('API initialization failed.', { cause }), { startupStage: stage });
}

// Log only classifications and source locations: never raw errors, SQL, URLs, or env values.
export function describeStartupError(error) {
  let cause = error;
  for (let depth = 0; depth < 5 && cause?.cause; depth += 1) cause = cause.cause;
  const message = typeof cause?.message === 'string' ? cause.message : '';
  const stage = STAGES.has(error?.startupStage) ? error.startupStage : 'initialize';
  const code = CODES.has(cause?.code) ? cause.code : 'INITIALIZATION_FAILED';
  const missingModule = ['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'].includes(code)
    ? message.match(/Cannot find package ['"]((?:@[\w.-]+\/)?[\w.-]+)['"]/)?.[1] ||
      message.match(/Cannot find module ['"][^'"]*[/\\]([\w.-]+\.(?:mjs|js|node|json))['"]/)?.[1]
    : undefined;
  const fields =
    stage === 'configuration'
      ? ENV_FIELDS.filter((field) => new RegExp(`\\b${field}\\b`).test(message))
      : [];
  const locations = (typeof cause?.stack === 'string' ? cause.stack.split('\n').slice(1) : [])
    .flatMap(
      (line) => line.match(/(?:backend|api|node_modules)\/[\w@./-]+\.[cm]?js:\d+:\d+/g) || []
    )
    .slice(0, 3);
  return {
    event: 'vercel_api_initialization_failed',
    stage,
    code,
    ...(missingModule ? { module: missingModule } : {}),
    ...(fields.length ? { fields } : {}),
    ...(locations.length ? { locations } : {}),
    node: process.version,
  };
}
