import { csrfSync } from 'csrf-sync';

export function createCsrfMiddleware() {
  const { generateToken, revokeToken, csrfSynchronisedProtection } = csrfSync({
    getTokenFromRequest: (req) => req.get('x-csrf-token') || req.body?._csrf,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  });

  return {
    generateToken,
    revokeToken,
    csrfProtection: csrfSynchronisedProtection,
  };
}
