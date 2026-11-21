import { authenticator } from 'otplib';
import { badRequest, forbidden, unauthorized } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { decryptSensitiveText, encryptSensitiveText } from '../../lib/encryption.js';
import { generateOpaqueToken, hashToken } from '../../lib/idempotency.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { getStudentPersonalAccess } from '../../policies/student-personal-access.policy.js';

export async function getUserSessionState(db, userId, sessionObj = {}) {
  const user = await db('users')
    .select(
      'id',
      'school_id',
      'account_code',
      'nisn',
      'login_email',
      'display_name',
      'role',
      'status',
      'grade_group',
      'registration_status',
      'mfa_enabled'
    )
    .where({ id: userId })
    .first();

  if (
    !user ||
    user.status !== 'active' ||
    user.registration_status === 'pending' ||
    user.registration_status === 'rejected'
  ) {
    return null;
  }

  const school = await db('schools')
    .select(
      'id',
      'code',
      'name',
      'timezone',
      'service_hours',
      'verified_contacts',
      'guardian_consent_required',
      'personal_access_mode',
      'active_handler_configured'
    )
    .where({ id: user.school_id })
    .first();

  let consentStatus = {
    required: false,
    hasActiveConsent: true,
    guardianVerified: true,
    activePolicyVersion: null,
    status: 'not_applicable',
  };

  if (user.role === 'student') {
    const access = await getStudentPersonalAccess(
      db,
      { id: user.id, schoolId: user.school_id },
      school
    );
    consentStatus = access.status;
  }

  const isStaff = user.role === 'bk' || user.role === 'superadmin';
  const mfaVerified = isStaff ? (user.mfa_enabled ? Boolean(sessionObj.mfaVerified) : true) : true;

  let nextStep = 'app';
  if (isStaff) {
    if (user.mfa_enabled && !mfaVerified) {
      nextStep = 'mfa_verify';
    } else {
      nextStep = user.role === 'bk' ? 'bk_dashboard' : 'superadmin_dashboard';
    }
  } else {
    // Account approval controls login. Consent controls personal data features,
    // so an unpublished policy must never trap an active student at login.
    nextStep = 'student_home';
  }

  return {
    user: {
      id: user.id,
      schoolId: user.school_id,
      accountCode: user.account_code,
      nisn: user.nisn || null,
      loginEmail: user.login_email || null,
      displayName: user.display_name,
      role: user.role,
      gradeGroup: user.grade_group,
      mfaEnabled: Boolean(user.mfa_enabled),
    },
    mfaVerified,
    consentStatus,
    nextStep,
    school: school
      ? {
          id: school.id,
          code: school.code,
          name: school.name,
          timezone: school.timezone,
          serviceHours: school.service_hours,
          verifiedContacts: Array.isArray(school.verified_contacts) ? school.verified_contacts : [],
          guardianConsentRequired: Boolean(school.guardian_consent_required),
          personalAccessMode: school.personal_access_mode,
          activeHandlerConfigured: Boolean(school.active_handler_configured),
        }
      : null,
  };
}

export async function recoverAccountPassword(db, env, { accountCode, token, newPassword }) {
  const tokenHash = hashToken(token);
  const normalizedCode = accountCode.trim().toLowerCase();

  return db.transaction(async (trx) => {
    const tokenRow = await trx('account_tokens')
      .where({ purpose: 'recovery', token_hash: tokenHash })
      .whereNull('used_at')
      .where('expires_at', '>', trx.fn.now())
      .first();

    if (!tokenRow) {
      throw badRequest(
        'Kode akun atau token pemulihan tidak valid atau sudah kedaluwarsa.',
        null,
        'INVALID_TOKEN'
      );
    }

    const user = await trx('users')
      .where({ id: tokenRow.user_id })
      .whereRaw('LOWER(account_code) = ?', [normalizedCode])
      .first();

    if (
      !user ||
      user.status !== 'active' ||
      user.registration_status === 'pending' ||
      user.registration_status === 'rejected'
    ) {
      throw badRequest(
        'Kode akun atau token pemulihan tidak valid atau sudah kedaluwarsa.',
        null,
        'INVALID_TOKEN'
      );
    }

    const passwordHash = await hashPassword(newPassword, env.isTest);
    await trx('users').where({ id: user.id }).update({
      password_hash: passwordHash,
      password_changed_at: new Date(),
      status: 'active',
      updated_at: new Date(),
    });

    await trx('account_tokens').where({ id: tokenRow.id }).update({
      used_at: new Date(),
    });

    await revokeAllUserSessions(trx, user.id);

    await recordAuditEvent(trx, {
      schoolId: user.school_id,
      actorUserId: user.id,
      actorCode: user.account_code,
      actorRole: user.role,
      action: 'account_recovered',
      targetType: 'user',
      targetId: user.id,
      outcome: 'success',
      summary: `Kata sandi ${user.account_code} diperbarui melalui token pemulihan.`,
    });

    return { accountCode: user.account_code };
  });
}

