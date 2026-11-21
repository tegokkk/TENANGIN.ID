import express from 'express';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { applyPublicCatalogCache, resolveTargetSchool } from '../../lib/public-catalog.js';

export function createSchoolsRouter({ db, env }) {
  const router = express.Router();

  router.get(
    '/config',
    asyncHandler(async (req, res) => {
      const [school, schoolsList] = await Promise.all([
        resolveTargetSchool(db, req),
        db('schools')
          .select('code', 'name', 'timezone')
          .where({ is_active: true })
          .orderBy('created_at', 'asc'),
      ]);

      if (!school) {
        return sendSuccess(res, {
          appMode: env.APP_MODE,
          school: null,
          schools: schoolsList,
        });
      }

      applyPublicCatalogCache(req, res);
      return sendSuccess(res, {
        appMode: env.APP_MODE,
        school: {
          id: school.id,
          code: school.code,
          name: school.name,
          timezone: school.timezone,
          serviceHours: school.service_hours,
          verifiedContacts: Array.isArray(school.verified_contacts) ? school.verified_contacts : [],
          guardianConsentRequired: Boolean(school.guardian_consent_required),
          personalAccessMode: school.personal_access_mode,
          activeHandlerConfigured: Boolean(school.active_handler_configured),
        },
        schools: schoolsList,
      });
    })
  );

  return router;
}
