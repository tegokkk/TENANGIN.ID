import express from 'express';
import { asyncHandler, sendSuccess } from '../../lib/response.js';

export function createGroupFeedbackRouter({ db, authenticate, authorize, requireConsent }) {
  const router = express.Router();

  router.get(
    '/',
    authenticate,
    authorize(['student']),
    requireConsent,
    asyncHandler(async (req, res) => {
      const targetGroups = ['Semua Siswa'];
      if (req.currentUser.gradeGroup) {
        targetGroups.push(req.currentUser.gradeGroup);
      }

      const rows = await db('group_feedback')
        .where({
          school_id: req.currentUser.schoolId,
          status: 'published',
        })
        .whereIn('target_group', targetGroups)
        .orderBy('published_at', 'desc')
        .limit(10);

      return sendSuccess(res, {
        messages: rows.map((r) => ({
          id: r.id,
          targetGroup: r.target_group,
          periodLabel: r.period_label,
          title: r.title,
          body: r.body,
          publishedAt: r.published_at,
        })),
      });
    })
  );

  return router;
}
