import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { conflict } from '../../lib/errors.js';
import { decryptSensitiveText, encryptSensitiveText } from '../../lib/encryption.js';
import { getLocalDateString, getWeekBounds } from '../../lib/time.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertOwnership } from '../../policies/ownership.policy.js';
import { recordActivityMetadata } from '../dashboard/activity-metadata.service.js';
import { invalidateSnapshotsForDate } from '../dashboard/aggregate-computation.service.js';

export const CURATED_STRATEGY_TAGS = [
  'Membuat jadwal jeda',
  'Latihan napas teratur',
  'Membatasi layar malam',
  'Memecah tugas jadi langkah kecil',
  'Jalan kaki santai 10 menit',
  'Berdiskusi dengan teman atau guru BK',
];

export const reflectionBodySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  helpful: z.string().trim().min(1, 'Isian pertama wajib diisi.').max(2000, 'Maksimal 2.000 karakter.'),
  obstacle: z.string().trim().min(1, 'Isian kedua wajib diisi.').max(2000, 'Maksimal 2.000 karakter.'),
  plan: z.string().trim().min(1, 'Isian ketiga wajib diisi.').max(2000, 'Maksimal 2.000 karakter.'),
  strategyTags: z.array(z.enum(CURATED_STRATEGY_TAGS)).max(6).optional().default([]),
  version: z.number().int().min(1).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

function presentReflection(row, keyRing) {
  return {
    id: row.id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    schoolTimezone: row.school_timezone,
    helpful: decryptSensitiveText(row.helpful_encrypted, keyRing),
    obstacle: decryptSensitiveText(row.obstacle_encrypted, keyRing),
    plan: decryptSensitiveText(row.plan_encrypted, keyRing),
    strategyTags: Array.isArray(row.strategy_tags) ? row.strategy_tags : [],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createReflectionsRouter({ db, env, csrf, authenticate, authorize, requireConsent }) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  router.get(
    '/',
    ...guard,
    asyncHandler(async (req, res) => {
      const school = await db('schools').select('timezone').where({ id: req.currentUser.schoolId }).first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const currentBounds = getWeekBounds(new Date(), tz);

      const rows = await db('weekly_reflections')
        .where({ user_id: req.currentUser.id })
        .orderBy('week_start', 'desc')
        .limit(20);

      return sendSuccess(res, {
        currentWeek: currentBounds,
        schoolTimezone: tz,
        curatedTags: CURATED_STRATEGY_TAGS,
        reflections: rows.map((r) => presentReflection(r, env.keyRing)),
      });
    })
  );

  router.post(
    '/',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: reflectionBodySchema }),
    asyncHandler(async (req, res) => {
      const school = await db('schools').select('timezone').where({ id: req.currentUser.schoolId }).first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const b = req.validatedBody;
      const { weekStart, weekEnd } = getWeekBounds(b.weekStart || new Date(), tz);
      const localDate = getLocalDateString(new Date(), tz);

      const saved = await db.transaction(async (trx) => {
        const existing = await trx('weekly_reflections')
          .where({ user_id: req.currentUser.id, week_start: weekStart })
          .first();

        let row;
        if (existing) {
          if (b.version !== undefined && b.version !== existing.version) {
            throw conflict('Refleksi minggu ini telah diperbarui di sesi lain.');
          }
          [row] = await trx('weekly_reflections')
            .where({ id: existing.id, version: existing.version })
            .update({
              helpful_encrypted: encryptSensitiveText(b.helpful, env.keyRing),
              obstacle_encrypted: encryptSensitiveText(b.obstacle, env.keyRing),
              plan_encrypted: encryptSensitiveText(b.plan, env.keyRing),
              strategy_tags: JSON.stringify(b.strategyTags),
              version: existing.version + 1,
              updated_at: new Date(),
            })
            .returning('*');
          if (!row) throw conflict();
        } else {
          [row] = await trx('weekly_reflections')
            .insert({
              id: crypto.randomUUID(),
              school_id: req.currentUser.schoolId,
              user_id: req.currentUser.id,
              week_start: weekStart,
              week_end: weekEnd,
              school_timezone: tz,
              helpful_encrypted: encryptSensitiveText(b.helpful, env.keyRing),
              obstacle_encrypted: encryptSensitiveText(b.obstacle, env.keyRing),
              plan_encrypted: encryptSensitiveText(b.plan, env.keyRing),
              strategy_tags: JSON.stringify(b.strategyTags),
              version: 1,
            })
            .returning('*');
        }

        await recordActivityMetadata(trx, {
          user: req.currentUser,
          activityType: 'reflection',
          activityLabel: 'Refleksi Mingguan',
          statusLabel: 'Tersimpan',
          localDate,
        });

        await invalidateSnapshotsForDate(trx, req.currentUser.schoolId, weekStart, tz);
        return row;
      });

      return sendSuccess(res, { reflection: presentReflection(saved, env.keyRing) }, 201);
    })
  );

  router.patch(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: reflectionBodySchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('weekly_reflections').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Refleksi tidak ditemukan.');

      const b = req.validatedBody;
      if (b.version !== undefined && b.version !== existing.version) {
        throw conflict('Refleksi ini telah diperbarui di sesi lain.');
      }

      const [updated] = await db('weekly_reflections')
        .where({ id: existing.id, version: existing.version })
        .update({
          helpful_encrypted: encryptSensitiveText(b.helpful, env.keyRing),
          obstacle_encrypted: encryptSensitiveText(b.obstacle, env.keyRing),
          plan_encrypted: encryptSensitiveText(b.plan, env.keyRing),
          strategy_tags: JSON.stringify(b.strategyTags),
          version: existing.version + 1,
          updated_at: new Date(),
        })
        .returning('*');

      if (!updated) throw conflict();
      await invalidateSnapshotsForDate(db, req.currentUser.schoolId, existing.week_start, existing.school_timezone);
      return sendSuccess(res, { reflection: presentReflection(updated, env.keyRing) });
    })
  );

  router.delete(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('weekly_reflections').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Refleksi tidak ditemukan.');

      await db('weekly_reflections').where({ id: existing.id }).del();
      await invalidateSnapshotsForDate(db, req.currentUser.schoolId, existing.week_start, existing.school_timezone);
      return sendSuccess(res, { deleted: true });
    })
  );

  return router;
}
