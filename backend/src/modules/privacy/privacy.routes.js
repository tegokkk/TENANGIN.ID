import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, unauthorized } from '../../lib/errors.js';
import { verifyPassword } from '../../lib/password.js';
import { hashToken } from '../../lib/idempotency.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { revokeAllUserSessions } from '../auth/auth.service.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { invalidateAllStudentWeekSnapshots } from '../dashboard/aggregate-computation.service.js';

const deletionSchema = z.object({
  currentPassword: z.string().min(1, 'Masukkan kata sandi untuk konfirmasi penghapusan.').max(200),
  scope: z.enum(['account', 'entries']).default('account'),
});

export async function purgePersonalEntries(trx, userId, before = null) {
  for (const table of [
    'mood_entries',
    'screening_responses',
    'journal_entries',
    'exercise_sessions',
    'tasks',
    'schedule_blocks',
    'weekly_reflections',
  ]) {
    const query = trx(table).where({ user_id: userId });
    if (before) query.where('created_at', '<=', before);
    await query.del();
  }
  const help = trx('help_requests').where({ student_user_id: userId });
  if (before) help.where('created_at', '<=', before);
  await help.del(); // status events and administrative responses cascade with the request
  const metadata = trx('activity_metadata_events').where({ user_id: userId });
  if (before) metadata.where('occurred_at', '<=', before);
  await metadata.del();
  const deliveries = trx('notification_deliveries').where({ user_id: userId });
  if (before) deliveries.where('delivered_at', '<=', before);
  await deliveries.del();
  await trx('reminder_preferences')
    .where({ user_id: userId })
    .update({ enabled: false, updated_at: new Date() });
  await trx('push_subscriptions').where({ user_id: userId }).del();
}

export async function processDeletionRequest(db, requestId) {
  const reqRow = await db('deletion_requests').where({ id: requestId }).first();
  if (!reqRow || reqRow.status === 'completed') return null;

  await db.transaction(async (trx) => {
    await trx('deletion_requests').where({ id: reqRow.id }).update({ status: 'processing' });

    if (reqRow.scope === 'entries') {
      await purgePersonalEntries(trx, reqRow.user_id, reqRow.requested_at);
    } else {
      await revokeAllUserSessions(trx, reqRow.user_id);
      await trx('deleted_account_tombstones')
        .insert({
          user_id: reqRow.user_id,
          school_id: reqRow.school_id,
          account_code_hash: hashToken(reqRow.account_code),
          deleted_at: new Date(),
        })
        .onConflict('user_id')
        .ignore();

      await trx('users').where({ id: reqRow.user_id }).del();
    }

    await invalidateAllStudentWeekSnapshots(trx, reqRow.school_id);

    await trx('deletion_requests')
      .where({ id: reqRow.id })
      .update({
        status: 'completed',
        completed_at: new Date(),
        evidence_summary:
          reqRow.scope === 'entries'
            ? 'Seluruh entri pribadi dihapus dan snapshot diinvalidasi.'
            : 'Akun, relasi pribadi, dan sesi dicabut; tombstone dicatat.',
      });

    await recordAuditEvent(trx, {
      schoolId: reqRow.school_id,
      actorUserId: null,
      actorCode: 'system-job',
      actorRole: 'system',
      action: 'deletion_completed',
      targetType: 'deletion_request',
      targetId: reqRow.id,
      outcome: 'success',
      summary: `Penghapusan cakupan ${reqRow.scope} selesai diproses tanpa menyalin konten sensitif.`,
    });
  });

  return reqRow.id;
}

export function createPrivacyRouter({ db, csrf, authenticate, authorize, enqueueJob }) {
  const router = express.Router();

  router.post(
    '/deletion-request',
    authenticate,
    authorize(['student']),
    csrf.csrfProtection,
    validateRequest({ body: deletionSchema }),
    asyncHandler(async (req, res) => {
      const user = await db('users').where({ id: req.currentUser.id, status: 'active' }).first();
      if (!user) throw unauthorized();

      const valid = await verifyPassword(user.password_hash, req.validatedBody.currentPassword);
      if (!valid) {
        throw badRequest(
          'Kata sandi konfirmasi tidak cocok.',
          { currentPassword: 'Kata sandi salah.' },
          'INVALID_PASSWORD'
        );
      }

      const deletionId = crypto.randomUUID();
      const scope = req.validatedBody.scope;

      await db.transaction(async (trx) => {
        await trx('deletion_requests').insert({
          id: deletionId,
          school_id: user.school_id,
          user_id: user.id,
          account_code: user.account_code,
          scope,
          status: 'pending',
          requested_at: new Date(),
        });

        await trx('reminder_preferences')
          .where({ user_id: user.id })
          .update({ enabled: false, updated_at: new Date() });

        await invalidateAllStudentWeekSnapshots(trx, user.school_id);

        if (scope === 'account') {
          await trx('users').where({ id: user.id }).update({
            status: 'deletion_pending',
            updated_at: new Date(),
          });
          await revokeAllUserSessions(trx, user.id);
        }

        await recordAuditEvent(trx, {
          schoolId: user.school_id,
          actorUserId: user.id,
          actorCode: user.account_code,
          actorRole: user.role,
          action: 'deletion_requested',
          targetType: 'deletion_request',
          targetId: deletionId,
          outcome: 'success',
          summary: `Permintaan penghapusan (${scope}) diajukan oleh pemilik akun.`,
        });
      });

      if (enqueueJob) {
        await enqueueJob('delete-account', { deletionRequestId: deletionId });
      } else {
        await processDeletionRequest(db, deletionId);
      }

      if (scope === 'account' && req.session) {
        await new Promise((resolve) => req.session.destroy(() => resolve()));
        res.clearCookie('tenangin.sid', { path: '/' });
      }

      return sendSuccess(
        res,
        {
          deletionRequestId: deletionId,
          scope,
          status: 'completed_or_queued',
          message:
            scope === 'account'
              ? 'Permintaan hapus akun diproses. Sesi dicabut dan data pribadimu dibersihkan.'
              : 'Seluruh entri pribadimu telah dijadwalkan untuk dibersihkan.',
        },
        202
      );
    })
  );

  return router;
}