export async function changeOwnPassword(db, env, userId, { currentPassword, newPassword }) {
  const user = await db('users').where({ id: userId, status: 'active' }).first();
  if (!user) throw unauthorized();

  const matches = await verifyPassword(user.password_hash, currentPassword);
  if (!matches) {
    throw badRequest('Kata sandi saat ini tidak cocok.', {
      currentPassword: 'Kata sandi tidak cocok.',
    });
  }

  const newHash = await hashPassword(newPassword, env.isTest);
  await db.transaction(async (trx) => {
    await trx('users').where({ id: user.id }).update({
      password_hash: newHash,
      password_changed_at: new Date(),
      updated_at: new Date(),
    });
    await revokeAllUserSessions(trx, user.id);
    await recordAuditEvent(trx, {
      schoolId: user.school_id,
      actorUserId: user.id,
      actorCode: user.account_code,
      actorRole: user.role,
      action: 'password_changed',
      targetType: 'user',
      targetId: user.id,
      outcome: 'success',
      summary: `Pengguna ${user.account_code} mengubah kata sandi sendiri.`,
    });
  });
}

export async function revokeAllUserSessions(dbOrTrx, userId, exceptSid = null) {
  const query = dbOrTrx('user_sessions').whereRaw("sess::jsonb #>> '{passport,user,id}' = ?", [
    userId,
  ]);
  if (exceptSid) {
    query.andWhereNot('sid', exceptSid);
  }
  await query.del();
}

export function generateStaffMfaSetup(user) {
  if (user.role !== 'bk' && user.role !== 'superadmin') {
    throw forbidden('MFA hanya digunakan untuk akun staf.');
  }
  const secret = authenticator.generateSecret();
  const otpauthUri = authenticator.keyuri(user.accountCode, 'TENANGIN.ID', secret);
  return { secret, otpauthUri };
}

export async function confirmStaffMfaSetup(db, env, user, pendingSecret, code) {
  if (!pendingSecret) {
    throw badRequest('Sesi pengaturan MFA belum dimulai. Muat ulang pengaturan MFA.');
  }
  const valid = authenticator.verify({ token: code, secret: pendingSecret });
  if (!valid) {
    throw badRequest('Kode TOTP tidak cocok. Pastikan waktu perangkat akurat.', {
      code: 'Kode tidak valid.',
    });
  }

  const recoveryCodes = [
    `REC-${generateOpaqueToken(6).toUpperCase()}`,
    `REC-${generateOpaqueToken(6).toUpperCase()}`,
    `REC-${generateOpaqueToken(6).toUpperCase()}`,
  ];
  const recoveryHashes = recoveryCodes.map((c) => hashToken(c));

  await db.transaction(async (trx) => {
    await trx('users')
      .where({ id: user.id })
      .update({
        mfa_enabled: true,
        mfa_secret_encrypted: encryptSensitiveText(pendingSecret, env.keyRing),
        mfa_recovery_hashes: JSON.stringify(recoveryHashes),
        updated_at: new Date(),
      });
    await recordAuditEvent(trx, {
      schoolId: user.schoolId,
      actorUserId: user.id,
      actorCode: user.accountCode,
      actorRole: user.role,
      action: 'mfa_enrolled',
      targetType: 'user',
      targetId: user.id,
      outcome: 'success',
      summary: `MFA TOTP diaktifkan untuk akun staf ${user.accountCode}.`,
    });
  });

  return { recoveryCodes };
}

export async function verifyStaffMfaCode(db, env, userId, code) {
  const user = await db('users').where({ id: userId, status: 'active' }).first();
  if (!user || !user.mfa_enabled || !user.mfa_secret_encrypted) {
    throw badRequest('MFA belum terdaftar pada akun ini.');
  }
  const secret = decryptSensitiveText(user.mfa_secret_encrypted, env.keyRing);
  const valid = authenticator.verify({ token: code, secret });
  if (!valid) {
    throw badRequest(
      'Kode autentikasi 6 digit tidak valid.',
      { code: 'Kode tidak valid.' },
      'INVALID_MFA_CODE'
    );
  }
  return true;
}

export async function verifyStaffMfaRecoveryCode(db, userId, recoveryCode) {
  return db.transaction(async (trx) => {
    const user = await trx('users').where({ id: userId, status: 'active' }).forUpdate().first();
    if (!user || !user.mfa_enabled) {
      throw badRequest('MFA belum terdaftar pada akun ini.');
    }
    const hashes = Array.isArray(user.mfa_recovery_hashes) ? user.mfa_recovery_hashes : [];
    const candidateHash = hashToken(recoveryCode.trim());
    const idx = hashes.indexOf(candidateHash);
    if (idx === -1) {
      throw badRequest(
        'Kode pemulihan MFA tidak valid.',
        { recoveryCode: 'Kode tidak valid.' },
        'INVALID_MFA_CODE'
      );
    }

    const remaining = hashes.filter((_, i) => i !== idx);
    await trx('users')
      .where({ id: user.id })
      .update({
        mfa_recovery_hashes: JSON.stringify(remaining),
        updated_at: new Date(),
      });
    return true;
  });
}
