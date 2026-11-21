import express from 'express';
import { createSchoolsRouter } from '../modules/schools/schools.routes.js';
import { createAuthRouter, createMeRouter } from '../modules/auth/auth.routes.js';
import { createConsentPolicyRouter, createConsentsRouter } from '../modules/consent/consent.routes.js';
import { createPrivacyRouter } from '../modules/privacy/privacy.routes.js';
import { createMoodRouter } from '../modules/mood/mood.routes.js';
import { createScreeningRouter } from '../modules/screening/screening.routes.js';
import { createJournalsRouter } from '../modules/journals/journals.routes.js';
import {
  createExerciseSessionsRouter,
  createExercisesRouter,
} from '../modules/exercises/exercises.routes.js';
import { createScheduleBlocksRouter, createTasksRouter } from '../modules/planner/planner.routes.js';
import { createRemindersRouter } from '../modules/reminders/reminders.routes.js';
import { createReflectionsRouter } from '../modules/reflections/reflections.routes.js';
import { createLibraryRouter } from '../modules/library/library.routes.js';
import { createHelpRequestsRouter } from '../modules/help-requests/help-requests.routes.js';
import { createGroupFeedbackRouter } from '../modules/feedback/feedback.routes.js';
import { createBkRouter } from '../modules/dashboard/bk.routes.js';
import { createSuperadminRouter } from '../modules/superadmin/superadmin.routes.js';
import { createExportsRouter } from '../modules/exports/exports.routes.js';

export function createApiRouter(deps) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, status: 'healthy', service: 'tenangin-api' });
  });

  router.get('/ready', async (_req, res) => {
    try {
      await deps.db.raw('SELECT 1');
      res.json({ ok: true, status: 'ready', appMode: deps.env.APP_MODE });
    } catch {
      res.status(503).json({
        ok: false,
        error: { code: 'DB_UNAVAILABLE', message: 'Koneksi database belum siap.' },
      });
    }
  });

  router.use('/public', createSchoolsRouter(deps));
  router.use('/auth', createAuthRouter(deps));
  router.use('/me', createMeRouter(deps));
  router.use('/me', createPrivacyRouter(deps));
  router.use('/consent-policy', createConsentPolicyRouter(deps));
  router.use('/consents', createConsentsRouter(deps));
  router.use('/moods', createMoodRouter(deps));
  router.use('/screening', createScreeningRouter(deps));
  router.use('/journals', createJournalsRouter(deps));
  router.use('/exercises', createExercisesRouter(deps));
  router.use('/exercise-sessions', createExerciseSessionsRouter(deps));
  router.use('/tasks', createTasksRouter(deps));
  router.use('/schedule-blocks', createScheduleBlocksRouter(deps));
  router.use('/reminders', createRemindersRouter(deps));
  router.use('/reflections', createReflectionsRouter(deps));
  router.use('/articles', createLibraryRouter(deps));
  router.use('/help-requests', createHelpRequestsRouter(deps));
  router.use('/group-feedback', createGroupFeedbackRouter(deps));
  router.use('/bk', createBkRouter(deps));
  router.use('/superadmin', createSuperadminRouter(deps));
  router.use('/exports', createExportsRouter(deps));

  // API 404 selalu mengembalikan JSON terstruktur (tidak pernah fallback index.html)
  router.use((req, res) => {
    res.status(404).json({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint API tidak ditemukan.',
        request_id: res.locals?.requestId || null,
      },
    });
  });

  return router;
}
