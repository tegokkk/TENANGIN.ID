import helmet from 'helmet';

export function createSecurityHeadersMiddleware(env) {
  return helmet({
    contentSecurityPolicy: env.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'", 'data:'],
            mediaSrc: ["'self'"],
            workerSrc: ["'self'"],
            manifestSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}
