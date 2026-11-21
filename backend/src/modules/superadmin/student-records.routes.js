import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import {
  encryptSensitiveText,
  decryptSensitiveText,
  decryptSensitiveJson,
} from '../../lib/encryption.js';
import { getLocalDateString, getWeekBounds } from '../../lib/time.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { journalPayloadSchema } from '../journals/journals.routes.js';
import { reflectionBodySchema } from '../reflections/reflections.routes.js';
import { taskSchema, scheduleBlockSchema } from '../planner/planner.routes.js';
import { createMoodSchema, MOOD_OPTIONS } from '../mood/mood.routes.js';
import { reminderSchema } from '../reminders/reminders.routes.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { invalidateAllStudentWeekSnapshots } from '../dashboard/aggregate-computation.service.js';
import { getUserSessionState } from '../auth/auth.service.js';

const taskBody = taskSchema.extend({
  status: z.enum(['pending', 'completed']).default('pending'),
  steps: z
    .array(
      z.object({ title: z.string().trim().min(1).max(160), isDone: z.boolean().default(false) })
    )
    .max(50)
    .default([]),
});
const domains = {
  journals: {
    table: 'journal_entries',
    schema: journalPayloadSchema,
    versioned: true,
    values: (b, env) => ({
      situation_encrypted: encryptSensitiveText(b.situation, env.keyRing),
      thoughts_encrypted: encryptSensitiveText(b.thoughts, env.keyRing),
      feelings_encrypted: encryptSensitiveText(b.feelings, env.keyRing),
      alternative_encrypted: b.alternative
        ? encryptSensitiveText(b.alternative, env.keyRing)
        : null,
      emotion_tags: JSON.stringify(b.emotionTags),
    }),
    present: (r, env) => ({
      situation: decryptSensitiveText(r.situation_encrypted, env.keyRing),
      thoughts: decryptSensitiveText(r.thoughts_encrypted, env.keyRing),
      feelings: decryptSensitiveText(r.feelings_encrypted, env.keyRing),
      alternative: r.alternative_encrypted
        ? decryptSensitiveText(r.alternative_encrypted, env.keyRing)
        : '',
      emotionTags: r.emotion_tags,
    }),
  },
  reflections: {
    table: 'weekly_reflections',
    schema: reflectionBodySchema,
    versioned: true,
    values: (b, env, timezone) => {
      const bounds = getWeekBounds(b.weekStart || new Date(), timezone);
      return {
        week_start: bounds.weekStart,
        week_end: bounds.weekEnd,
        school_timezone: timezone,
        helpful_encrypted: encryptSensitiveText(b.helpful, env.keyRing),
        obstacle_encrypted: encryptSensitiveText(b.obstacle, env.keyRing),
        plan_encrypted: encryptSensitiveText(b.plan, env.keyRing),
        strategy_tags: JSON.stringify(b.strategyTags),
      };
    },
    present: (r, env) => ({
      weekStart: r.week_start,
      helpful: decryptSensitiveText(r.helpful_encrypted, env.keyRing),
      obstacle: decryptSensitiveText(r.obstacle_encrypted, env.keyRing),
      plan: decryptSensitiveText(r.plan_encrypted, env.keyRing),
      strategyTags: r.strategy_tags,
    }),
  },
  moods: {
    table: 'mood_entries',
    schema: createMoodSchema,
    values: (b, _env, timezone) => {
      if (!b.skipped && !b.moodCode) throw badRequest('Pilih suasana hati atau lewati.');
      const mood = MOOD_OPTIONS[b.moodCode] || { label: 'Dilewati', score: 3 };
      return {
        mood_code: b.moodCode || 'neutral',
        mood_label: mood.label,
        mood_score: mood.score,
        skipped: b.skipped,
        pressure_level: b.pressureLevel ?? null,
        school_timezone: timezone,
      };
    },
    present: (r) => ({
      moodCode: r.mood_code,
      pressureLevel: r.pressure_level,
      skipped: r.skipped,
    }),
  },
  tasks: {
    table: 'tasks',
    schema: taskBody,
    values: (b) => ({
      title: b.title,
      notes: b.notes || null,
      target_date: b.targetDate || null,
      estimated_minutes: b.estimatedMinutes ?? null,
      is_important: b.isImportant,
      is_urgent: b.isUrgent,
      status: b.status,
      completed_at: b.status === 'completed' ? new Date() : null,
    }),
    present: (r) => ({
      title: r.title,
      notes: r.notes || '',
      targetDate: r.target_date,
      estimatedMinutes: r.estimated_minutes,
      isImportant: r.is_important,
      isUrgent: r.is_urgent,
      status: r.status,
    }),
  },
  'schedule-blocks': {
    table: 'schedule_blocks',
    schema: scheduleBlockSchema,
    values: (b) => ({
      block_type: b.blockType,
      title: b.title,
      start_time: b.startTime,
      end_time: b.endTime,
    }),
    present: (r) => ({
      blockType: r.block_type,
      title: r.title,
      startTime: r.start_time,
      endTime: r.end_time,
    }),
  },
  reminders: {
    table: 'reminder_preferences',
    schema: reminderSchema,
    values: (b, _env, timezone) => ({
      enabled: b.enabled,
      reminder_type: b.reminderType,
      days_of_week: JSON.stringify(b.daysOfWeek),
      preferred_time: b.preferredTime,
      timezone: b.timezone || timezone,
      quiet_hours_start: b.quietHoursStart,
      quiet_hours_end: b.quietHoursEnd,
    }),
    present: (r) => ({
      enabled: r.enabled,
      reminderType: r.reminder_type,
      daysOfWeek: r.days_of_week,
      preferredTime: r.preferred_time,
      timezone: r.timezone,
      quietHoursStart: r.quiet_hours_start,
      quietHoursEnd: r.quiet_hours_end,
    }),
  },
  sessions: {
    table: 'exercise_sessions',
    readonly: true,
    present: (r) => ({
      exerciseId: r.exercise_id,
      exerciseVersion: r.exercise_version,
      status: r.status,
      activeSeconds: r.active_seconds,
    }),
  },
  screening: {
    table: 'screening_responses',
    readonly: true,
    present: (r, env) => ({
      instrumentVersion: r.instrument_version,
      isSimulation: r.is_simulation,
      answers: decryptSensitiveJson(r.answers_encrypted, env.keyRing),
      score: r.computed_score,
      interpretation: r.interpretation_label,
    }),
  },
};
const params = z.object({
  id: z.string().uuid(),
  domain: z.enum(Object.keys(domains)),
  entryId: z.string().uuid().optional(),
});
const reasonSchema = z.object({ reason: z.string().trim().min(3).max(200) });

