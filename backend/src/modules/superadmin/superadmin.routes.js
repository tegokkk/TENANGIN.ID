import crypto from 'node:crypto';
import { createRegistrationReviewRouter } from './registration.routes.js';
import { hashPassword } from '../../lib/password.js';
import { createContentAdminRouter } from './content.routes.js';
import { createStudentRecordsRouter } from './student-records.routes.js';
import { createGovernanceCapacityRouter } from './governance-capacity.routes.js';
import express from 'express';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { decryptSensitiveText, encryptSensitiveText } from '../../lib/encryption.js';
import { generateOpaqueToken, hashToken } from '../../lib/idempotency.js';
import { getLastCompletedWeekStart, getLocalDateString } from '../../lib/time.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertSameSchool } from '../../policies/school-access.policy.js';
import { revokeAllUserSessions } from '../auth/auth.service.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { canTransitionHelpStatus, HELP_STATUS_LABELS } from '../help-requests/help-state.js';
import {
  computeWeeklySnapshots,
  invalidateAllStudentWeekSnapshots,
} from '../dashboard/aggregate-computation.service.js';
import {
  assignmentSchema,
  createUserSchema,
  groupFeedbackSchema,
  helpAckSchema,
  helpStatusSchema,
  idParamSchema,
  newConsentPolicySchema,
  patchAssignmentSchema,
  patchUserSchema,
  schoolSettingsSchema,
  studentChildParamSchema,
  superadminJournalPatchSchema,
} from './superadmin.schema.js';

function sanitizeUserPresentation(u) {
  return {
    id: u.id,
    schoolId: u.school_id,
    nisn: u.nisn,
    registrationStatus: u.registration_status,
    accountCode: u.account_code,
    loginEmail: u.login_email,
    displayName: u.display_name,
    role: u.role,
    status: u.status,
    gradeGroup: u.grade_group,
    mfaEnabled: Boolean(u.mfa_enabled),
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

export async function runRetentionCleanup(db, schoolId, retentionDays = 90) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 3600 * 1000);
  const logCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const summary = await db.transaction(async (trx) => {
    const personalEntries = {};
    for (const table of [
      'mood_entries',
      'screening_responses',
      'journal_entries',
      'exercise_sessions',
      'tasks',
      'schedule_blocks',
      'weekly_reflections',
    ]) {
      personalEntries[table] = await trx(table)
        .where({ school_id: schoolId })
        .where('created_at', '<', cutoff)
        .del();
    }
    if (Object.values(personalEntries).some((count) => count > 0))
      await invalidateAllStudentWeekSnapshots(trx, schoolId);
    const expiredTokens = await trx('account_tokens')
      .where({ school_id: schoolId })
      .where('expires_at', '<', trx.fn.now())
      .del();

    const closedHelp = await trx('help_requests')
      .where({ school_id: schoolId })
      .whereIn('status', ['closed', 'cancelled'])
      .where('updated_at', '<', cutoff)
      .del();

    const oldMeta = await trx('activity_metadata_events')
      .where({ school_id: schoolId })
      .where('occurred_at', '<', cutoff)
      .del();

    const oldLogs = await trx('audit_events')
      .where({ school_id: schoolId })
      .where('created_at', '<', logCutoff)
      .del();

    await recordAuditEvent(trx, {
      schoolId,
      actorCode: 'system-retention',
      actorRole: 'system',
      action: 'retention_cleanup_run',
      targetType: 'school',
      targetId: schoolId,
      outcome: 'success',
      summary: `Pembersihan retensi: token=${expiredTokens}, help=${closedHelp}, meta=${oldMeta}, audit=${oldLogs}.`,
    });

    return { expiredTokens, closedHelp, oldMeta, oldLogs, personalEntries };
  });

  return summary;
}

