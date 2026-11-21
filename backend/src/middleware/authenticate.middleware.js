import { unauthorized } from '../lib/errors.js';

export function createAuthenticateMiddleware(db) {
  return async (req, res, next) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.id) {
        return next(unauthorized());
      }

      const user = await db('users')
        .select(
          'id',
          'school_id',
          'account_code',
          'nisn',
          'display_name',
          'role',
          'status',
          'grade_group',
          'registration_status',
          'mfa_enabled',
          'password_changed_at'
        )
        .where({ id: req.user.id })
        .first();

      if (
        !user ||
        user.status !== 'active' ||
        user.registration_status === 'pending' ||
        user.registration_status === 'rejected'
      ) {
        if (req.session) {
          req.session.destroy(() => {});
        }
        return next(unauthorized('Akun tidak aktif atau sesi dicabut.'));
      }

      const sessionIssuedAt = req.session?.authIssuedAt || 0;
      const pwChangedMs = user.password_changed_at
        ? new Date(user.password_changed_at).getTime()
        : 0;
      if (pwChangedMs && sessionIssuedAt && pwChangedMs > sessionIssuedAt) {
        if (req.session) {
          req.session.destroy(() => {});
        }
        return next(unauthorized('Kata sandi baru saja diperbarui. Silakan masuk kembali.'));
      }

      req.currentUser = {
        id: user.id,
        schoolId: user.school_id,
        accountCode: user.account_code,
        nisn: user.nisn || null,
        displayName: user.display_name,
        role: user.role,
        status: user.status,
        gradeGroup: user.grade_group,
        mfaEnabled: Boolean(user.mfa_enabled),
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
