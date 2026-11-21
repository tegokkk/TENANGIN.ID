import { mfaRequired } from '../lib/errors.js';

export function requireMfaMiddleware(req, _res, next) {
  const user = req.currentUser;
  if (!user) {
    return next(mfaRequired());
  }
  if (user.role === 'bk' || user.role === 'superadmin') {
    if (user.mfaEnabled && !req.session?.mfaVerified) {
      return next(mfaRequired());
    }
  }
  return next();
}
