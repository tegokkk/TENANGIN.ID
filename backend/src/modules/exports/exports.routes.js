import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, unauthorized } from '../../lib/errors.js';
import { verifyPassword } from '../../lib/password.js';
import { decryptSensitiveText } from '../../lib/encryption.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { noStoreMiddleware } from '../../middleware/no-store.middleware.js';
import {
  extractAssignedGroups,
  getActiveCounselorAssignments,
} from '../../policies/bk-assignment.policy.js';
import { MIN_K_THRESHOLD } from '../../policies/aggregate-privacy.policy.js';
import { getSuppressedSnapshotsForSchool } from '../dashboard/aggregate-computation.service.js';
import { recordAuditEvent } from '../audit/audit.service.js';

const exportRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Masukkan kata sandi untuk autentikasi ulang ekspor.').max(200),
  format: z.enum(['json', 'csv']).default('json'),
});

const superadminExportSchema = exportRequestSchema.extend({
  includeAuditSummary: z.boolean().optional().default(true),
});

export function escapeCsvCell(raw) {
  let str = raw === null || raw === undefined ? '' : String(raw);
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function buildCsvDocument(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

async function assertReauthenticated(db, userId, currentPassword) {
  const user = await db('users').where({ id: userId, status: 'active' }).first();
  if (!user || !user.password_hash) {
    throw unauthorized();
  }
  const valid = await verifyPassword(user.password_hash, currentPassword);
  if (!valid) {
    throw badRequest(
      'Kata sandi konfirmasi tidak cocok.',
      { currentPassword: 'Kata sandi konfirmasi salah.' },
      'INVALID_PASSWORD'
    );
  }
  return user;
}

function sendExportPayload(res, { format, filenameBase, jsonPayload, csvContent }) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.${format}"`);
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(csvContent);
  }
  return sendSuccess(res, jsonPayload);
}

