import crypto from 'node:crypto';
import { badRequest, notFound } from '../../lib/errors.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { invalidateAllStudentWeekSnapshots } from '../dashboard/aggregate-computation.service.js';

export async function getActiveConsentPolicy(db, schoolId) {
  const policy = await db('consent_policies')
    .where({ school_id: schoolId, is_active: true })
    .orderBy('created_at', 'desc')
    .first();
  if (!policy) return null;

  return {
    id: policy.id,
    schoolId: policy.school_id,
    version: policy.version,
    title: policy.title,
    summary: policy.summary,
    fullPolicyText: policy.full_policy_text,
    dataAccessNotice: policy.data_access_notice,
    effectiveDate: policy.effective_date,
  };
}

export async function saveStudentConsentDecision(db, user, { policyVersion, decision, scope }) {
  const activePolicy = await db('consent_policies')
    .where({ school_id: user.schoolId, is_active: true })
    .first();

  if (!activePolicy) {
    throw notFound('Kebijakan persetujuan aktif belum tersedia.');
  }

  if (activePolicy.version !== policyVersion) {
    throw badRequest(
      `Versi kebijakan telah diperbarui ke v${activePolicy.version}. Mohon baca ulang versi terbaru.`,
      { policyVersion: 'Versi kebijakan tidak lagi aktif.' },
      'POLICY_VERSION_OUTDATED'
    );
  }

  const school = await db('schools')
    .select('guardian_consent_required')
    .where({ id: user.schoolId })
    .first();

  const existing = await db('consents')
    .where({ user_id: user.id, policy_id: activePolicy.id })
    .first();

  const now = new Date();
  const guardianVerified = school?.guardian_consent_required
    ? Boolean(existing?.guardian_verified)
    : true;

  await db.transaction(async (trx) => {
    if (decision === 'accepted') {
      await trx('users').where({ id: user.id }).update({ personal_access_paused_at: null });
    }
    await invalidateAllStudentWeekSnapshots(trx, user.schoolId);
    if (existing) {
      await trx('consents')
        .where({ id: existing.id })
        .update({
          status: decision,
          scope: JSON.stringify(scope || { personal_activities: true, group_aggregate: true }),
          accepted_at: decision === 'accepted' ? now : existing.accepted_at,
          withdrawn_at: null,
          updated_at: now,
        });
    } else {
      await trx('consents').insert({
        id: crypto.randomUUID(),
        school_id: user.schoolId,
        user_id: user.id,
        policy_id: activePolicy.id,
        policy_version: activePolicy.version,
        status: decision,
        scope: JSON.stringify(scope || { personal_activities: true, group_aggregate: true }),
        guardian_verified: guardianVerified,
        accepted_at: decision === 'accepted' ? now : null,
        withdrawn_at: null,
      });
    }

    await recordAuditEvent(trx, {
      schoolId: user.schoolId,
      actorUserId: user.id,
      actorCode: user.accountCode,
      actorRole: user.role,
      action: `consent_${decision}`,
      targetType: 'consent',
      targetId: activePolicy.version,
      outcome: 'success',
      summary: `Siswa ${user.accountCode} memilih ${decision} untuk kebijakan v${activePolicy.version}.`,
    });
  });

  return {
    policyVersion: activePolicy.version,
    status: decision,
    guardianConsentRequired: Boolean(school?.guardian_consent_required),
    guardianVerified,
  };
}

export async function withdrawStudentConsent(db, user) {
  const now = new Date();
  let accountApprovalMode = false;
  await db.transaction(async (trx) => {
    const school = await trx('schools').where({ id: user.schoolId }).first();
    accountApprovalMode = school?.personal_access_mode === 'account_approval';
    await trx('users').where({ id: user.id }).update({ personal_access_paused_at: now });
    await trx('consents')
      .where({ user_id: user.id, school_id: user.schoolId })
      .whereNull('withdrawn_at')
      .update({
        status: 'withdrawn',
        withdrawn_at: now,
        updated_at: now,
      });

    // Penarikan izin langsung menghentikan pengingat, mencabut push subscription, & menginvalidasi agregat terdampak (F1-AC4, L01)
    await trx('reminder_preferences')
      .where({ user_id: user.id })
      .update({ enabled: false, updated_at: now });

    await trx('push_subscriptions').where({ user_id: user.id }).del();

    await invalidateAllStudentWeekSnapshots(trx, user.schoolId);

    await recordAuditEvent(trx, {
      schoolId: user.schoolId,
      actorUserId: user.id,
      actorCode: user.accountCode,
      actorRole: user.role,
      action: accountApprovalMode ? 'personal_access_paused' : 'consent_withdrawn',
      targetType: accountApprovalMode ? 'user' : 'consent',
      targetId: user.id,
      outcome: 'success',
      summary: accountApprovalMode
        ? 'Siswa menjeda pencatatan aktivitas pribadi.'
        : `Siswa ${user.accountCode} menarik persetujuan penggunaan data pribadi.`,
    });
  });

  return {
    status: accountApprovalMode ? 'paused' : 'withdrawn',
    withdrawnAt: now.toISOString(),
  };
}

export async function resumeStudentPersonalAccess(db, user) {
  return db.transaction(async (trx) => {
    const school = await trx('schools').where({ id: user.schoolId }).first();
    if (school?.personal_access_mode !== 'account_approval') {
      throw badRequest(
        'Baca dan setujui kebijakan data yang berlaku untuk mengaktifkan fitur pribadi.'
      );
    }
    await trx('users').where({ id: user.id }).update({ personal_access_paused_at: null });
    await invalidateAllStudentWeekSnapshots(trx, user.schoolId);
    await recordAuditEvent(trx, {
      schoolId: user.schoolId,
      actorUserId: user.id,
      actorCode: user.accountCode,
      actorRole: user.role,
      action: 'personal_access_resumed',
      targetType: 'user',
      targetId: user.id,
      outcome: 'success',
      summary: 'Siswa mengaktifkan kembali pencatatan aktivitas pribadi.',
    });
    return { message: 'Pencatatan aktivitas kembali aktif.' };
  });
}
