import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { forbidden } from '../../lib/errors.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  extractAssignedGroups,
  getActiveCounselorAssignments,
} from '../../policies/bk-assignment.policy.js';
import { MIN_K_THRESHOLD } from '../../policies/aggregate-privacy.policy.js';
import { getSuppressedSnapshotsForSchool } from './aggregate-computation.service.js';
import { presentBkActivityMetadata } from './bk.presenter.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { eligibleStudentIds } from '../../policies/consent-eligibility.policy.js';

const activitiesQuerySchema = z.object({
  activityType: z
    .enum([
      'ALL',
      'mood',
      'screening',
      'journal',
      'exercise',
      'planner',
      'reflection',
      'help_request',
    ])
    .optional()
    .default('ALL'),
  gradeGroup: z.string().trim().max(64).optional(),
  q: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export function createBkRouter({ db, authenticate, requireMfa, authorize }) {
  const router = express.Router();
  const bkGuard = [authenticate, requireMfa, authorize(['bk'])];

  // BK bersifat strictly read-only untuk seluruh data bisnis
  router.use((req, _res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next(forbidden('Guru BK hanya memiliki akses pemantauan (read-only).'));
    }
    return next();
  });

  router.get(
    '/dashboard',
    ...bkGuard,
    asyncHandler(async (req, res) => {
      const assignments = await getActiveCounselorAssignments(
        db,
        req.currentUser.id,
        req.currentUser.schoolId
      );
      const assignedGroups = extractAssignedGroups(assignments);

      if (assignedGroups.length === 0) {
        return sendSuccess(res, {
          counselor: {
            accountCode: req.currentUser.accountCode,
            displayName: req.currentUser.displayName,
            assignedGroups: [],
          },
          suppressionThreshold: MIN_K_THRESHOLD,
          snapshotsByGroup: {},
          snapshots: [],
          metricDefinitions: {
            weekly_active_students:
              'Jumlah siswa berbeda dengan minimal 1 aktivitas inti tersimpan pada minggu kalender selesai.',
            weekly_mood_average:
              'Rerata skor mood mingguan per siswa, lalu dirata-rata antar siswa (bukan skor klinis).',
            weekly_exercise_participants:
              'Jumlah siswa berbeda yang menyelesaikan minimal 1 latihan pada minggu tersebut.',
            weekly_reflections:
              'Jumlah siswa berbeda yang menyimpan refleksi mingguan, tanpa isi jawaban teks.',
          },
        });
      }

      const school = await db('schools').where({ id: req.currentUser.schoolId }).first();
      const { weekStart, weekEnd, snapshots, snapshotsByGroup } =
        await getSuppressedSnapshotsForSchool(db, {
          schoolId: req.currentUser.schoolId,
          timezone: school?.timezone || 'Asia/Jakarta',
          assignedGroups,
        });

      return sendSuccess(res, {
        counselor: {
          accountCode: req.currentUser.accountCode,
          displayName: req.currentUser.displayName,
          assignedGroups,
          assignments: assignments.map((a) => ({
            id: a.id,
            gradeGroup: a.grade_group,
            periodLabel: a.period_label,
          })),
        },
        weekStart,
        weekEnd,
        suppressionThreshold: MIN_K_THRESHOLD,
        snapshots,
        snapshotsByGroup,
        metricDefinitions: {
          weekly_active_students:
            'Siswa berbeda dengan >= 1 aktivitas inti tersimpan pada minggu selesai.',
          weekly_mood_average:
            'Rerata suasana hati per siswa per minggu lalu dirata-rata antar siswa (bukan instrumen klinis).',
          weekly_exercise_participants:
            'Siswa berbeda yang menyelesaikan >= 1 latihan menenangkan diri.',
          weekly_reflections:
            'Siswa berbeda yang menyimpan refleksi mingguan (tanpa teks jawaban).',
        },
      });
    })
  );

  router.get(
    '/activities',
    ...bkGuard,
    validateRequest({ query: activitiesQuerySchema }),
    asyncHandler(async (req, res) => {
      const assignments = await getActiveCounselorAssignments(
        db,
        req.currentUser.id,
        req.currentUser.schoolId
      );
      const assignedGroups = extractAssignedGroups(assignments);

      if (assignedGroups.length === 0) {
        return sendSuccess(res, {
          activities: [],
          pagination: { page: 1, limit: 20, total: 0 },
          assignedGroups: [],
        });
      }

      const { activityType, gradeGroup, q, page, limit } = req.validatedQuery;

      if (
        gradeGroup &&
        gradeGroup !== 'ALL' &&
        !assignedGroups.includes('Semua Siswa') &&
        !assignedGroups.includes(gradeGroup)
      ) {
        await recordAuditEvent(db, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'bk',
          action: 'authorization_denied',
          targetType: 'bk_activities_scope',
          targetId: gradeGroup,
          outcome: 'denied',
          summary: `BK ${req.currentUser.accountCode} mencoba memfilter kelompok di luar penugasan (${gradeGroup}).`,
        });
        throw forbidden('Kelompok tersebut di luar penugasanmu.');
      }

      const baseQuery = db('activity_metadata_events as e')
        .join('users as u', 'e.user_id', 'u.id')
        .where({ 'e.school_id': req.currentUser.schoolId, 'u.role': 'student' });
      baseQuery.whereIn('u.id', eligibleStudentIds(db, req.currentUser.schoolId));

      if (!assignedGroups.includes('Semua Siswa')) {
        baseQuery.whereIn('e.grade_group', assignedGroups);
      }
      if (gradeGroup && gradeGroup !== 'ALL') {
        baseQuery.andWhere('e.grade_group', gradeGroup);
      }
      if (activityType && activityType !== 'ALL') {
        baseQuery.andWhere('e.activity_type', activityType);
      }
      if (q) {
        baseQuery.andWhereRaw('LOWER(u.account_code) LIKE ?', [`%${q.toLowerCase()}%`]);
      }

      const countRow = await baseQuery.clone().count('e.id as total').first();
      const total = Number(countRow?.total || 0);

      const rows = await baseQuery
        .select(
          'e.id',
          'u.account_code',
          'e.grade_group',
          'e.activity_type',
          'e.activity_label',
          'e.status_label',
          'e.duration_seconds',
          'e.local_date',
          'e.occurred_at'
        )
        .orderBy('e.occurred_at', 'desc')
        .limit(limit)
        .offset((page - 1) * limit);

      return sendSuccess(res, {
        activities: rows.map(presentBkActivityMetadata),
        pagination: { page, limit, total },
        assignedGroups,
      });
    })
  );

  // Semua rute mutasi atau tak dikenal di bawah /api/bk ditolak eksplisit untuk BK
  router.all('*', ...bkGuard, async (req, _res, next) => {
    await recordAuditEvent(db, {
      schoolId: req.currentUser.schoolId,
      actorUserId: req.currentUser.id,
      actorCode: req.currentUser.accountCode,
      actorRole: 'bk',
      action: 'authorization_denied',
      targetType: 'bk_route',
      targetId: req.originalUrl?.slice(0, 180) || req.path,
      outcome: 'denied',
      summary: `BK mencoba mengakses endpoint terlarang (${req.method}).`,
    });
    return next(forbidden());
  });

  return router;
}
