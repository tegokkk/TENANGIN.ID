import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { conflict } from '../../lib/errors.js';
import { decryptSensitiveText, encryptSensitiveText } from '../../lib/encryption.js';
import { getLocalDateString } from '../../lib/time.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertOwnership } from '../../policies/ownership.policy.js';
import { recordActivityMetadata } from '../dashboard/activity-metadata.service.js';
import { invalidateSnapshotsForDate } from '../dashboard/aggregate-computation.service.js';

export const journalPayloadSchema = z.object({
  situation: z.string().trim().min(1, 'Situasi wajib diisi.').max(2000, 'Maksimal 2.000 karakter.'),
  thoughts: z.string().trim().min(1, 'Pikiran wajib diisi.').max(2000, 'Maksimal 2.000 karakter.'),
  feelings: z.string().trim().min(1, 'Perasaan wajib diisi.').max(2000, 'Maksimal 2.000 karakter.'),
  emotionTags: z.array(z.string().trim().min(1).max(40)).max(10).optional().default([]),
  alternative: z.string().trim().max(2000, 'Maksimal 2.000 karakter.').optional().default(''),
});

const patchJournalSchema = journalPayloadSchema.extend({
  version: z.number().int().min(1).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

function presentJournal(row, keyRing) {
  return {
    id: row.id,
    situation: decryptSensitiveText(row.situation_encrypted, keyRing),
    thoughts: decryptSensitiveText(row.thoughts_encrypted, keyRing),
    feelings: decryptSensitiveText(row.feelings_encrypted, keyRing),
    emotionTags: Array.isArray(row.emotion_tags) ? row.emotion_tags : [],
    alternative: row.alternative_encrypted
      ? decryptSensitiveText(row.alternative_encrypted, keyRing)
      : '',
    version: row.version,
    localDate: row.local_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createJournalsRouter({ db, env, csrf, authenticate, authorize, requireConsent }) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  router.get(
    '/',
    ...guard,
    asyncHandler(async (req, res) => {
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const rows = await db('journal_entries')
        .where({ user_id: req.currentUser.id })
        .orderBy('created_at', 'desc')
        .limit(limit);

      return sendSuccess(res, {
        entries: rows.map((r) => presentJournal(r, env.keyRing)),
        privacyNotice: 'Catatan dapat diakses olehmu dan Superadmin. BK hanya melihat aktivitas penggunaan.',
      });
    })
  );

  router.get(
    '/:id',
    ...guard,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const row = await db('journal_entries').where({ id: req.validatedParams.id }).first();
      assertOwnership(row, req.currentUser.id, 'Catatan jurnal tidak ditemukan.');
      return sendSuccess(res, { entry: presentJournal(row, env.keyRing) });
    })
  );

  router.post(
    '/',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: journalPayloadSchema }),
    asyncHandler(async (req, res) => {
      const { situation, thoughts, feelings, emotionTags, alternative } = req.validatedBody;
      const school = await db('schools').select('timezone').where({ id: req.currentUser.schoolId }).first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const localDate = getLocalDateString(new Date(), tz);

      const created = await db.transaction(async (trx) => {
        const [row] = await trx('journal_entries')
          .insert({
            id: crypto.randomUUID(),
            school_id: req.currentUser.schoolId,
            user_id: req.currentUser.id,
            situation_encrypted: encryptSensitiveText(situation, env.keyRing),
            thoughts_encrypted: encryptSensitiveText(thoughts, env.keyRing),
            feelings_encrypted: encryptSensitiveText(feelings, env.keyRing),
            emotion_tags: JSON.stringify(emotionTags),
            alternative_encrypted: alternative ? encryptSensitiveText(alternative, env.keyRing) : null,
            version: 1,
            local_date: localDate,
          })
          .returning('*');

        await recordActivityMetadata(trx, {
          user: req.currentUser,
          activityType: 'journal',
          activityLabel: 'Jurnal Pemicu & Pikiran',
          statusLabel: 'Tersimpan',
          localDate,
        });

        await invalidateSnapshotsForDate(trx, req.currentUser.schoolId, localDate, tz);
        return row;
      });

      return sendSuccess(res, { entry: presentJournal(created, env.keyRing) }, 201);
    })
  );

  router.patch(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: patchJournalSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('journal_entries').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Catatan jurnal tidak ditemukan.');

      const { situation, thoughts, feelings, emotionTags, alternative, version } = req.validatedBody;
      if (version !== undefined && version !== existing.version) {
        throw conflict('Catatan ini baru diperbarui di sesi atau tab lain. Muat ulang sebelum menyimpan.');
      }

      const [updated] = await db('journal_entries')
        .where({ id: existing.id, version: existing.version })
        .update({
          situation_encrypted: encryptSensitiveText(situation, env.keyRing),
          thoughts_encrypted: encryptSensitiveText(thoughts, env.keyRing),
          feelings_encrypted: encryptSensitiveText(feelings, env.keyRing),
          emotion_tags: JSON.stringify(emotionTags),
          alternative_encrypted: alternative ? encryptSensitiveText(alternative, env.keyRing) : null,
          version: existing.version + 1,
          updated_at: new Date(),
        })
        .returning('*');

      if (!updated) {
        throw conflict();
      }

      return sendSuccess(res, { entry: presentJournal(updated, env.keyRing) });
    })
  );

  router.delete(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('journal_entries').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Catatan jurnal tidak ditemukan.');

      await db('journal_entries').where({ id: existing.id }).del();
      await invalidateSnapshotsForDate(db, req.currentUser.schoolId, existing.local_date);
      return sendSuccess(res, { deleted: true });
    })
  );

  return router;
}