export function createExportsRouter({ db, env, csrf, authenticate, requireMfa, authorize }) {
  const router = express.Router();
  router.use(noStoreMiddleware);

  // L04-A: Ekspor data pribadi milik siswa sendiri dengan autentikasi ulang
  router.post(
    '/personal',
    authenticate,
    authorize(['student']),
    csrf.csrfProtection,
    validateRequest({ body: exportRequestSchema }),
    asyncHandler(async (req, res) => {
      const user = await assertReauthenticated(db, req.currentUser.id, req.validatedBody.currentPassword);
      const school = await db('schools').where({ id: user.school_id }).first();
      const format = req.validatedBody.format;

      const [
        consents,
        moods,
        journals,
        reflections,
        sessions,
        tasks,
        blocks,
        reminders,
        helpRequests,
      ] = await Promise.all([
        db('consents').where({ user_id: user.id }).orderBy('created_at', 'desc'),
        db('mood_entries').where({ user_id: user.id }).orderBy('local_date', 'desc'),
        db('journal_entries').where({ user_id: user.id }).orderBy('updated_at', 'desc'),
        db('weekly_reflections').where({ user_id: user.id }).orderBy('week_start', 'desc'),
        db('exercise_sessions as s')
          .join('exercise_contents as e', 's.exercise_id', 'e.id')
          .where({ 's.user_id': user.id })
          .select('s.*', 'e.title as exercise_title', 'e.category as exercise_category')
          .orderBy('s.started_at', 'desc'),
        db('tasks').where({ user_id: user.id }).orderBy('created_at', 'desc'),
        db('schedule_blocks').where({ user_id: user.id }).orderBy('local_date', 'desc'),
        db('reminder_preferences').where({ user_id: user.id }).first(),
        db('help_requests').where({ student_user_id: user.id }).orderBy('created_at', 'desc'),
      ]);

      const exportedData = {
        exportedAt: new Date().toISOString(),
        account: {
          accountCode: user.account_code,
          displayName: user.display_name,
          role: user.role,
          gradeGroup: user.grade_group,
          schoolName: school?.name || null,
          timezone: school?.timezone || 'Asia/Jakarta',
        },
        consents: consents.map((c) => ({
          policyVersion: c.policy_version,
          status: c.status,
          acceptedAt: c.accepted_at,
          withdrawnAt: c.withdrawn_at,
        })),
        moods: moods.map((m) => ({
          localDate: m.local_date,
          moodCode: m.mood_code,
          moodLabel: m.mood_label,
          moodScore: m.mood_score,
          pressureLevel: m.pressure_level,
          skipped: Boolean(m.skipped),
        })),
        journals: journals.map((j) => ({
          localDate: j.local_date,
          version: j.version,
          situation: decryptSensitiveText(j.situation_encrypted, env.keyRing),
          thoughts: decryptSensitiveText(j.thoughts_encrypted, env.keyRing),
          feelings: decryptSensitiveText(j.feelings_encrypted, env.keyRing),
          emotionTags: j.emotion_tags || [],
          alternative: j.alternative_encrypted
            ? decryptSensitiveText(j.alternative_encrypted, env.keyRing)
            : '',
          updatedAt: j.updated_at,
        })),
        reflections: reflections.map((r) => ({
          weekStart: r.week_start,
          weekEnd: r.week_end,
          helpful: decryptSensitiveText(r.helpful_encrypted, env.keyRing),
          obstacle: decryptSensitiveText(r.obstacle_encrypted, env.keyRing),
          plan: decryptSensitiveText(r.plan_encrypted, env.keyRing),
          strategyTags: r.strategy_tags || [],
          updatedAt: r.updated_at,
        })),
        exerciseSessions: sessions.map((s) => ({
          localDate: s.local_date,
          exerciseTitle: s.exercise_title,
          exerciseCategory: s.exercise_category,
          status: s.status,
          activeSeconds: s.active_seconds,
          startedAt: s.started_at,
        })),
        tasks: tasks.map((t) => ({
          title: t.title,
          targetDate: t.target_date,
          estimatedMinutes: t.estimated_minutes,
          isImportant: Boolean(t.is_important),
          isUrgent: Boolean(t.is_urgent),
          status: t.status,
        })),
        scheduleBlocks: blocks.map((b) => ({
          localDate: b.local_date,
          blockType: b.block_type,
          title: b.title,
          startTime: b.start_time,
          endTime: b.end_time,
        })),
        reminderPreference: reminders
          ? {
              enabled: Boolean(reminders.enabled),
              reminderType: reminders.reminder_type,
              preferredTime: reminders.preferred_time,
              timezone: reminders.timezone,
              quietHoursStart: reminders.quiet_hours_start,
              quietHoursEnd: reminders.quiet_hours_end,
            }
          : null,
        helpRequests: helpRequests.map((h) => ({
          status: h.status,
          requestedCounselor: h.requested_counselor,
          preferredTime: h.preferred_time,
          topicMessage: h.topic_message_encrypted
            ? decryptSensitiveText(h.topic_message_encrypted, env.keyRing)
            : '',
          contact: h.contact_encrypted ? decryptSensitiveText(h.contact_encrypted, env.keyRing) : '',
          createdAt: h.created_at,
        })),
      };

      await recordAuditEvent(db, {
        schoolId: user.school_id,
        actorUserId: user.id,
        actorCode: user.account_code,
        actorRole: 'student',
        action: 'student_personal_export',
        targetType: 'export',
        targetId: format,
        outcome: 'success',
        summary: `Siswa ${user.account_code} mengunduh ekspor data pribadi (${format}).`,
      });

      const csvRows = [
        ...exportedData.moods.map((m) => [
          'mood',
          m.localDate,
          m.moodLabel,
          `Skor ${m.moodScore}, Tekanan ${m.pressureLevel ?? '-'}, Lewati=${m.skipped}`,
        ]),
        ...exportedData.journals.map((j) => [
          'journal',
          j.localDate,
          j.situation,
          `Pikiran: ${j.thoughts} | Perasaan: ${j.feelings} | Alternatif: ${j.alternative}`,
        ]),
        ...exportedData.reflections.map((r) => [
          'reflection',
          `${r.weekStart}..${r.weekEnd}`,
          'Refleksi Mingguan',
          `Membantu: ${r.helpful} | Hambatan: ${r.obstacle} | Rencana: ${r.plan}`,
        ]),
        ...exportedData.exerciseSessions.map((s) => [
          'exercise_session',
          s.localDate,
          s.exerciseTitle,
          `Status: ${s.status}, Durasi: ${s.activeSeconds}s`,
        ]),
        ...exportedData.tasks.map((t) => [
          'task',
          t.targetDate || '-',
          t.title,
          `Status: ${t.status}`,
        ]),
        ...exportedData.helpRequests.map((h) => [
          'help_request',
          h.createdAt,
          h.status,
          h.topicMessage || '(tanpa pesan)',
        ]),
      ];

      return sendExportPayload(res, {
        format,
        filenameBase: `tenangin-ekspor-pribadi-${user.account_code}`,
        jsonPayload: exportedData,
        csvContent: buildCsvDocument(['kategori', 'tanggal_atau_periode', 'judul_atau_label', 'rincian'], csvRows),
      });
    })
  );

  // L04-B: Ekspor agregat tersupresi (k >= 5) untuk Guru BK sesuai penugasan
  router.post(
    '/bk-aggregate',
    authenticate,
    requireMfa,
    authorize(['bk']),
    csrf.csrfProtection,
    validateRequest({ body: exportRequestSchema }),
    asyncHandler(async (req, res) => {
      const user = await assertReauthenticated(db, req.currentUser.id, req.validatedBody.currentPassword);
      const format = req.validatedBody.format;
      const assignments = await getActiveCounselorAssignments(db, user.id, user.school_id);
      const assignedGroups = extractAssignedGroups(assignments);
      const school = await db('schools').where({ id: user.school_id }).first();

      const { weekStart, weekEnd, snapshots } = await getSuppressedSnapshotsForSchool(db, {
        schoolId: user.school_id,
        timezone: school?.timezone || 'Asia/Jakarta',
        assignedGroups,
      });

      await recordAuditEvent(db, {
        schoolId: user.school_id,
        actorUserId: user.id,
        actorCode: user.account_code,
        actorRole: 'bk',
        action: 'bk_aggregate_export',
        targetType: 'export',
        targetId: format,
        outcome: 'success',
        summary: `Guru BK ${user.account_code} mengunduh agregat tersupresi (${format}, minggu=${weekStart || '-'}).`,
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        scope: 'bk_assigned_aggregates_read_only',
        schoolName: school?.name || null,
        counselorCode: user.account_code,
        assignedGroups,
        suppressionThreshold: MIN_K_THRESHOLD,
        weekStart,
        weekEnd,
        snapshots,
      };

      const csvRows = snapshots.map((s) => [
        s.scopeGroup,
        s.weekStart,
        s.weekEnd,
        s.metricKey,
        s.metricLabel,
        s.isSuppressed ? 'TERSUPRESI (k < 5)' : 'TAMPIL',
        s.isSuppressed ? '' : s.value ?? '',
        s.isSuppressed ? '' : s.contributorCount ?? '',
        s.suppressionReason || '',
      ]);

      return sendExportPayload(res, {
        format,
        filenameBase: `tenangin-agregat-bk-${user.account_code}`,
        jsonPayload: payload,
        csvContent: buildCsvDocument(
          [
            'kelompok',
            'minggu_mulai',
            'minggu_selesai',
            'kunci_metrik',
            'nama_metrik',
            'status_privasi',
            'nilai_agregat',
            'jumlah_kontributor',
            'keterangan_supresi',
          ],
          csvRows
        ),
      });
    })
  );

  // L04-C: Ekspor agregat & ringkasan audit untuk Superadmin dengan autentikasi ulang (tanpa password/token/kunci)
  router.post(
    '/superadmin-aggregate',
    authenticate,
    requireMfa,
    authorize(['superadmin']),
    csrf.csrfProtection,
    validateRequest({ body: superadminExportSchema }),
    asyncHandler(async (req, res) => {
      const user = await assertReauthenticated(db, req.currentUser.id, req.validatedBody.currentPassword);
      const { format, includeAuditSummary } = req.validatedBody;
      const school = await db('schools').where({ id: user.school_id }).first();

      const { weekStart, weekEnd, snapshots } = await getSuppressedSnapshotsForSchool(db, {
        schoolId: user.school_id,
        timezone: school?.timezone || 'Asia/Jakarta',
        assignedGroups: null,
      });

      const recentAudits = includeAuditSummary
        ? await db('audit_events')
            .where({ school_id: user.school_id })
            .select('created_at', 'actor_code', 'actor_role', 'action', 'target_type', 'outcome', 'summary')
            .orderBy('created_at', 'desc')
            .limit(100)
        : [];

      await recordAuditEvent(db, {
        schoolId: user.school_id,
        actorUserId: user.id,
        actorCode: user.account_code,
        actorRole: 'superadmin',
        action: 'superadmin_aggregate_export',
        targetType: 'export',
        targetId: format,
        outcome: 'success',
        summary: `Superadmin ${user.account_code} mengunduh ekspor agregat sistem (${format}).`,
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        scope: 'superadmin_school_aggregates',
        school: school
          ? { id: school.id, code: school.code, name: school.name, timezone: school.timezone }
          : null,
        suppressionThreshold: MIN_K_THRESHOLD,
        weekStart,
        weekEnd,
        snapshots,
        auditSummary: recentAudits,
      };

      const csvRows = [
        ...snapshots.map((s) => [
          'snapshot',
          s.scopeGroup,
          `${s.weekStart}..${s.weekEnd}`,
          s.metricLabel,
          s.isSuppressed ? 'TERSUPRESI' : String(s.value ?? ''),
          s.isSuppressed ? 'k < 5' : `${s.contributorCount} siswa`,
        ]),
        ...recentAudits.map((a) => [
          'audit',
          a.actor_code || a.actor_role,
          a.created_at,
          a.action,
          a.outcome,
          a.summary,
        ]),
      ];

      return sendExportPayload(res, {
        format,
        filenameBase: `tenangin-ekspor-superadmin-${school?.code || 'sekolah'}`,
        jsonPayload: payload,
        csvContent: buildCsvDocument(
          ['tipe', 'subjek', 'waktu_atau_periode', 'label_atau_aksi', 'nilai_atau_hasil', 'keterangan'],
          csvRows
        ),
      });
    })
  );

  return router;
}
