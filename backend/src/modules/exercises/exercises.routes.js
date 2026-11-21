import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { getLocalDateString } from '../../lib/time.js';
import { resolveTargetSchool } from '../../lib/public-catalog.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertOwnership } from '../../policies/ownership.policy.js';
import { recordActivityMetadata } from '../dashboard/activity-metadata.service.js';
import { invalidateSnapshotsForDate } from '../dashboard/aggregate-computation.service.js';

const startSessionSchema = z.object({
  exerciseId: z.string().uuid(),
});

const patchSessionSchema = z.object({
  status: z.enum(['paused', 'started', 'completed', 'stopped']),
  activeSeconds: z.number().int().min(0).max(7200),
});

const idParamSchema = z.object({ id: z.string().uuid() });

function presentExercise(row) {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    title: row.title,
    subtitle: row.subtitle,
    durationSeconds: row.duration_seconds,
    version: row.version,
    instructions: Array.isArray(row.instructions) ? row.instructions : [],
    stopNotice: row.stop_notice,
    audioUrl: row.audio_url,
    sourceReference: row.source_reference,
    mediaRights: row.media_rights,
    reviewerRef: row.reviewer_ref,
  };
}

export function createExercisesRouter({ db, authenticate, requireMfa }) {
  const router = express.Router();
  router.use(authenticate, requireMfa);

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const school = await resolveTargetSchool(db, req);
      const query = db('exercise_contents')
        .where({ status: 'published' })
        .orderBy('created_at', 'asc');
      if (school) {
        query.andWhere({ school_id: school.id });
      }
      const rows = await query;
      return sendSuccess(res, { exercises: rows.map(presentExercise) });
    })
  );

  router.get(
    '/:slug',
    asyncHandler(async (req, res) => {
      const school = await resolveTargetSchool(db, req);
      const query = db('exercise_contents')
        .where({ slug: req.params.slug, status: 'published' })
        .orderBy('version', 'desc');
      if (school) {
        query.andWhere({ school_id: school.id });
      }
      const row = await query.first();
      if (!row) {
        throw notFound('Materi latihan tidak ditemukan.');
      }
      return sendSuccess(res, { exercise: presentExercise(row) });
    })
  );

  return router;
}

export function createExerciseSessionsRouter({
  db,
  csrf,
  authenticate,
  authorize,
  requireConsent,
}) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  router.get(
    '/',
    ...guard,
    asyncHandler(async (req, res) => {
      const rows = await db('exercise_sessions')
        .join('exercise_contents', 'exercise_sessions.exercise_id', 'exercise_contents.id')
        .where({ 'exercise_sessions.user_id': req.currentUser.id })
        .select(
          'exercise_sessions.*',
          'exercise_contents.title as exercise_title',
          'exercise_contents.category as exercise_category'
        )
        .orderBy('exercise_sessions.started_at', 'desc')
        .limit(20);

      return sendSuccess(res, {
        sessions: rows.map((r) => ({
          id: r.id,
          exerciseId: r.exercise_id,
          exerciseTitle: r.exercise_title,
          exerciseCategory: r.exercise_category,
          exerciseVersion: r.exercise_version,
          status: r.status,
          activeSeconds: r.active_seconds,
          startedAt: r.started_at,
          endedAt: r.ended_at,
          localDate: r.local_date,
        })),
      });
    })
  );

  router.post(
    '/',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: startSessionSchema }),
    asyncHandler(async (req, res) => {
      const exercise = await db('exercise_contents')
        .where({
          id: req.validatedBody.exerciseId,
          school_id: req.currentUser.schoolId,
          status: 'published',
        })
        .first();

      if (!exercise) {
        throw notFound('Latihan tidak ditemukan.');
      }

      const school = await db('schools')
        .select('timezone')
        .where({ id: req.currentUser.schoolId })
        .first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const localDate = getLocalDateString(new Date(), tz);

      const [sessionRow] = await db('exercise_sessions')
        .insert({
          id: crypto.randomUUID(),
          school_id: req.currentUser.schoolId,
          user_id: req.currentUser.id,
          exercise_id: exercise.id,
          exercise_version: exercise.version,
          duration_seconds: exercise.duration_seconds,
          status: 'started',
          active_seconds: 0,
          started_at: new Date(),
          local_date: localDate,
        })
        .returning('*');

      return sendSuccess(
        res,
        {
          session: {
            id: sessionRow.id,
            exerciseId: sessionRow.exercise_id,
            exerciseVersion: sessionRow.exercise_version,
            status: sessionRow.status,
            activeSeconds: sessionRow.active_seconds,
            startedAt: sessionRow.started_at,
          },
        },
        201
      );
    })
  );

  router.patch(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: patchSessionSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('exercise_sessions').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Sesi latihan tidak ditemukan.');

      if (existing.status === 'completed' || existing.status === 'stopped') {
        throw badRequest('Sesi latihan ini sudah berakhir.');
      }

      const { status, activeSeconds } = req.validatedBody;
      const isFinishing = status === 'completed' || status === 'stopped';
      const safeActiveSeconds = Math.max(existing.active_seconds, activeSeconds);
      if (
        safeActiveSeconds > existing.duration_seconds ||
        (status === 'completed' && safeActiveSeconds < existing.duration_seconds)
      ) {
        throw badRequest(
          'Durasi aktif belum memenuhi durasi latihan. Kamu dapat berhenti secara sukarela.'
        );
      }

      const updated = await db.transaction(async (trx) => {
        const [row] = await trx('exercise_sessions')
          .where({ id: existing.id })
          .update({
            status,
            active_seconds: safeActiveSeconds,
            ended_at: isFinishing ? new Date() : null,
            updated_at: new Date(),
          })
          .returning('*');

        if (isFinishing) {
          const ex = await trx('exercise_contents').where({ id: existing.exercise_id }).first();
          await recordActivityMetadata(trx, {
            user: req.currentUser,
            activityType: 'exercise',
            activityLabel: ex?.title || 'Latihan Menenangkan Diri',
            statusLabel: status === 'completed' ? 'Selesai' : 'Berhenti sukarela',
            durationSeconds: safeActiveSeconds,
            localDate: existing.local_date,
          });
          await invalidateSnapshotsForDate(trx, req.currentUser.schoolId, existing.local_date);
        }

        return row;
      });

      return sendSuccess(res, {
        session: {
          id: updated.id,
          status: updated.status,
          activeSeconds: updated.active_seconds,
          endedAt: updated.ended_at,
        },
      });
    })
  );

  return router;
}
