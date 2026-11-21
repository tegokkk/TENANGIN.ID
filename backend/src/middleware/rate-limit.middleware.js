import rateLimit from 'express-rate-limit';

export function createAuthRateLimiter(env) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.isTest ? 500 : 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.',
          request_id: res.locals?.requestId || null,
        },
      });
    },
  });
}

export function createSensitiveMutationLimiter(env) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: env.isTest ? 500 : 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Permintaan terlalu cepat. Coba sebentar lagi.',
          request_id: res.locals?.requestId || null,
        },
      });
    },
  });
}