export function createSuperadminRouter({ db, env, csrf, authenticate, requireMfa, authorize }) {
  const router = express.Router();
  const guard = [authenticate, requireMfa, authorize(['superadmin'])];
  router.use(createRegistrationReviewRouter({ db, csrf, guard }));
  router.use(createStudentRecordsRouter({ db, env, csrf, guard }));
  router.use(createGovernanceCapacityRouter({ db, env, csrf, guard }));

  router.get(
    '/dashboard',
    ...guard,
    asyncHandler(async (req, res) => {
      const schoolId = req.currentUser.schoolId;
      const [
        userCounts,
        activityCount,
        pendingHelpCount,
        recentAudits,
        school,
        pendingRegistrations,
      ] = await Promise.all([
        db('users')
          .where({ school_id: schoolId })
          .select('role')
          .count('id as count')
          .groupBy('role'),
        db('activity_metadata_events').where({ school_id: schoolId }).count('id as count').first(),
        db('help_requests')
          .where({ school_id: schoolId })
          .whereIn('status', ['submitted', 'acknowledged', 'follow_up'])
          .count('id as count')
          .first(),
        db('audit_events').where({ school_id: schoolId }).orderBy('created_at', 'desc').limit(8),
        db('schools').where({ id: schoolId }).first(),
        db('users')
          .where({ school_id: schoolId, role: 'student', registration_status: 'pending' })
          .count('* as count')
          .first(),
      ]);

      const countsByRole = Object.fromEntries(userCounts.map((r) => [r.role, Number(r.count)]));

      return sendSuccess(res, {
        summary: {
          studentCount: countsByRole.student || 0,
          bkCount: countsByRole.bk || 0,
          superadminCount: countsByRole.superadmin || 0,
          activityEventsCount: Number(activityCount?.count || 0),
          pendingHelpCount: Number(pendingHelpCount?.count || 0),
          pendingRegistrationCount: Number(pendingRegistrations?.count || 0),
        },
        school: school
          ? {
              id: school.id,
              name: school.name,
              timezone: school.timezone,
              serviceHours: school.service_hours,
              guardianConsentRequired: Boolean(school.guardian_consent_required),
              activeHandlerConfigured: Boolean(school.active_handler_configured),
            }
          : null,
        recentAudits: recentAudits.map((a) => ({
          id: a.id,
          actorCode: a.actor_code,
          actorRole: a.actor_role,
          action: a.action,
          targetType: a.target_type,
          outcome: a.outcome,
          summary: a.summary,
          createdAt: a.created_at,
        })),
      });
    })
  );

  // === AKUN, ROLE & PENUGASAN ===
  router.get(
    '/users',
    ...guard,
    asyncHandler(async (req, res) => {
      const roleFilter = req.query.role;
      const q = String(req.query.q || '')
        .trim()
        .toLowerCase();

      const query = db('users')
        .where({ school_id: req.currentUser.schoolId })
        .orderBy('role', 'asc')
        .orderBy('account_code', 'asc');

      if (roleFilter && ['student', 'bk', 'superadmin'].includes(roleFilter)) {
        query.andWhere({ role: roleFilter });
      }
      if (q) {
        query.andWhereRaw('(LOWER(account_code) LIKE ? OR LOWER(display_name) LIKE ?)', [
          `%${q}%`,
          `%${q}%`,
        ]);
      }

      const rows = await query.limit(100);
      return sendSuccess(res, { users: rows.map(sanitizeUserPresentation) });
    })
  );

  router.post(
    '/users',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: createUserSchema }),
    asyncHandler(async (req, res) => {
      const b = req.validatedBody;
      const schoolId = req.currentUser.schoolId;
      if (b.role !== 'student' && !b.loginEmail) throw badRequest('Email login staf wajib diisi.');
      if (b.nisn && (await db('users').where({ nisn: b.nisn }).first()))
        throw conflict('NISN sudah digunakan.');
      const normalizedCode = b.accountCode.toLowerCase();

      const existing = await db('users')
        .where({ school_id: schoolId })
        .whereRaw('LOWER(account_code) = ?', [normalizedCode])
        .first();
      if (existing) {
        throw conflict('Kode akun sudah digunakan di sekolah ini.');
      }

      if (b.role === 'student') {
        const [schoolRow, countRow] = await Promise.all([
          db('schools').select('max_students').where({ id: schoolId }).first(),
          db('users').where({ school_id: schoolId, role: 'student' }).count('id as total').first(),
        ]);
        const currentStudents = Number(countRow?.total || 0);
        const maxStudents = Number(schoolRow?.max_students || 500);
        if (currentStudents >= maxStudents) {
          throw badRequest(
            `Kuota kapasitas siswa (${maxStudents}) pada sekolah ini sudah penuh.`,
            { role: 'Kuota kapasitas siswa sekolah tercapai.' },
            'SCHOOL_CAPACITY_REACHED'
          );
        }
      }

      if (b.role === 'student' && !b.nisn) throw badRequest('NISN siswa wajib diisi.');
      const passwordHash = await hashPassword(b.password, env.isTest);
      const userId = crypto.randomUUID();

      const created = await db.transaction(async (trx) => {
        const lockedSchool = await trx('schools')
          .where({ id: schoolId, is_active: true })
          .forUpdate()
          .first();
        if (!lockedSchool) throw badRequest('Ruang layanan tidak aktif.');
        if (b.role === 'student') {
          const capacity = await trx('users')
            .where({ school_id: schoolId, role: 'student' })
            .whereNotIn('status', ['inactive', 'deletion_pending'])
            .count('* as count')
            .first();
          if (Number(capacity.count) >= lockedSchool.max_students)
            throw badRequest('Kuota kapasitas siswa tercapai.', null, 'SCHOOL_CAPACITY_REACHED');
        }
        const [user] = await trx('users')
          .insert({
            id: userId,
            school_id: schoolId,
            account_code: b.accountCode,
            login_email: b.loginEmail ? b.loginEmail.toLowerCase() : null,
            display_name: b.displayName,
            role: b.role,
            status: 'active',
            nisn: b.role === 'student' ? b.nisn : null,
            password_hash: passwordHash,
            password_changed_at: new Date(),
            grade_group: b.role === 'student' ? b.gradeGroup || 'Kelas X' : null,
            mfa_enabled: false,
          })
          .returning('*');

        await recordAuditEvent(trx, {
          schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'user_created',
          targetType: 'user',
          targetId: user.id,
          outcome: 'success',
          summary: `Superadmin membuat akun ${user.account_code} (role: ${user.role}).`,
        });

        return user;
      });

      return sendSuccess(
        res,
        {
          user: sanitizeUserPresentation(created),
          note: 'Akun dibuat dan diaktifkan oleh Superadmin. Pengguna dapat masuk dengan sandi yang ditetapkan.',
        },
        201
      );
    })
  );

  router.patch(
    '/users/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: patchUserSchema }),
    asyncHandler(async (req, res) => {
      const target = await db('users').where({ id: req.validatedParams.id }).first();
      assertSameSchool(target, req.currentUser.schoolId, 'Akun tidak ditemukan.');

      const b = req.validatedBody;
      if (
        target.id === req.currentUser.id &&
        ((b.role && b.role !== 'superadmin') || b.status === 'inactive')
      ) {
        throw badRequest('Kamu tidak dapat menurunkan peran atau menonaktifkan akunmu sendiri.');
      }

      if (
        target.registration_status === 'pending' &&
        (b.status !== undefined || (b.role !== undefined && b.role !== target.role))
      )
        throw badRequest('Tinjau pendaftaran melalui aksi persetujuan Superadmin.');
      if (target.registration_status === 'rejected' && b.status === 'active')
        throw badRequest(
          'Pendaftaran yang ditolak tidak dapat diaktifkan melalui perubahan status biasa.'
        );
      if (b.status === 'active' && !target.password_hash)
        throw badRequest('Sandi akun belum tersedia. Buat akun melalui dashboard Superadmin.');
      const updateFields = { updated_at: new Date() };
      if (b.displayName !== undefined) updateFields.display_name = b.displayName;
      if (b.role !== undefined) updateFields.role = b.role;
      if (b.status !== undefined) updateFields.status = b.status;
      if (b.gradeGroup !== undefined) updateFields.grade_group = b.gradeGroup;
      if (b.loginEmail !== undefined)
        updateFields.login_email = b.loginEmail ? b.loginEmail.toLowerCase() : null;

      const updated = await db.transaction(async (trx) => {
        const [row] = await trx('users')
          .where({ id: target.id })
          .update(updateFields)
          .returning('*');
        await invalidateAllStudentWeekSnapshots(trx, req.currentUser.schoolId);
        if (b.status === 'inactive' || (b.role && b.role !== target.role)) {
          await revokeAllUserSessions(trx, target.id);
        }
        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'user_updated',
          targetType: 'user',
          targetId: target.id,
          outcome: 'success',
          summary: `Superadmin memperbarui akun ${target.account_code} (role=${row.role}, status=${row.status}).`,
        });
        return row;
      });

      return sendSuccess(res, { user: sanitizeUserPresentation(updated) });
    })
  );

  router.post(
    '/users/:id/recovery-token',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const target = await db('users').where({ id: req.validatedParams.id }).first();
      assertSameSchool(target, req.currentUser.schoolId, 'Akun tidak ditemukan.');

      if (target.status !== 'active')
        throw badRequest('Hanya akun aktif yang dapat menerima token pemulihan.');
      const rawToken = `REC-${generateOpaqueToken(12)}`;
      await db.transaction(async (trx) => {
        await trx('account_tokens').insert({
          id: crypto.randomUUID(),
          user_id: target.id,
          school_id: req.currentUser.schoolId,
          purpose: 'recovery',
          token_hash: hashToken(rawToken),
          expires_at: new Date(Date.now() + 24 * 3600 * 1000),
          issued_by_user_id: req.currentUser.id,
        });

        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'recovery_token_issued',
          targetType: 'user',
          targetId: target.id,
          outcome: 'success',
          summary: `Token pemulihan diterbitkan untuk ${target.account_code} setelah verifikasi sekolah.`,
        });
      });

      return sendSuccess(res, {
        accountCode: target.account_code,
        recoveryTokenOnce: rawToken,
        expiresInHours: 24,
      });
    })
  );

  router.get(
    '/assignments',
    ...guard,
    asyncHandler(async (req, res) => {
      const rows = await db('counselor_assignments as ca')
        .join('users as u', 'ca.counselor_user_id', 'u.id')
        .where({ 'ca.school_id': req.currentUser.schoolId })
        .select('ca.*', 'u.account_code as counselor_code', 'u.display_name as counselor_name')
        .orderBy('ca.grade_group', 'asc');

      return sendSuccess(res, {
        assignments: rows.map((r) => ({
          id: r.id,
          counselorUserId: r.counselor_user_id,
          counselorCode: r.counselor_code,
          counselorName: r.counselor_name,
          gradeGroup: r.grade_group,
          periodLabel: r.period_label,
          isActive: Boolean(r.is_active),
        })),
      });
    })
  );

  router.post(
    '/assignments',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: assignmentSchema }),
    asyncHandler(async (req, res) => {
      const b = req.validatedBody;
      const counselor = await db('users')
        .where({ id: b.counselorUserId, school_id: req.currentUser.schoolId, role: 'bk' })
        .first();
      if (!counselor) {
        throw badRequest('Akun Guru BK tidak ditemukan di sekolah ini.');
      }

      const [row] = await db('counselor_assignments')
        .insert({
          id: crypto.randomUUID(),
          school_id: req.currentUser.schoolId,
          counselor_user_id: b.counselorUserId,
          grade_group: b.gradeGroup,
          period_label: b.periodLabel,
          is_active: b.isActive,
        })
        .onConflict(['school_id', 'counselor_user_id', 'grade_group'])
        .merge({
          period_label: b.periodLabel,
          is_active: b.isActive,
          updated_at: new Date(),
        })
        .returning('*');

      await recordAuditEvent(db, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'counselor_assignment_saved',
        targetType: 'counselor_assignment',
        targetId: row.id,
        outcome: 'success',
        summary: `Penugasan BK ${counselor.account_code} untuk kelompok ${b.gradeGroup} (${b.isActive ? 'aktif' : 'nonaktif'}).`,
      });

      return sendSuccess(res, { assignment: row }, 201);
    })
  );

  router.patch(
    '/assignments/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: patchAssignmentSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('counselor_assignments')
        .where({ id: req.validatedParams.id })
        .first();
      assertSameSchool(existing, req.currentUser.schoolId, 'Penugasan tidak ditemukan.');

      const updateFields = { updated_at: new Date() };
      if (req.validatedBody.gradeGroup !== undefined)
        updateFields.grade_group = req.validatedBody.gradeGroup;
      if (req.validatedBody.periodLabel !== undefined)
        updateFields.period_label = req.validatedBody.periodLabel;
      if (req.validatedBody.isActive !== undefined)
        updateFields.is_active = req.validatedBody.isActive;

      const [updated] = await db('counselor_assignments')
        .where({ id: existing.id })
        .update(updateFields)
        .returning('*');

      await recordAuditEvent(db, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'counselor_assignment_updated',
        targetType: 'counselor_assignment',
        targetId: updated.id,
        outcome: 'success',
        summary: `Superadmin memperbarui penugasan BK (${updated.grade_group}, aktif=${updated.is_active}).`,
      });

      return sendSuccess(res, { assignment: updated });
    })
  );

  router.delete(
    '/assignments/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('counselor_assignments')
        .where({ id: req.validatedParams.id })
        .first();
      assertSameSchool(existing, req.currentUser.schoolId, 'Penugasan tidak ditemukan.');

      await db('counselor_assignments').where({ id: existing.id }).del();
      await recordAuditEvent(db, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'counselor_assignment_deleted',
        targetType: 'counselor_assignment',
        targetId: existing.id,
        outcome: 'success',
        summary: `Penugasan BK untuk kelompok ${existing.grade_group} dihapus oleh Superadmin.`,
      });

      return sendSuccess(res, { deleted: true });
    })
  );

  // === DATA PRIBADI SISWA (Akses penuh teraudit sesuai PRD Bagian 4.2 & 26) ===
  router.get(
    '/students/:id/data',
    ...guard,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const student = await db('users')
        .where({ id: req.validatedParams.id, school_id: req.currentUser.schoolId, role: 'student' })
        .first();
      if (!student) {
        throw notFound('Siswa tidak ditemukan.');
      }

      const [moods, journals, reflections, tasks, sessions, consents] = await Promise.all([
        db('mood_entries').where({ user_id: student.id }).orderBy('local_date', 'desc').limit(30),
        db('journal_entries')
          .where({ user_id: student.id })
          .orderBy('created_at', 'desc')
          .limit(30),
        db('weekly_reflections')
          .where({ user_id: student.id })
          .orderBy('week_start', 'desc')
          .limit(20),
        db('tasks').where({ user_id: student.id }).orderBy('created_at', 'desc').limit(30),
        db('exercise_sessions')
          .where({ user_id: student.id })
          .orderBy('started_at', 'desc')
          .limit(30),
        db('consents').where({ user_id: student.id }).orderBy('created_at', 'desc'),
      ]);

      await recordAuditEvent(db, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'superadmin_read_student_data',
        targetType: 'student_data',
        targetId: student.id,
        outcome: 'success',
        summary: `Superadmin ${req.currentUser.accountCode} membaca data pribadi siswa ${student.account_code}.`,
      });

      return sendSuccess(res, {
        student: sanitizeUserPresentation(student),
        auditNotice: 'Akses pembacaan ini otomatis dicatat ke dalam log audit sistem.',
        consents,
        moods,
        journals: journals.map((j) => ({
          id: j.id,
          localDate: j.local_date,
          situation: decryptSensitiveText(j.situation_encrypted, env.keyRing),
          thoughts: decryptSensitiveText(j.thoughts_encrypted, env.keyRing),
          feelings: decryptSensitiveText(j.feelings_encrypted, env.keyRing),
          emotionTags: j.emotion_tags,
          alternative: j.alternative_encrypted
            ? decryptSensitiveText(j.alternative_encrypted, env.keyRing)
            : '',
          version: j.version,
          createdAt: j.created_at,
          updatedAt: j.updated_at,
        })),
        reflections: reflections.map((r) => ({
          id: r.id,
          weekStart: r.week_start,
          weekEnd: r.week_end,
          helpful: decryptSensitiveText(r.helpful_encrypted, env.keyRing),
          obstacle: decryptSensitiveText(r.obstacle_encrypted, env.keyRing),
          plan: decryptSensitiveText(r.plan_encrypted, env.keyRing),
          strategyTags: r.strategy_tags,
          version: r.version,
        })),
        tasks,
        sessions,
      });
    })
  );

  router.patch(
    '/students/:id/journals/:entryId',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: studentChildParamSchema, body: superadminJournalPatchSchema }),
    asyncHandler(async (req, res) => {
      const entry = await db('journal_entries')
        .where({
          id: req.validatedParams.entryId,
          user_id: req.validatedParams.id,
          school_id: req.currentUser.schoolId,
        })
        .first();
      if (!entry) throw notFound('Entri jurnal tidak ditemukan.');

      const b = req.validatedBody;
      const [updated] = await db.transaction(async (trx) => {
        const rows = await trx('journal_entries')
          .where({ id: entry.id, version: b.version })
          .update({
            situation_encrypted: encryptSensitiveText(b.situation, env.keyRing),
            thoughts_encrypted: encryptSensitiveText(b.thoughts, env.keyRing),
            feelings_encrypted: encryptSensitiveText(b.feelings, env.keyRing),
            emotion_tags: JSON.stringify(b.emotionTags),
            alternative_encrypted: b.alternative
              ? encryptSensitiveText(b.alternative, env.keyRing)
              : null,
            version: entry.version + 1,
            updated_at: new Date(),
          })
          .returning('*');

        if (!rows.length) throw conflict('Jurnal sudah berubah. Muat ulang sebelum menyimpan.');
        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'superadmin_update_student_journal',
          targetType: 'journal_entry',
          targetId: entry.id,
          outcome: 'success',
          summary: `Superadmin memperbarui entri jurnal ${entry.id}. Alasan: ${b.reason}`,
        });

        return rows;
      });

      return sendSuccess(res, { id: updated.id, version: updated.version });
    })
  );

  router.delete(
    '/students/:id/journals/:entryId',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: studentChildParamSchema }),
    asyncHandler(async (req, res) => {
      const entry = await db('journal_entries')
        .where({
          id: req.validatedParams.entryId,
          user_id: req.validatedParams.id,
          school_id: req.currentUser.schoolId,
        })
        .first();
      if (!entry) throw notFound('Entri jurnal tidak ditemukan.');

      await db.transaction(async (trx) => {
        await trx('journal_entries').where({ id: entry.id }).del();
        await invalidateAllStudentWeekSnapshots(trx, req.currentUser.schoolId);
        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'superadmin_delete_student_journal',
          targetType: 'journal_entry',
          targetId: entry.id,
          outcome: 'success',
          summary: `Superadmin menghapus entri jurnal siswa (${entry.id}).`,
        });
      });

      return sendSuccess(res, { deleted: true });
    })
  );

  router.delete(
    '/students/:id/reflections/:entryId',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: studentChildParamSchema }),
    asyncHandler(async (req, res) => {
      const entry = await db('weekly_reflections')
        .where({
          id: req.validatedParams.entryId,
          user_id: req.validatedParams.id,
          school_id: req.currentUser.schoolId,
        })
        .first();
      if (!entry) throw notFound('Refleksi tidak ditemukan.');

      await db.transaction(async (trx) => {
        await trx('weekly_reflections').where({ id: entry.id }).del();
        await invalidateAllStudentWeekSnapshots(trx, req.currentUser.schoolId);
        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'superadmin_delete_student_reflection',
          targetType: 'weekly_reflection',
          targetId: entry.id,
          outcome: 'success',
          summary: `Superadmin menghapus refleksi siswa (${entry.id}).`,
        });
      });

      return sendSuccess(res, { deleted: true });
    })
  );

  router.patch(
    '/students/:id/consents/guardian',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const student = await db('users')
        .where({ id: req.validatedParams.id, school_id: req.currentUser.schoolId, role: 'student' })
        .first();
      if (!student) throw notFound('Siswa tidak ditemukan.');

      if (typeof req.body?.guardianVerified !== 'boolean')
        throw badRequest('Status verifikasi wali harus boolean.');
      const verified = req.body.guardianVerified;
      const guardianRef = req.body?.guardianReference
        ? String(req.body.guardianReference).trim().slice(0, 120)
        : null;

      await db('consents').where({ user_id: student.id }).update({
        guardian_verified: verified,
        guardian_reference: guardianRef,
        updated_at: new Date(),
      });

      await recordAuditEvent(db, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'guardian_consent_updated',
        targetType: 'user',
        targetId: student.id,
        outcome: 'success',
        summary: `Superadmin memperbarui status verifikasi wali (${verified}) untuk ${student.account_code}.`,
      });

      await invalidateAllStudentWeekSnapshots(db, req.currentUser.schoolId);
      return sendSuccess(res, { guardianVerified: verified });
    })
  );

  router.use('/content', createContentAdminRouter({ db, csrf, guard }));

  // === BANTUAN (Dikelola Superadmin) ===
  router.get(
    '/help-requests',
    ...guard,
    asyncHandler(async (req, res) => {
      const rows = await db('help_requests as h')
        .join('users as u', 'h.student_user_id', 'u.id')
        .where({ 'h.school_id': req.currentUser.schoolId })
        .select('h.*', 'u.account_code as student_code', 'u.grade_group as student_group')
        .orderBy('h.created_at', 'desc')
        .limit(50);

      const ids = rows.map((r) => r.id);
      const acks =
        ids.length > 0 ? await db('help_acknowledgements').whereIn('help_request_id', ids) : [];
      const ackMap = new Map(acks.map((a) => [a.help_request_id, a]));

      return sendSuccess(res, {
        requests: rows.map((r) => {
          const ack = ackMap.get(r.id);
          return {
            id: r.id,
            studentCode: r.student_code,
            studentGroup: r.student_group,
            requestedCounselor: r.requested_counselor,
            preferredTime: r.preferred_time,
            topicMessage: r.topic_message_encrypted
              ? decryptSensitiveText(r.topic_message_encrypted, env.keyRing)
              : '',
            contact: r.contact_encrypted
              ? decryptSensitiveText(r.contact_encrypted, env.keyRing)
              : '',
            status: r.status,
            statusLabel: HELP_STATUS_LABELS[r.status] || r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            acknowledgement: ack
              ? {
                  message: ack.message,
                  locationInfo: ack.location_info,
                  scheduleInfo: ack.schedule_info,
                  version: ack.version,
                  revisionHistory: ack.revision_history,
                  updatedAt: ack.updated_at,
                }
              : null,
          };
        }),
      });
    })
  );

  router.patch(
    '/help-requests/:id/status',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: helpStatusSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('help_requests').where({ id: req.validatedParams.id }).first();
      assertSameSchool(existing, req.currentUser.schoolId, 'Permintaan bantuan tidak ditemukan.');

      const nextStatus = req.validatedBody.status;
      if (!canTransitionHelpStatus('superadmin', existing.status, nextStatus)) {
        throw badRequest(
          `Status bantuan tidak dapat diubah dari "${existing.status}" menjadi "${nextStatus}".`
        );
      }

      const updated = await db.transaction(async (trx) => {
        const [row] = await trx('help_requests')
          .where({ id: existing.id })
          .update({
            status: nextStatus,
            handler_user_id: req.currentUser.id,
            updated_at: new Date(),
          })
          .returning('*');

        await trx('help_status_events').insert({
          id: crypto.randomUUID(),
          help_request_id: existing.id,
          actor_user_id: req.currentUser.id,
          actor_role: 'superadmin',
          from_status: existing.status,
          to_status: nextStatus,
          note:
            req.validatedBody.note ||
            `Status diperbarui menjadi ${HELP_STATUS_LABELS[nextStatus]}.`,
        });

        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'help_status_updated',
          targetType: 'help_request',
          targetId: existing.id,
          outcome: 'success',
          summary: `Status bantuan diubah dari ${existing.status} ke ${nextStatus}.`,
        });

        return row;
      });

      return sendSuccess(res, { id: updated.id, status: updated.status });
    })
  );

  router.put(
    '/help-requests/:id/acknowledgement',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: helpAckSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('help_requests').where({ id: req.validatedParams.id }).first();
      assertSameSchool(existing, req.currentUser.schoolId, 'Permintaan bantuan tidak ditemukan.');

      const b = req.validatedBody;
      const savedAck = await db.transaction(async (trx) => {
        const currentAck = await trx('help_acknowledgements')
          .where({ help_request_id: existing.id })
          .first();

        let ackRow;
        if (currentAck) {
          const history = Array.isArray(currentAck.revision_history)
            ? currentAck.revision_history
            : [];
          history.push({
            version: currentAck.version,
            message: currentAck.message,
            updatedAt: currentAck.updated_at,
          });
          [ackRow] = await trx('help_acknowledgements')
            .where({ id: currentAck.id })
            .update({
              author_user_id: req.currentUser.id,
              message: b.message,
              location_info: b.locationInfo || null,
              schedule_info: b.scheduleInfo || null,
              version: currentAck.version + 1,
              revision_history: JSON.stringify(history),
              updated_at: new Date(),
            })
            .returning('*');
        } else {
          [ackRow] = await trx('help_acknowledgements')
            .insert({
              id: crypto.randomUUID(),
              help_request_id: existing.id,
              author_user_id: req.currentUser.id,
              message: b.message,
              location_info: b.locationInfo || null,
              schedule_info: b.scheduleInfo || null,
              version: 1,
              revision_history: JSON.stringify([]),
            })
            .returning('*');
        }

        if (existing.status === 'submitted') {
          await trx('help_requests').where({ id: existing.id }).update({
            status: 'acknowledged',
            handler_user_id: req.currentUser.id,
            updated_at: new Date(),
          });
          await trx('help_status_events').insert({
            id: crypto.randomUUID(),
            help_request_id: existing.id,
            actor_user_id: req.currentUser.id,
            actor_role: 'superadmin',
            from_status: 'submitted',
            to_status: 'acknowledged',
            note: 'Respons administratif diberikan oleh pengelola.',
          });
        }

        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'help_acknowledgement_saved',
          targetType: 'help_request',
          targetId: existing.id,
          outcome: 'success',
          summary: `Superadmin menyimpan respons administratif v${ackRow.version}.`,
        });

        return ackRow;
      });

      return sendSuccess(res, { acknowledgement: savedAck });
    })
  );

  // === PESAN KELOMPOK SATU ARAH ===
  router.get(
    '/feedback',
    ...guard,
    asyncHandler(async (req, res) => {
      const rows = await db('group_feedback')
        .where({ school_id: req.currentUser.schoolId })
        .orderBy('created_at', 'desc')
        .limit(30);
      return sendSuccess(res, { messages: rows });
    })
  );

  router.post(
    '/feedback',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: groupFeedbackSchema }),
    asyncHandler(async (req, res) => {
      const b = req.validatedBody;
      const [row] = await db('group_feedback')
        .insert({
          id: crypto.randomUUID(),
          school_id: req.currentUser.schoolId,
          author_user_id: req.currentUser.id,
          target_group: b.targetGroup,
          period_label: b.periodLabel,
          title: b.title,
          body: b.body,
          status: b.status,
          published_at: b.status === 'published' ? new Date() : null,
        })
        .returning('*');

      await recordAuditEvent(db, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'group_feedback_created',
        targetType: 'group_feedback',
        targetId: row.id,
        outcome: 'success',
        summary: `Pesan kelompok "${row.title}" untuk ${row.target_group} (${row.status}).`,
      });

      return sendSuccess(res, { message: row }, 201);
    })
  );

  router.delete(
    '/feedback/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('group_feedback').where({ id: req.validatedParams.id }).first();
      assertSameSchool(existing, req.currentUser.schoolId, 'Pesan kelompok tidak ditemukan.');
      await db('group_feedback').where({ id: existing.id }).del();
      return sendSuccess(res, { deleted: true });
    })
  );

  // === PENGATURAN SEKOLAH, KEBIJAKAN PERSETUJUAN, AUDIT & JOBS ===
  router.get(
    '/settings',
    ...guard,
    asyncHandler(async (req, res) => {
      const [school, policies] = await Promise.all([
        db('schools').where({ id: req.currentUser.schoolId }).first(),
        db('consent_policies')
          .where({ school_id: req.currentUser.schoolId })
          .orderBy('created_at', 'desc'),
      ]);
      return sendSuccess(res, { school, consentPolicies: policies });
    })
  );

  router.patch(
    '/settings',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: schoolSettingsSchema }),
    asyncHandler(async (req, res) => {
      const b = req.validatedBody;
      const [updated] = await db('schools')
        .where({ id: req.currentUser.schoolId })
        .update({
          name: b.name,
          timezone: b.timezone,
          service_hours: b.serviceHours,
          verified_contacts: JSON.stringify(b.verifiedContacts),
          guardian_consent_required:
            b.personalAccessMode === 'account_approval' ? false : b.guardianConsentRequired,
          personal_access_mode: b.personalAccessMode,
          active_handler_configured: b.activeHandlerConfigured,
          updated_at: new Date(),
        })
        .returning('*');

      await recordAuditEvent(db, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'school_settings_updated',
        targetType: 'school',
        targetId: updated.id,
        outcome: 'success',
        summary: `Pengaturan sekolah diperbarui (zona=${updated.timezone}, akses=${updated.personal_access_mode}, wali=${updated.guardian_consent_required}).`,
      });

      await invalidateAllStudentWeekSnapshots(db, req.currentUser.schoolId);
      return sendSuccess(res, { school: updated });
    })
  );

  router.post(
    '/settings/consent-policies',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: newConsentPolicySchema }),
    asyncHandler(async (req, res) => {
      const b = req.validatedBody;
      const school = await db('schools').where({ id: req.currentUser.schoolId }).first();
      const effectiveDate = getLocalDateString(new Date(), school?.timezone || 'Asia/Jakarta');

      const created = await db.transaction(async (trx) => {
        await invalidateAllStudentWeekSnapshots(trx, req.currentUser.schoolId);
        await trx('consent_policies')
          .where({ school_id: req.currentUser.schoolId, is_active: true })
          .update({ is_active: false });

        const [policy] = await trx('consent_policies')
          .insert({
            id: crypto.randomUUID(),
            school_id: req.currentUser.schoolId,
            version: b.version,
            title: b.title,
            summary: b.summary,
            full_policy_text: b.fullPolicyText,
            data_access_notice: b.dataAccessNotice,
            effective_date: effectiveDate,
            is_active: true,
            created_by_user_id: req.currentUser.id,
          })
          .returning('*');

        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'consent_policy_activated',
          targetType: 'consent_policy',
          targetId: policy.id,
          outcome: 'success',
          summary: `Kebijakan persetujuan v${policy.version} diaktifkan (persetujuan ulang berlaku).`,
        });

        return policy;
      });

      return sendSuccess(res, { policy: created }, 201);
    })
  );

  router.get(
    '/audit',
    ...guard,
    asyncHandler(async (req, res) => {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const rows = await db('audit_events')
        .where({ school_id: req.currentUser.schoolId })
        .orderBy('created_at', 'desc')
        .limit(limit);
      return sendSuccess(res, { events: rows });
    })
  );

  router.get(
    '/deletion-requests',
    ...guard,
    asyncHandler(async (req, res) => {
      const rows = await db('deletion_requests')
        .where({ school_id: req.currentUser.schoolId })
        .orderBy('requested_at', 'desc')
        .limit(50);
      return sendSuccess(res, { requests: rows });
    })
  );

  router.post(
    '/jobs/aggregate-weekly',
    ...guard,
    csrf.csrfProtection,
    asyncHandler(async (req, res) => {
      const school = await db('schools').where({ id: req.currentUser.schoolId }).first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const targetWeek = req.body?.weekStart || getLastCompletedWeekStart(new Date(), tz);
      const snapshots = await computeWeeklySnapshots(db, school.id, targetWeek, tz);

      await recordAuditEvent(db, {
        schoolId: school.id,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'weekly_snapshot_recomputed',
        targetType: 'aggregate_snapshot',
        targetId: targetWeek,
        outcome: 'success',
        summary: `Snapshot mingguan (${targetWeek}) dihitung ulang (${snapshots.length} metrik).`,
      });

      return sendSuccess(res, { weekStart: targetWeek, metricsComputed: snapshots.length });
    })
  );

  router.post(
    '/jobs/cleanup-retention',
    ...guard,
    csrf.csrfProtection,
    asyncHandler(async (req, res) => {
      const summary = await runRetentionCleanup(db, req.currentUser.schoolId, 90);
      return sendSuccess(res, { summary });
    })
  );

  return router;
}
