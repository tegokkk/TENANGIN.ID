import crypto from 'node:crypto';
import express from 'express';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest, conflict } from '../../lib/errors.js';
import { assertSameSchool } from '../../policies/school-access.policy.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import {
  articleSchema,
  exerciseSchema,
  contentStatusSchema,
  idParamSchema,
} from './superadmin.schema.js';

const transitions = {
  draft: ['in_review', 'archived'],
  in_review: ['draft', 'approved', 'archived'],
  approved: ['published', 'in_review', 'archived'],
  published: ['archived', 'draft'],
  archived: ['draft'],
};

const definitions = [
  {
    path: 'articles',
    table: 'articles',
    key: 'article',
    schema: articleSchema,
    values: (b) => ({
      slug: b.slug,
      topic: b.topic,
      title: b.title,
      summary: b.summary,
      body: b.body,
      tags: JSON.stringify(b.tags),
      source_reference: b.sourceReference,
      media_rights: b.mediaRights,
    }),
  },
  {
    path: 'exercises',
    table: 'exercise_contents',
    key: 'exercise',
    schema: exerciseSchema,
    values: (b) => ({
      slug: b.slug,
      category: b.category,
      title: b.title,
      subtitle: b.subtitle,
      duration_seconds: b.durationSeconds,
      instructions: JSON.stringify(b.instructions),
      stop_notice: b.stopNotice,
      audio_url: b.audioUrl || null,
      source_reference: b.sourceReference,
      media_rights: b.mediaRights,
    }),
  },
];

export function createContentAdminRouter({ db, csrf, guard }) {
  const router = express.Router();
  router.use(...guard);
  for (const definition of definitions) {
    const { path, table, key, schema, values } = definition;
    async function audit(trx, req, row, action) {
      await recordAuditEvent(trx, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: `${key}_${action}`,
        targetType: key,
        targetId: row.id,
        outcome: 'success',
        summary: `Konten ${key} v${row.version}, status=${row.status}, aksi=${action}.`,
      });
    }
    router.get(
      `/${path}`,
      asyncHandler(async (req, res) => {
        const rows = await db(table)
          .where({ school_id: req.currentUser.schoolId })
          .orderBy('updated_at', 'desc');
        return sendSuccess(res, { [path]: rows });
      })
    );
    router.post(
      `/${path}`,
      csrf.csrfProtection,
      validateRequest({ body: schema }),
      asyncHandler(async (req, res) => {
        const row = await db.transaction(async (trx) => {
          const [created] = await trx(table)
            .insert({
              ...values(req.validatedBody),
              id: crypto.randomUUID(),
              school_id: req.currentUser.schoolId,
              version: 1,
              status: 'draft',
              reviewer_ref: null,
            })
            .returning('*');
          await audit(trx, req, created, 'created');
          return created;
        });
        return sendSuccess(res, { [key]: row }, 201);
      })
    );
    router.patch(
      `/${path}/:id`,
      csrf.csrfProtection,
      validateRequest({ params: idParamSchema, body: schema }),
      asyncHandler(async (req, res) => {
        const row = await db.transaction(async (trx) => {
          const existing = await trx(table)
            .where({ id: req.validatedParams.id })
            .forUpdate()
            .first();
          assertSameSchool(existing, req.currentUser.schoolId, 'Konten tidak ditemukan.');
          const b = req.validatedBody;
          if (b.version !== undefined && b.version !== existing.version)
            throw conflict('Versi konten telah berubah. Muat ulang editor.');
          const next = values(b);
          const changed = Object.entries(next).some(([field, value]) => {
            const prior =
              typeof existing[field] === 'object' && existing[field] !== null
                ? JSON.stringify(existing[field])
                : existing[field];
            return prior !== value;
          });
          if (!changed) return existing;
          const [updated] = await trx(table)
            .where({ id: existing.id })
            .update({
              ...next,
              version: existing.version + 1,
              status: 'draft',
              reviewer_ref: null,
              ...(key === 'article' ? { published_at: null } : {}),
              updated_at: new Date(),
            })
            .returning('*');
          await audit(trx, req, updated, 'updated');
          return updated;
        });
        return sendSuccess(res, { [key]: row });
      })
    );
    router.patch(
      `/${path}/:id/status`,
      csrf.csrfProtection,
      validateRequest({ params: idParamSchema, body: contentStatusSchema }),
      asyncHandler(async (req, res) => {
        const row = await db.transaction(async (trx) => {
          const existing = await trx(table)
            .where({ id: req.validatedParams.id })
            .forUpdate()
            .first();
          assertSameSchool(existing, req.currentUser.schoolId, 'Konten tidak ditemukan.');
          const b = req.validatedBody;
          if (b.version !== undefined && b.version !== existing.version)
            throw conflict('Versi konten telah berubah. Muat ulang editor.');
          if (!transitions[existing.status]?.includes(b.status))
            throw badRequest('Transisi status konten tidak valid.');
          const reviewer = b.reviewerRef || existing.reviewer_ref;
          if (['approved', 'published'].includes(b.status) && !reviewer)
            throw badRequest('Referensi peninjau wajib diisi.');
          const [updated] = await trx(table)
            .where({ id: existing.id })
            .update({
              status: b.status,
              reviewer_ref: reviewer || null,
              updated_at: new Date(),
              ...(key === 'article'
                ? { published_at: b.status === 'published' ? new Date() : null }
                : {}),
            })
            .returning('*');
          await audit(trx, req, updated, 'status_changed');
          return updated;
        });
        return sendSuccess(res, { [key]: row });
      })
    );
  }
  return router;
}
