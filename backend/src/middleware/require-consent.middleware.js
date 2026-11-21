import { consentRequired } from '../lib/errors.js';
import { getStudentPersonalAccess } from '../policies/student-personal-access.policy.js';

export function createRequireConsentMiddleware(db) {
  return async (req, _res, next) => {
    try {
      const user = req.currentUser;
      if (!user) return next(consentRequired());
      if (user.role !== 'student') return next();

      const access = await getStudentPersonalAccess(db, user);
      if (!access.status.canUsePersonalFeatures) {
        const message = access.status.paused
          ? 'Pencatatan aktivitas dijeda. Aktifkan kembali melalui pengaturan akun.'
          : !access.policy
            ? 'Kebijakan persetujuan aktif belum tersedia.'
            : access.status.status === 'accepted' && !access.status.guardianVerified
              ? 'Fungsi pribadi menunggu verifikasi persetujuan wali sesuai kebijakan sekolah.'
              : undefined;
        return next(consentRequired(message));
      }
      req.activeConsent = access.consent;
      req.activePolicy = access.policy;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
