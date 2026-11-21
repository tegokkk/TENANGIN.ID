import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { serviceUnavailable } from '../../lib/errors.js';
import { decryptSensitiveJson, encryptSensitiveJson } from '../../lib/encryption.js';
import { getLocalDateString } from '../../lib/time.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertOwnership } from '../../policies/ownership.policy.js';
import { scoreScreeningResponse } from './scoring/score-response.js';
import { recordActivityMetadata } from '../dashboard/activity-metadata.service.js';

const submitScreeningSchema = z.object({
  instrumentId: z.string().uuid(),
  answers: z.record(z.string(), z.union([z.number().int(), z.string()])),
});

const idParamSchema = z.object({ id: z.string().uuid() });

export function createScreeningRouter({ db, env, csrf, authenticate, authorize, requireConsent }) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  router.get(
    '/active',
    ...guard,
    asyncHandler(async (req, res) => {
      const approved = await db('screening_instruments')
        .where({
          school_id: req.currentUser.schoolId,
          status: 'active',
          is_approved: true,
          is_simulation: false,
        })
        .orderBy('created_at', 'desc')
        .first();

      if (approved) {
        return sendSuccess(res, {
          available: true,
          isSimulation: false,
          instrument: {
            id: approved.id,
            code: approved.code,
            version: approved.version,
            title: approved.title,
            description: approved.description,
            referencePeriod: approved.reference_period,
            approvalRef: approved.approval_ref,
            items: approved.items,
          },
        });
      }

      if (env.APP_MODE === 'demo') {
        const sim = await db('screening_instruments')
          .where({
            school_id: req.currentUser.schoolId,
            status: 'active',
            is_simulation: true,
          })
          .orderBy('created_at', 'desc')
          .first();

        if (sim) {
          return sendSuccess(res, {
            available: true,
            isSimulation: true,
            notice: 'Simulasi, bukan hasil penilaian. Instrumen nyata menunggu pengesahan ahli BK.',
            instrument: {
              id: sim.id,
              code: sim.code,
              version: sim.version,
              title: sim.title,
              description: sim.description,
              referencePeriod: sim.reference_period,
              approvalRef: null,
              items: sim.items,
            },
          });
        }
      }

      return sendSuccess(res, {
        available: false,
        isSimulation: false,
        notice: 'Instrumen belum tersedia — menunggu penetapan resmi ahli BK sekolah.',
        instrument: null,
      });
    })
  );

  router.get(
    '/responses',
    ...guard,
    asyncHandler(async (req, res) => {
      const rows = await db('screening_responses')
        .where({ user_id: req.currentUser.id })
        .orderBy('created_at', 'desc')
        .limit(20);

      return sendSuccess(res, {
        responses: rows.map((r) => ({
          id: r.id,
          instrumentId: r.instrument_id,
          instrumentVersion: r.instrument_version,
          isSimulation: Boolean(r.is_simulation),
          computedScore: r.computed_score !== null ? Number(r.computed_score) : null,
          scoreStatus: r.score_status,
          interpretationLabel: r.interpretation_label,
          supportMessage: r.support_message,
          localDate: r.local_date,
          answers: decryptSensitiveJson(r.answers_encrypted, env.keyRing),
          createdAt: r.created_at,
        })),
      });
    })
  );

  router.post(
    '/responses',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: submitScreeningSchema }),
    asyncHandler(async (req, res) => {
      const instrument = await db('screening_instruments')
        .where({
          id: req.validatedBody.instrumentId,
          school_id: req.currentUser.schoolId,
          status: 'active',
        })
        .first();

      if (!instrument) {
        throw serviceUnavailable('Instrumen skrining tidak tersedia saat ini.');
      }

      if (
        (env.APP_MODE !== 'demo' && instrument.is_simulation) ||
        (!instrument.is_approved && !(env.APP_MODE === 'demo' && instrument.is_simulation))
      ) {
        throw serviceUnavailable(
          'Instrumen skrining belum disahkan ahli untuk penggunaan nyata.',
          'INSTRUMENT_UNAPPROVED'
        );
      }

      const scored = scoreScreeningResponse(instrument, req.validatedBody.answers);
      const school = await db('schools')
        .select('timezone')
        .where({ id: req.currentUser.schoolId })
        .first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const localDate = getLocalDateString(new Date(), tz);

      const responseRow = await db.transaction(async (trx) => {
        const [inserted] = await trx('screening_responses')
          .insert({
            id: crypto.randomUUID(),
            school_id: req.currentUser.schoolId,
            user_id: req.currentUser.id,
            instrument_id: instrument.id,
            instrument_version: instrument.version,
            is_simulation: Boolean(instrument.is_simulation),
            answers_encrypted: encryptSensitiveJson(scored.sanitizedAnswers, env.keyRing),
            computed_score: scored.computedScore,
            score_status: scored.scoreStatus,
            interpretation_label: scored.interpretationLabel,
            support_message: scored.supportMessage,
            local_date: localDate,
          })
          .returning('*');

        if (scored.scoreStatus === 'complete' && !instrument.is_simulation) {
          await recordActivityMetadata(trx, {
            user: req.currentUser,
            activityType: 'screening',
            activityLabel: 'Skrining Mandiri',
            statusLabel: 'Tersimpan',
            localDate,
          });
        }

        return inserted;
      });

      return sendSuccess(
        res,
        {
          response: {
            id: responseRow.id,
            instrumentVersion: responseRow.instrument_version,
            isSimulation: Boolean(responseRow.is_simulation),
            computedScore:
              responseRow.computed_score !== null ? Number(responseRow.computed_score) : null,
            scoreStatus: responseRow.score_status,
            interpretationLabel: responseRow.interpretation_label,
            supportMessage: responseRow.support_message,
            localDate: responseRow.local_date,
            createdAt: responseRow.created_at,
          },
        },
        201
      );
    })
  );

  router.delete(
    '/responses/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('screening_responses')
        .where({ id: req.validatedParams.id })
        .first();
      assertOwnership(existing, req.currentUser.id, 'Respons skrining tidak ditemukan.');
      await db('screening_responses').where({ id: existing.id }).del();
      return sendSuccess(res, { deleted: true });
    })
  );

  return router;
}
