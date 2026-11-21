import express from 'express';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { submitConsentSchema } from './consent.schema.js';
import {
  getActiveConsentPolicy,
  saveStudentConsentDecision,
  withdrawStudentConsent,
  resumeStudentPersonalAccess,
} from './consent.service.js';

export function createConsentPolicyRouter({ db, authenticate }) {
  const router = express.Router();

  router.get(
    '/',
    authenticate,
    asyncHandler(async (req, res) => {
      const policy = await getActiveConsentPolicy(db, req.currentUser.schoolId);
      return sendSuccess(res, { policy });
    })
  );

  return router;
}

export function createConsentsRouter({ db, csrf, authenticate, authorize }) {
  const router = express.Router();

  router.post(
    '/',
    authenticate,
    authorize(['student']),
    csrf.csrfProtection,
    validateRequest({ body: submitConsentSchema }),
    asyncHandler(async (req, res) => {
      const result = await saveStudentConsentDecision(db, req.currentUser, req.validatedBody);
      return sendSuccess(res, result);
    })
  );

  router.post(
    '/withdraw',
    authenticate,
    authorize(['student']),
    csrf.csrfProtection,
    asyncHandler(async (req, res) => {
      const result = await withdrawStudentConsent(db, req.currentUser);
      return sendSuccess(res, result);
    })
  );

  router.post(
    '/resume',
    authenticate,
    authorize(['student']),
    csrf.csrfProtection,
    asyncHandler(async (req, res) =>
      sendSuccess(res, await resumeStudentPersonalAccess(db, req.currentUser))
    )
  );

  return router;
}
