import { forbidden } from '../lib/errors.js';
import { recordAuditEvent } from '../modules/audit/audit.service.js';

export function createAuthorizeMiddleware(db, allowedRoles) {
  const allowed = new Set(Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]);

  return async (req, _res, next) => {
    const user = req.currentUser;
    if (!user || !allowed.has(user.role)) {
      if (db && user) {
        try {
          await recordAuditEvent(db, {
            schoolId: user.schoolId,
            actorUserId: user.id,
            actorCode: user.accountCode,
            actorRole: user.role,
            action: 'authorization_denied',
            targetType: 'route',
            targetId: req.originalUrl?.slice(0, 180) || req.path,
            outcome: 'denied',
            summary: `Akses ditolak untuk metode ${req.method}`,
          });
        } catch {
          // jangan gagalkan error handling utama bila pencatatan audit gagal
        }
      }
      return next(forbidden());
    }
    return next();
  };
}
