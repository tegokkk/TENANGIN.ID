import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createSecurityHeadersMiddleware } from './config/security.js';
import { createSessionMiddleware } from './config/session.js';
import { configurePassport } from './config/passport.js';
import { createCsrfMiddleware } from './middleware/csrf.middleware.js';
import { requestContextMiddleware } from './middleware/request-context.middleware.js';
import { createCompressionMiddleware } from './middleware/compression.middleware.js';
import { noStoreMiddleware } from './middleware/no-store.middleware.js';
import {
  createAuthRateLimiter,
  createSensitiveMutationLimiter,
} from './middleware/rate-limit.middleware.js';
import { createAuthenticateMiddleware } from './middleware/authenticate.middleware.js';
import { requireMfaMiddleware } from './middleware/require-mfa.middleware.js';
import { createAuthorizeMiddleware } from './middleware/authorize.middleware.js';
import { createRequireConsentMiddleware } from './middleware/require-consent.middleware.js';
import { createErrorHandler } from './middleware/error-handler.middleware.js';
import { createApiRouter } from './routes/index.js';

export function createApp({
  db,
  env,
  logger,
  enqueueJob = null,
  pushTransport = null,
  serveFrontend = true,
}) {
  const app = express();
  if (env.TRUST_PROXY > 0) {
    app.set('trust proxy', env.TRUST_PROXY);
  }

  const sessionObj = createSessionMiddleware(env);
  const passportInstance = configurePassport(db);
  const csrf = createCsrfMiddleware();

  const authenticate = createAuthenticateMiddleware(db);
  const authorize = (roles) => createAuthorizeMiddleware(db, roles);
  const requireConsent = createRequireConsentMiddleware(db);
  const authLimiter = createAuthRateLimiter(env);
  const mutationLimiter = createSensitiveMutationLimiter(env);

  app.disable('x-powered-by');
  app.use(requestContextMiddleware(logger));
  app.use(createSecurityHeadersMiddleware(env));
  app.use(createCompressionMiddleware());
  app.use(express.json({ limit: '128kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(cookieParser());
  app.use(sessionObj.middleware);
  app.use(passportInstance.initialize());
  app.use(passportInstance.session());

  app.use('/api', noStoreMiddleware);
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      return mutationLimiter(req, res, next);
    }
    return next();
  });

  app.use(
    '/api',
    createApiRouter({
      db,
      env,
      logger,
      passport: passportInstance,
      csrf,
      authLimiter,
      authenticate,
      requireMfa: requireMfaMiddleware,
      authorize,
      requireConsent,
      enqueueJob,
      pushTransport,
    })
  );

  const appDir = path.dirname(fileURLToPath(import.meta.url));
  const distDir = env.FRONTEND_DIST_DIR
    ? path.resolve(env.FRONTEND_DIST_DIR)
    : path.resolve(appDir, '../../frontend/dist');

  if (serveFrontend && env.isProd && !fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(
      'Build frontend belum tersedia. Jalankan npm run build sebelum menyalakan production.'
    );
  }
  if (
    serveFrontend &&
    (env.isProd || env.SERVE_FRONTEND_DIST) &&
    fs.existsSync(path.join(distDir, 'index.html'))
  ) {
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        return next();
      }
      return res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(createErrorHandler(logger));

  return {
    app,
    close: async () => {
      await sessionObj.close();
    },
  };
}