export function createStudentRecordsRouter({ db, env, csrf, guard }) {
  const router = express.Router();
  router.use(...guard);
  const scope = asyncHandler(async (req, _res, next) => {
    req.recordDomain = domains[req.validatedParams.domain];
    req.recordStudent = await db('users')
      .where({ id: req.validatedParams.id, school_id: req.currentUser.schoolId, role: 'student' })
      .first();
    if (!req.recordStudent) throw notFound('Siswa tidak ditemukan.');
    next();
  });
  async function audit(trx, req, action, targetId) {
    await recordAuditEvent(trx, {
      schoolId: req.currentUser.schoolId,
      actorUserId: req.currentUser.id,
      actorCode: req.currentUser.accountCode,
      actorRole: 'superadmin',
      action: `superadmin_${action}_student_record`,
      targetType: req.validatedParams.domain,
      targetId,
      outcome: 'success',
      summary: `Operasi ${action} data siswa.${action === 'read' ? '' : ` Alasan: ${String(req.body.reason).replace(/[\r\n]/g, ' ')}`}`,
    });
  }
  router.get(
    '/students/:id/records/:domain',
    validateRequest({ params }),
    scope,
    asyncHandler(async (req, res) => {
      const page = Math.max(1, Math.min(Number(req.query.page) || 1, 10000));
      const base = db(req.recordDomain.table).where({
        user_id: req.recordStudent.id,
        school_id: req.currentUser.schoolId,
      });
      const total = Number((await base.clone().count('* as n').first()).n);
      const rows = await base
        .orderBy('created_at', 'desc')
        .limit(20)
        .offset((page - 1) * 20);
      const entries = [];
      for (const row of rows) {
        const entry = {
          id: row.id,
          version: row.version,
          localDate: row.local_date,
          updatedAt: row.updated_at,
          ...req.recordDomain.present(row, env),
        };
        if (req.validatedParams.domain === 'tasks')
          entry.steps = (
            await db('task_steps').where({ task_id: row.id }).orderBy('sort_order')
          ).map((s) => ({ title: s.title, isDone: s.is_done }));
        entries.push(entry);
      }
      await audit(db, req, 'read', req.recordStudent.id);
      return sendSuccess(res, { entries, pagination: { page, total, limit: 20 } });
    })
  );
  async function write(req, res) {
    const domain = req.recordDomain;
    if (domain.readonly)
      throw badRequest('Rekaman aktivitas asli hanya dapat dibaca atau dihapus.');
    const parsed = domain.schema
      .extend({ reason: reasonSchema.shape.reason, version: z.number().int().min(1).optional() })
      .safeParse(req.body);
    if (!parsed.success)
      throw badRequest(
        'Periksa isian data siswa.',
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
      );
    const body = parsed.data;
    const school = await db('schools').where({ id: req.currentUser.schoolId }).first();
    const row = await db.transaction(async (trx) => {
      if (
        !req.validatedParams.entryId ||
        (req.validatedParams.domain === 'reminders' && body.enabled)
      ) {
        const state = await getUserSessionState(trx, req.recordStudent.id);
        if (!state?.consentStatus.hasActiveConsent)
          throw badRequest(
            'Pengumpulan baru/pengingat menunggu persetujuan siswa dan verifikasi wali.'
          );
      }
      const existing = req.validatedParams.entryId
        ? await trx(domain.table)
            .where({
              id: req.validatedParams.entryId,
              user_id: req.recordStudent.id,
              school_id: school.id,
            })
            .forUpdate()
            .first()
        : null;
      if (req.validatedParams.entryId && !existing) throw notFound('Entri tidak ditemukan.');
      if (existing && domain.versioned && body.version !== existing.version)
        throw conflict('Entri sudah berubah. Muat ulang editor.');
      const values = domain.values(body, env, school.timezone);
      if (domain.versioned) values.version = existing ? existing.version + 1 : 1;
      if (['moods', 'journals', 'schedule-blocks'].includes(req.validatedParams.domain))
        values.local_date = existing?.local_date || getLocalDateString(new Date(), school.timezone);
      let result;
      if (existing)
        [result] = await trx(domain.table)
          .where({ id: existing.id })
          .update({ ...values, updated_at: new Date() })
          .returning('*');
      else
        [result] = await trx(domain.table)
          .insert({
            ...values,
            id: crypto.randomUUID(),
            user_id: req.recordStudent.id,
            school_id: school.id,
          })
          .returning('*');
      if (req.validatedParams.domain === 'tasks') {
        await trx('task_steps').where({ task_id: result.id }).del();
        if (body.steps.length)
          await trx('task_steps').insert(
            body.steps.map((s, index) => ({
              id: crypto.randomUUID(),
              task_id: result.id,
              user_id: req.recordStudent.id,
              title: s.title,
              is_done: s.isDone,
              sort_order: index,
            }))
          );
      }
      await invalidateAllStudentWeekSnapshots(trx, school.id);
      await audit(trx, req, existing ? 'update' : 'create', result.id);
      return result;
    });
    return sendSuccess(
      res,
      { id: row.id, version: row.version },
      req.validatedParams.entryId ? 200 : 201
    );
  }
  router.post(
    '/students/:id/records/:domain',
    csrf.csrfProtection,
    validateRequest({ params }),
    scope,
    asyncHandler(write)
  );
  router.patch(
    '/students/:id/records/:domain/:entryId',
    csrf.csrfProtection,
    validateRequest({ params }),
    scope,
    asyncHandler(write)
  );
  router.delete(
    '/students/:id/records/:domain/:entryId',
    csrf.csrfProtection,
    validateRequest({ params, body: reasonSchema }),
    scope,
    asyncHandler(async (req, res) => {
      await db.transaction(async (trx) => {
        const deleted = await trx(req.recordDomain.table)
          .where({
            id: req.validatedParams.entryId,
            user_id: req.recordStudent.id,
            school_id: req.currentUser.schoolId,
          })
          .del();
        if (!deleted) throw notFound('Entri tidak ditemukan.');
        await invalidateAllStudentWeekSnapshots(trx, req.currentUser.schoolId);
        await audit(trx, req, 'delete', req.validatedParams.entryId);
      });
      return sendSuccess(res, { deleted: true });
    })
  );
  return router;
}
