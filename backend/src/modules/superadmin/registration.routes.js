import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { revokeAllUserSessions } from '../auth/auth.service.js';
import { invalidateAllStudentWeekSnapshots } from '../dashboard/aggregate-computation.service.js';

export function createRegistrationReviewRouter({ db, csrf, guard }) {
  const router = express.Router();
  router.use(...guard);
  router.get(
    '/registrations',
    asyncHandler(async (req, res) => {
      const inputPage = Number(req.query.page);
      const page =
        Number.isSafeInteger(inputPage) && inputPage > 0 ? Math.min(inputPage, 100000) : 1;
      const perPage = 20;
      const query = db('users').where({
        school_id: req.currentUser.schoolId,
        role: 'student',
        registration_status: 'pending',
      });
      const total = Number((await query.clone().count('* as count').first()).count);
      const rows = await query
        .select('id', 'display_name', 'nisn', 'grade_group', 'registration_submitted_at')
        .orderBy('registration_submitted_at', 'asc')
        .orderBy('id')
        .limit(perPage)
        .offset((page - 1) * perPage);
      return sendSuccess(res, {
        registrations: rows.map((row) => ({
          id: row.id,
          displayName: row.display_name,
          nisn: row.nisn,
          gradeGroup: row.grade_group,
          submittedAt: row.registration_submitted_at,
        })),
        total,
        page,
        perPage,
      });
    })
  );
  router.post(
    '/users/:id/registration-review',
    csrf.csrfProtection,
    validateRequest({
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ decision: z.enum(['approve', 'reject']) }).strict(),
    }),
    asyncHandler(async (req, res) => {
      const decision = req.validatedBody.decision;
      await db.transaction(async (trx) => {
        const target = await trx('users')
          .where({
            id: req.validatedParams.id,
            school_id: req.currentUser.schoolId,
            role: 'student',
          })
          .forUpdate()
          .first();
        if (!target) throw notFound('Pendaftaran tidak ditemukan.');
        if (target.registration_status !== 'pending' || target.status !== 'pending_activation')
          throw conflict('Pendaftaran sudah ditinjau. Muat ulang daftar.');
        if (!target.password_hash || !target.nisn)
          throw badRequest('Data pendaftaran belum lengkap.');
        await trx('users')
          .where({ id: target.id })
          .update({
            status: decision === 'approve' ? 'active' : 'inactive',
            registration_status: decision === 'approve' ? 'approved' : 'rejected',
            registration_reviewed_at: new Date(),
            registration_reviewer_id: req.currentUser.id,
            updated_at: new Date(),
          });
        await revokeAllUserSessions(trx, target.id);
        await invalidateAllStudentWeekSnapshots(trx, req.currentUser.schoolId);
        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action:
            decision === 'approve'
              ? 'student_registration_approved'
              : 'student_registration_rejected',
          targetType: 'user',
          targetId: target.id,
          summary:
            decision === 'approve'
              ? 'Superadmin menyetujui pendaftaran dan mengaktifkan akun siswa.'
              : 'Superadmin menolak pendaftaran siswa.',
        });
      });
      return sendSuccess(res, {
        status: decision === 'approve' ? 'approved' : 'rejected',
        message:
          decision === 'approve'
            ? 'Pendaftaran disetujui. Siswa dapat masuk dengan NISN dan sandinya.'
            : 'Pendaftaran ditolak.',
      });
    })
  );
  return router;
}
