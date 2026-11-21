import express from 'express';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { notFound } from '../../lib/errors.js';
import { resolveTargetSchool } from '../../lib/public-catalog.js';

function presentArticle(row) {
  return {
    id: row.id,
    slug: row.slug,
    topic: row.topic,
    title: row.title,
    summary: row.summary,
    body: row.body,
    tags: Array.isArray(row.tags) ? row.tags : [],
    version: row.version,
    sourceReference: row.source_reference,
    mediaRights: row.media_rights,
    reviewerRef: row.reviewer_ref,
    publishedAt: row.published_at,
  };
}

export function createLibraryRouter({ db, authenticate, requireMfa }) {
  const router = express.Router();
  router.use(authenticate, requireMfa);

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const q = String(req.query.q || '')
        .trim()
        .toLowerCase();
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const school = await resolveTargetSchool(db, req);

      const query = db('articles')
        .where({ status: 'published' })
        .orderBy('published_at', 'desc')
        .orderBy('created_at', 'asc');
      if (school) {
        query.andWhere({ school_id: school.id });
      }
      const rows = await query;

      const filtered = q
        ? rows.filter((row) => {
            const tags = Array.isArray(row.tags) ? row.tags : [];
            return (
              row.title.toLowerCase().includes(q) ||
              row.topic.toLowerCase().includes(q) ||
              row.summary.toLowerCase().includes(q) ||
              tags.some((t) => String(t).toLowerCase().includes(q))
            );
          })
        : rows;

      return sendSuccess(res, {
        articles: filtered.slice(0, limit).map(presentArticle),
        total: filtered.length,
        suggestedTopics: ['stres', 'emosi', 'pikiran', 'beban', 'tidur', 'bantuan'],
      });
    })
  );

  router.get(
    '/:slug',
    asyncHandler(async (req, res) => {
      const school = await resolveTargetSchool(db, req);
      const query = db('articles')
        .where({ slug: req.params.slug, status: 'published' })
        .orderBy('version', 'desc');
      if (school) {
        query.andWhere({ school_id: school.id });
      }
      const row = await query.first();

      if (!row) {
        throw notFound('Materi pustaka tidak ditemukan.');
      }

      return sendSuccess(res, { article: presentArticle(row) });
    })
  );

  return router;
}
