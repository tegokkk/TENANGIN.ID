import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, serviceUnavailable } from '../../lib/errors.js';
import { decryptSensitiveText, encryptSensitiveText } from '../../lib/encryption.js';
import { extractIdempotencyKey } from '../../lib/idempotency.js';
import { getLocalDateString } from '../../lib/time.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertStudentOwned } from '../../policies/ownership.policy.js';
import { canTransitionHelpStatus, HELP_STATUS_LABELS } from './help-state.js';
import { recordActivityMetadata } from '../dashboard/activity-metadata.service.js';

const createHelpSchema = z.object({
  requestedCounselor: z.string().trim().max(160).nullable().optional(),
  preferredTime: z.string().trim().max(120).nullable().optional(),
  topicMessage: z.string().trim().max(2000).nullable().optional(),
  contact: z.string().trim().max(200).nullable().optional(),
});

const patchStudentStatusSchema = z.object({
  status: z.literal('cancelled'),
  note: z.string().trim().max(300).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

async function buildStudentHelpDetail(db, keyRing, row) {
  const events = await db('help_status_events')
    .where({ help_request_id: row.id })
    .orderBy('created_at', 'asc');
  const ack = await db('help_acknowledgements').where({ help_request_id: row.id }).first();

  return {
    id: row.id,
    status: row.status,
    statusLabel: HELP_STATUS_LABELS[row.status] || row.status,
    recipientRole: 'Superadmin (Pengelola Layanan Sekolah)',
    requestedCounselor: row.requested_counselor,
    preferredTime: row.preferred_time,
    topicMessage: row.topic_message_encrypted
      ? decryptSensitiveText(row.topic_message_encrypted, keyRing)
      : '',
    contact: row.contact_encrypted ? decryptSensitiveText(row.contact_encrypted, keyRing) : '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acknowledgement: ack
      ? {
          message: ack.message,
          locationInfo: ack.location_info,
          scheduleInfo: ack.schedule_info,
          version: ack.version,
          updatedAt: ack.updated_at,
        }
      : null,
    statusEvents: events.map((ev) => ({
      id: ev.id,
      actorRole: ev.actor_role,
      fromStatus: ev.from_status,
      toStatus: ev.to_status,
      note: ev.note,
      createdAt: ev.created_at,
    })),
  };
}

export function createHelpRequestsRouter({ db, env, csrf, authenticate, authorize, requireConsent }) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  router.get(
    '/',
    ...guard,
    asyncHandler(async (req, res) => {
      const rows = await db('help_requests')
        .where({ student_user_id: req.currentUser.id })
        .orderBy('created_at', 'desc')
        .limit(20);

      const items = await Promise.all(
        rows.map((r) => buildStudentHelpDetail(db, env.keyRing, r))
      );

      return sendSuccess(res, {
        requests: items,
        statusNotice: '"Terkirim" berarti tersimpan di sistem sekolah, bukan otomatis sudah dibaca.',
      });
    })
  );

  router.get(
    '/:id',
    ...guard,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const row = await db('help_requests').where({ id: req.validatedParams.id }).first();
      assertStudentOwned(row, req.currentUser.id);
      const detail = await buildStudentHelpDetail(db, env.keyRing, row);
      return sendSuccess(res, { request: detail });
    })
  );

  router.post(
    '/',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: createHelpSchema }),
    asyncHandler(async (req, res) => {
      const idempotencyKey = extractIdempotencyKey(req);

      const school = await db('schools')
        .select('timezone', 'active_handler_configured')
        .where({ id: req.currentUser.schoolId })
        .first();

      if (!school?.active_handler_configured) {
        throw serviceUnavailable(
          'Pengelola layanan sekolah belum ditetapkan. Gunakan kontak terverifikasi yang tercantum.',
          'HANDLER_NOT_CONFIGURED'
        );
      }

      const existing = await db('help_requests')
        .where({
          student_user_id: req.currentUser.id,
          idempotency_key: idempotencyKey,
        })
        .first();

      if (existing) {
        const detail = await buildStudentHelpDetail(db, env.keyRing, existing);
        return sendSuccess(res, { request: detail, deduplicated: true }, 200);
      }

      const tz = school.timezone || 'Asia/Jakarta';
      const localDate = getLocalDateString(new Date(), tz);
      const b = req.validatedBody;
      const helpId = crypto.randomUUID();

      let created;
      try {
        created = await db.transaction(async (trx) => {
          const [inserted] = await trx('help_requests')
            .insert({
              id: helpId,
              school_id: req.currentUser.schoolId,
              student_user_id: req.currentUser.id,
              handler_user_id: null,
              requested_counselor: b.requestedCounselor || null,
              preferred_time: b.preferredTime || null,
              topic_message_encrypted: b.topicMessage
                ? encryptSensitiveText(b.topicMessage, env.keyRing)
                : null,
              contact_encrypted: b.contact ? encryptSensitiveText(b.contact, env.keyRing) : null,
              status: 'submitted',
              idempotency_key: idempotencyKey,
            })
            .returning('*');

          await trx('help_status_events').insert({
            id: crypto.randomUUID(),
            help_request_id: inserted.id,
            actor_user_id: req.currentUser.id,
            actor_role: 'student',
            from_status: null,
            to_status: 'submitted',
            note: 'Permintaan bantuan dikirim siswa kepada pengelola layanan (Superadmin).',
          });

          await recordActivityMetadata(trx, {
            user: req.currentUser,
            activityType: 'help_request',
            activityLabel: 'Permintaan Bantuan Sukarela',
            statusLabel: 'Terkirim',
            localDate,
          });

          return inserted;
        });
      } catch (err) {
        if (err?.code === '23505') {
          const dup = await db('help_requests')
            .where({ student_user_id: req.currentUser.id, idempotency_key: idempotencyKey })
            .first();
          if (dup) {
            const detail = await buildStudentHelpDetail(db, env.keyRing, dup);
            return sendSuccess(res, { request: detail, deduplicated: true }, 200);
          }
        }
        throw err;
      }

      const detail = await buildStudentHelpDetail(db, env.keyRing, created);
      return sendSuccess(res, { request: detail, deduplicated: false }, 201);
    })
  );

  router.patch(
    '/:id/status',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: patchStudentStatusSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('help_requests').where({ id: req.validatedParams.id }).first();
      assertStudentOwned(existing, req.currentUser.id);

      if (!canTransitionHelpStatus('student', existing.status, 'cancelled')) {
        throw badRequest('Permintaan bantuan yang sudah selesai atau dibatalkan tidak dapat diubah lagi.');
      }

      const updated = await db.transaction(async (trx) => {
        const [row] = await trx('help_requests')
          .where({ id: existing.id })
          .update({ status: 'cancelled', updated_at: new Date() })
          .returning('*');

        await trx('help_status_events').insert({
          id: crypto.randomUUID(),
          help_request_id: existing.id,
          actor_user_id: req.currentUser.id,
          actor_role: 'student',
          from_status: existing.status,
          to_status: 'cancelled',
          note: req.validatedBody.note || 'Permintaan dibatalkan oleh siswa.',
        });

        return row;
      });

      const detail = await buildStudentHelpDetail(db, env.keyRing, updated);
      return sendSuccess(res, { request: detail });
    })
  );

  return router;
}
