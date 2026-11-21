import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { verifyPassword } from '../lib/password.js';

export function configurePassport(db) {
  const instance = new passport.Passport();

  instance.use(
    new LocalStrategy(
      {
        usernameField: 'identifier',
        passwordField: 'password',
        passReqToCallback: false,
      },
      async (identifier, password, done) => {
        try {
          const normalized = String(identifier || '')
            .trim()
            .toLowerCase();
          if (!normalized || !password) {
            return done(null, false, { message: 'Kode akun atau kata sandi tidak cocok.' });
          }

          const user = await db('users')
            .whereRaw(
              "LOWER(account_code) = ? OR LOWER(COALESCE(login_email, '')) = ? OR LOWER(COALESCE(nisn, '')) = ?",
              [normalized, normalized, normalized]
            )
            .first();

          if (!user || !user.password_hash) {
            return done(null, false, { message: 'Akun atau kata sandi tidak cocok.' });
          }

          const valid = await verifyPassword(user.password_hash, password);
          if (!valid) {
            return done(null, false, { message: 'Akun atau kata sandi tidak cocok.' });
          }

          if (
            user.status !== 'active' ||
            user.registration_status === 'pending' ||
            user.registration_status === 'rejected'
          ) {
            return done(
              null,
              false,
              user.status === 'pending_activation' || user.registration_status === 'pending'
                ? { code: 'ACCOUNT_PENDING_APPROVAL' }
                : { message: 'Akun tidak aktif.' }
            );
          }

          return done(null, {
            id: user.id,
            role: user.role,
            schoolId: user.school_id,
            mfaEnabled: Boolean(user.mfa_enabled),
          });
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  instance.serializeUser((user, done) => {
    done(null, { id: user.id });
  });

  instance.deserializeUser((payload, done) => {
    if (!payload || !payload.id) {
      return done(null, false);
    }
    return done(null, { id: payload.id });
  });

  return instance;
}
