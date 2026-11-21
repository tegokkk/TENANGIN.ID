import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest } from '../../lib/errors.js';
import { getLocalDateString } from '../../lib/time.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertOwnership } from '../../policies/ownership.policy.js';
import { recordActivityMetadata } from '../dashboard/activity-metadata.service.js';
import { invalidateSnapshotsForDate } from '../dashboard/aggregate-computation.service.js';

export const MOOD_OPTIONS = {
  very_heavy: { label: 'Sangat Berat', score: 1 },
  anxious_tired: { label: 'Cemas / Lelah', score: 2 },
  neutral: { label: 'Biasa Saja', score: 3 },
  calm_relieved: { label: 'Tenang / Lega', score: 4 },
  energized: { label: 'Bersemangat', score: 5 },
};

export const createMoodSchema = z.object({
  moodCode: z.enum(['very_heavy', 'anxious_tired', 'neutral', 'calm_relieved', 'energized']).optional(),
  pressureLevel: z.number().int().min(0).max(10).nullable().optional(),
  skipped: z.boolean().optional().default(false),
});

const patchMoodSchema = z.object({
  moodCode: z.enum(['very_heavy', 'anxious_tired', 'neutral', 'calm_relieved', 'energized']).optional(),
  pressureLevel: z.number().int().min(0).max(10).nullable().optional(),
  skipped: z.boolean().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

function presentMood(row) {
  return {
    id: row.id,
    localDate: row.local_date,
    schoolTimezone: row.school_timezone,
    moodCode: row.mood_code,
    moodLabel: row.mood_label,
    moodScore: row.mood_score,
    pressureLevel: row.pressure_level,
    skipped: Boolean(row.skipped),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createMoodRouter({ db, csrf, authenticate, authorize, requireConsent }) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  router.get(
    '/',
    ...guard,
    asyncHandler(async (req, res) => {
      const school = await db('schools').select('timezone').where({ id: req.currentUser.schoolId }).first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const todayLocal = getLocalDateString(new Date(), tz);

      const entries = await db('mood_entries')
        .where({ user_id: req.currentUser.id })
        .orderBy('local_date', 'desc')
        .limit(30);

      const todayEntry = entries.find((e) => e.local_date === todayLocal) || null;

      return sendSuccess(res, {
        todayLocalDate: todayLocal,
        schoolTimezone: tz,
        todayEntry: todayEntry ? presentMood(todayEntry) : null,
        entries: entries.map(presentMood),
      });
    })
  );

  router.post(
    '/',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: createMoodSchema }),
    asyncHandler(async (req, res) => {
      const { moodCode, pressureLevel, skipped } = req.validatedBody;
      if (!skipped && !moodCode) {
        throw badRequest('Pilih salah satu suasana hati atau pilih lewati hari ini.');
      }

      const school = await db('schools').select('timezone').where({ id: req.currentUser.schoolId }).first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const localDate = getLocalDateString(new Date(), tz);

      const selected = moodCode ? MOOD_OPTIONS[moodCode] : { label: 'Dilewati', score: 3 };
      const effectiveCode = moodCode || 'neutral';

      const saved = await db.transaction(async (trx) => {
        const existing = await trx('mood_entries')
          .where({ user_id: req.currentUser.id, local_date: localDate })
          .first();

        let row;
        if (existing) {
          [row] = await trx('mood_entries')
            .where({ id: existing.id })
            .update({
              mood_code: effectiveCode,
              mood_label: selected.label,
              mood_score: selected.score,
              pressure_level: skipped ? null : pressureLevel ?? existing.pressure_level,
              skipped: Boolean(skipped),
              updated_at: new Date(),
            })
            .returning('*');
        } else {
          [row] = await trx('mood_entries')
            .insert({
              id: crypto.randomUUID(),
              school_id: req.currentUser.schoolId,
              user_id: req.currentUser.id,
              local_date: localDate,
              school_timezone: tz,
              mood_code: effectiveCode,
              mood_label: selected.label,
              mood_score: selected.score,
              pressure_level: skipped ? null : pressureLevel ?? null,
              skipped: Boolean(skipped),
            })
            .returning('*');
        }

        if (!skipped) {
          await recordActivityMetadata(trx, {
            user: req.currentUser,
            activityType: 'mood',
            activityLabel: 'Pengisian Mood Harian',
            statusLabel: 'Tersimpan',
            localDate,
          });
        }
        await invalidateSnapshotsForDate(trx, req.currentUser.schoolId, localDate, tz);
        return row;
      });

      return sendSuccess(res, { entry: presentMood(saved) }, 201);
    })
  );

  router.patch(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: patchMoodSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('mood_entries').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Entri suasana hati tidak ditemukan.');

      const { moodCode, pressureLevel, skipped } = req.validatedBody;
      const nextCode = moodCode || existing.mood_code;
      const selected = MOOD_OPTIONS[nextCode] || { label: existing.mood_label, score: existing.mood_score };

      const [updated] = await db('mood_entries')
        .where({ id: existing.id })
        .update({
          mood_code: nextCode,
          mood_label: skipped ? 'Dilewati' : selected.label,
          mood_score: selected.score,
          pressure_level: pressureLevel !== undefined ? pressureLevel : existing.pressure_level,
          skipped: skipped !== undefined ? skipped : existing.skipped,
          updated_at: new Date(),
        })
        .returning('*');

      await invalidateSnapshotsForDate(db, req.currentUser.schoolId, existing.local_date, existing.school_timezone);
      return sendSuccess(res, { entry: presentMood(updated) });
    })
  );

  router.delete(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('mood_entries').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Entri suasana hati tidak ditemukan.');

      await db('mood_entries').where({ id: existing.id }).del();
      await invalidateSnapshotsForDate(db, req.currentUser.schoolId, existing.local_date, existing.school_timezone);
      return sendSuccess(res, { deleted: true });
    })
  );

  return router;
}
