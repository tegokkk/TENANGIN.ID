import express from 'express';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, unauthorized } from '../../lib/errors.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  studentRegistrationSchema,
  changePasswordSchema,
  loginSchema,
  mfaCodeSchema,
  mfaRecoverSchema,
  recoverSchema,
} from './auth.schema.js';
import {
  changeOwnPassword,
  confirmStaffMfaSetup,
  generateStaffMfaSetup,
  getUserSessionState,
  recoverAccountPassword,
  verifyStaffMfaCode,
  verifyStaffMfaRecoveryCode,
} from './auth.service.js';
import { registerStudent } from './student-registration.service.js';
import { recordAuditEvent } from '../audit/audit.service.js';

function regenerateSession(req, setupFn) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      try {
        setupFn();
        req.session.save((saveErr) => {
          if (saveErr) return reject(saveErr);
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function createAuthRouter({ db, env, passport, csrf, authLimiter, authenticate }) {
  const router = express.Router();

  router.get('/csrf', (req, res) => {
    const token = csrf.generateToken(req, true);
    req.session.save((err) => {
      if (err) {
        return res
          .status(500)
          .json({ ok: false, error: { code: 'SESSION_ERROR', message: 'Gagal membuat sesi.' } });
      }
      return sendSuccess(res, { csrfToken: token });
    });
  });

  router.get(
    '/session',
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.id) {
        return sendSuccess(res, { authenticated: false, user: null });
      }
      const state = await getUserSessionState(db, req.user.id, req.session);
      if (!state) {
        return sendSuccess(res, { authenticated: false, user: null });
      }
      return sendSuccess(res, { authenticated: true, ...state });
    })
  );

  router.post(
    '/login',
    authLimiter,
    csrf.csrfProtection,
    validateRequest({ body: loginSchema }),
    (req, res, next) => {
      passport.authenticate('local', async (err, user, info) => {
        try {
          if (err) return next(err);
          if (!user) {
            return next(
              unauthorized(
                info?.code === 'ACCOUNT_PENDING_APPROVAL'
                  ? 'Akunmu masih menunggu persetujuan Superadmin.'
                  : 'Akun atau kata sandi tidak cocok.',
                info?.code === 'ACCOUNT_PENDING_APPROVAL' ? info.code : 'INVALID_CREDENTIALS'
              )
            );
          }

          const isMfaActive = Boolean(user.mfaEnabled);
          await regenerateSession(req, () => {
            req.session.passport = { user: { id: user.id } };
            req.session.authIssuedAt = Date.now();
            req.session.mfaVerified = !isMfaActive;
          });

          const newCsrf = csrf.generateToken(req, true);
          await new Promise((resolve, reject) =>
            req.session.save((e) => (e ? reject(e) : resolve()))
          );

          const state = await getUserSessionState(db, user.id, req.session);
          if (!state) {
            return next(unauthorized('Akun tidak aktif.'));
          }

          await recordAuditEvent(db, {
            schoolId: state.user.schoolId,
            actorUserId: state.user.id,
            actorCode: state.user.accountCode,
            actorRole: state.user.role,
            action: 'login_password_verified',
            targetType: 'session',
            targetId: state.user.id,
            outcome: 'success',
            summary: `Login sandi berhasil untuk ${state.user.accountCode} (role: ${state.user.role}).`,
          });

          return sendSuccess(res, { ...state, csrfToken: newCsrf });
        } catch (innerErr) {
          return next(innerErr);
        }
      })(req, res, next);
    }
  );

  router.post(
    '/register',
    authLimiter,
    csrf.csrfProtection,
    validateRequest({ body: studentRegistrationSchema }),
    asyncHandler(async (req, res) => {
      const result = await registerStudent(db, env, req.validatedBody);
      return sendSuccess(res, result, 202);
    })
  );
  router.post('/activate', authLimiter, csrf.csrfProtection, (_req, res) =>
    res
      .status(410)
      .json({
        ok: false,
        error: {
          code: 'ACTIVATION_RETIRED',
          message:
            'Aktivasi akun hanya dilakukan oleh Superadmin. Siswa dapat mendaftar melalui formulir pendaftaran.',
        },
      })
  );

  router.post(
    '/recover',
    authLimiter,
    csrf.csrfProtection,
    validateRequest({ body: recoverSchema }),
    asyncHandler(async (req, res) => {
      const result = await recoverAccountPassword(db, env, req.validatedBody);
      return sendSuccess(res, {
        recovered: true,
        accountCode: result.accountCode,
        message: 'Kata sandi diperbarui. Sesi lama telah dicabut, silakan masuk kembali.',
      });
    })
  );

  router.post(
    '/change-password',
    authenticate,
    csrf.csrfProtection,
    validateRequest({ body: changePasswordSchema }),
    asyncHandler(async (req, res) => {
      const wasMfaVerified = Boolean(req.session?.mfaVerified);
      await changeOwnPassword(db, env, req.currentUser.id, req.validatedBody);

      await regenerateSession(req, () => {
        req.session.passport = { user: { id: req.currentUser.id } };
        req.session.authIssuedAt = Date.now();
        req.session.mfaVerified = wasMfaVerified;
      });
      const newCsrf = csrf.generateToken(req, true);
      await new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));

      return sendSuccess(res, {
        changed: true,
        csrfToken: newCsrf,
        message: 'Kata sandi berhasil diperbarui dan sesi lain telah dicabut.',
      });
    })
  );

  router.post(
    '/mfa/setup',
    authenticate,
    csrf.csrfProtection,
    asyncHandler(async (req, res) => {
      if (req.currentUser.mfaEnabled && req.session?.mfaVerified !== true) {
        throw badRequest('Verifikasi MFA yang sudah aktif terlebih dahulu sebelum mengatur ulang.');
      }
      const { secret, otpauthUri } = generateStaffMfaSetup(req.currentUser);
      req.session.pendingMfaSecret = secret;
      await new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));

      return sendSuccess(res, {
        secret,
        otpauthUri,
        accountCode: req.currentUser.accountCode,
      });
    })
  );

  router.post(
    '/mfa/setup/confirm',
    authenticate,
    csrf.csrfProtection,
    validateRequest({ body: mfaCodeSchema }),
    asyncHandler(async (req, res) => {
      const pendingSecret = req.session?.pendingMfaSecret;
      const issuedAt = req.session?.authIssuedAt || Date.now();
      const { recoveryCodes } = await confirmStaffMfaSetup(
        db,
        env,
        req.currentUser,
        pendingSecret,
        req.validatedBody.code
      );

      await regenerateSession(req, () => {
        req.session.passport = { user: { id: req.currentUser.id } };
        req.session.authIssuedAt = issuedAt;
        req.session.mfaVerified = true;
      });
      const newCsrf = csrf.generateToken(req, true);
      await new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));

      const state = await getUserSessionState(db, req.currentUser.id, req.session);
      return sendSuccess(res, { ...state, recoveryCodes, csrfToken: newCsrf });
    })
  );

  router.post(
    '/mfa/verify',
    authLimiter,
    authenticate,
    csrf.csrfProtection,
    validateRequest({ body: mfaCodeSchema }),
    asyncHandler(async (req, res) => {
      await verifyStaffMfaCode(db, env, req.currentUser.id, req.validatedBody.code);
      const issuedAt = req.session?.authIssuedAt || Date.now();

      await regenerateSession(req, () => {
        req.session.passport = { user: { id: req.currentUser.id } };
        req.session.authIssuedAt = issuedAt;
        req.session.mfaVerified = true;
      });
      const newCsrf = csrf.generateToken(req, true);
      await new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));

      const state = await getUserSessionState(db, req.currentUser.id, req.session);
      return sendSuccess(res, { ...state, csrfToken: newCsrf });
    })
  );

  router.post(
    '/mfa/recover',
    authLimiter,
    authenticate,
    csrf.csrfProtection,
    validateRequest({ body: mfaRecoverSchema }),
    asyncHandler(async (req, res) => {
      await verifyStaffMfaRecoveryCode(db, req.currentUser.id, req.validatedBody.recoveryCode);
      const issuedAt = req.session?.authIssuedAt || Date.now();

      await regenerateSession(req, () => {
        req.session.passport = { user: { id: req.currentUser.id } };
        req.session.authIssuedAt = issuedAt;
        req.session.mfaVerified = true;
      });
      const newCsrf = csrf.generateToken(req, true);
      await new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));

      const state = await getUserSessionState(db, req.currentUser.id, req.session);
      return sendSuccess(res, { ...state, csrfToken: newCsrf });
    })
  );

  router.post(
    '/logout',
    csrf.csrfProtection,
    asyncHandler(async (req, res) => {
      try {
        csrf.revokeToken(req);
      } catch {
        // abaikan bila belum ada token
      }
      if (req.session) {
        await new Promise((resolve) => req.session.destroy(() => resolve()));
      }
      res.clearCookie('tenangin.sid', { path: '/' });
      return sendSuccess(res, { loggedOut: true });
    })
  );

  return router;
}

export function createMeRouter({ db, authenticate }) {
  const router = express.Router();

  router.get(
    '/',
    authenticate,
    asyncHandler(async (req, res) => {
      const state = await getUserSessionState(db, req.currentUser.id, req.session);
      if (!state) {
        throw unauthorized();
      }
      return sendSuccess(res, state);
    })
  );

  return router;
}
