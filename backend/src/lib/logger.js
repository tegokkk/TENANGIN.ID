const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'secret',
  'token',
  'csrfToken',
  'totpSecret',
  'totp_secret',
  'situation',
  'thoughts',
  'feelings',
  'alternative',
  'answer_q1',
  'answer_q2',
  'answer_q3',
  'answers',
  'message',
  'contact',
  'ciphertext',
  'encryptionKey',
  'sessionSecret',
  'cookie',
  'authorization',
]);

export function sanitizeForLog(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[TRUNCATED]';
  if (typeof value === 'string') {
    return value.length > 240 ? `${value.slice(0, 240)}...` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitizeForLog(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

export function createLogger(minLevel = 'info') {
  const threshold = LEVELS[minLevel] ?? 20;
  function write(level, msg, meta = {}) {
    if ((LEVELS[level] ?? 20) < threshold) return;
    const entry = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...sanitizeForLog(meta),
    };
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
      console.error(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (msg, meta) => write('debug', msg, meta),
    info: (msg, meta) => write('info', msg, meta),
    warn: (msg, meta) => write('warn', msg, meta),
    error: (msg, meta) => write('error', msg, meta),
  };
}
