import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { getLocalDateString } from '../../lib/time.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertOwnership } from '../../policies/ownership.policy.js';
import { recordActivityMetadata } from '../dashboard/activity-metadata.service.js';

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Judul tugas wajib diisi.').max(120, 'Judul maksimal 120 karakter.'),
  notes: z.string().trim().max(500).nullable().optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  estimatedMinutes: z.number().int().min(1).max(600).nullable().optional(),
  isImportant: z.boolean().optional().default(false),
  isUrgent: z.boolean().optional().default(false),
});

const patchTaskSchema = taskSchema.partial().extend({
  status: z.enum(['pending', 'completed']).optional(),
});

const stepSchema = z.object({
  title: z.string().trim().min(1, 'Langkah kecil wajib diisi.').max(160),
});

const patchStepSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  isDone: z.boolean().optional(),
});

export const scheduleBlockSchema = z.object({
  blockType: z.enum(['rest', 'sleep']),
  title: z.string().trim().min(1, 'Judul blok istirahat wajib diisi.').max(120),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const idParamSchema = z.object({ id: z.string().uuid() });
const stepParamSchema = z.object({ id: z.string().uuid(), stepId: z.string().uuid() });

function presentTask(row, steps = []) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    targetDate: row.target_date,
    estimatedMinutes: row.estimated_minutes,
    isImportant: Boolean(row.is_important),
    isUrgent: Boolean(row.is_urgent),
    status: row.status,
    completedAt: row.completed_at,
    steps: steps.map((s) => ({
      id: s.id,
      taskId: s.task_id,
      title: s.title,
      sortOrder: s.sort_order,
      isDone: Boolean(s.is_done),
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTasksRouter({ db, csrf, authenticate, authorize, requireConsent }) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  router.get(
    '/',
    ...guard,
    asyncHandler(async (req, res) => {
      const tasks = await db('tasks')
        .where({ user_id: req.currentUser.id })
        .orderByRaw('CASE WHEN status = \'pending\' THEN 0 ELSE 1 END, target_date ASC NULLS LAST, created_at DESC');

      const taskIds = tasks.map((t) => t.id);
      const steps =
        taskIds.length > 0
          ? await db('task_steps').whereIn('task_id', taskIds).orderBy('sort_order', 'asc')
          : [];

      const stepsMap = new Map();
      for (const s of steps) {
        if (!stepsMap.has(s.task_id)) stepsMap.set(s.task_id, []);
        stepsMap.get(s.task_id).push(s);
      }

      return sendSuccess(res, {
        tasks: tasks.map((t) => presentTask(t, stepsMap.get(t.id) || [])),
      });
    })
  );

  router.post(
    '/',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: taskSchema }),
    asyncHandler(async (req, res) => {
      const school = await db('schools').select('timezone').where({ id: req.currentUser.schoolId }).first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const localDate = getLocalDateString(new Date(), tz);
      const b = req.validatedBody;

      const created = await db.transaction(async (trx) => {
        const [row] = await trx('tasks')
          .insert({
            id: crypto.randomUUID(),
            school_id: req.currentUser.schoolId,
            user_id: req.currentUser.id,
            title: b.title,
            notes: b.notes || null,
            target_date: b.targetDate || null,
            estimated_minutes: b.estimatedMinutes || null,
            is_important: Boolean(b.isImportant),
            is_urgent: Boolean(b.isUrgent),
            status: 'pending',
          })
          .returning('*');

        await recordActivityMetadata(trx, {
          user: req.currentUser,
          activityType: 'planner',
          activityLabel: 'Perencana Tugas Belajar',
          statusLabel: 'Disimpan',
          localDate,
        });

        return row;
      });

      return sendSuccess(res, { task: presentTask(created, []) }, 201);
    })
  );

  router.patch(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: patchTaskSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('tasks').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Tugas tidak ditemukan.');

      const b = req.validatedBody;
      const updatePayload = { updated_at: new Date() };
      if (b.title !== undefined) updatePayload.title = b.title;
      if (b.notes !== undefined) updatePayload.notes = b.notes;
      if (b.targetDate !== undefined) updatePayload.target_date = b.targetDate;
      if (b.estimatedMinutes !== undefined) updatePayload.estimated_minutes = b.estimatedMinutes;
      if (b.isImportant !== undefined) updatePayload.is_important = b.isImportant;
      if (b.isUrgent !== undefined) updatePayload.is_urgent = b.isUrgent;
      if (b.status !== undefined) {
        updatePayload.status = b.status;
        updatePayload.completed_at = b.status === 'completed' ? new Date() : null;
      }

      const [updated] = await db('tasks').where({ id: existing.id }).update(updatePayload).returning('*');
      const steps = await db('task_steps').where({ task_id: updated.id }).orderBy('sort_order', 'asc');
      return sendSuccess(res, { task: presentTask(updated, steps) });
    })
  );

  router.delete(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('tasks').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Tugas tidak ditemukan.');
      await db('tasks').where({ id: existing.id }).del();
      return sendSuccess(res, { deleted: true });
    })
  );

  router.post(
    '/:id/steps',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: stepSchema }),
    asyncHandler(async (req, res) => {
      const task = await db('tasks').where({ id: req.validatedParams.id }).first();
      assertOwnership(task, req.currentUser.id, 'Tugas tidak ditemukan.');

      const countRow = await db('task_steps').where({ task_id: task.id }).count('* as cnt').first();
      const sortOrder = Number(countRow?.cnt || 0) + 1;

      const [step] = await db('task_steps')
        .insert({
          id: crypto.randomUUID(),
          task_id: task.id,
          user_id: req.currentUser.id,
          title: req.validatedBody.title,
          sort_order: sortOrder,
          is_done: false,
        })
        .returning('*');

      return sendSuccess(
        res,
        {
          step: {
            id: step.id,
            taskId: step.task_id,
            title: step.title,
            sortOrder: step.sort_order,
            isDone: Boolean(step.is_done),
          },
        },
        201
      );
    })
  );

  router.patch(
    '/:id/steps/:stepId',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: stepParamSchema, body: patchStepSchema }),
    asyncHandler(async (req, res) => {
      const step = await db('task_steps')
        .where({ id: req.validatedParams.stepId, task_id: req.validatedParams.id })
        .first();
      assertOwnership(step, req.currentUser.id, 'Langkah tugas tidak ditemukan.');

      const updateFields = { updated_at: new Date() };
      if (req.validatedBody.title !== undefined) updateFields.title = req.validatedBody.title;
      if (req.validatedBody.isDone !== undefined) updateFields.is_done = req.validatedBody.isDone;

      const [updated] = await db('task_steps').where({ id: step.id }).update(updateFields).returning('*');
      return sendSuccess(res, {
        step: {
          id: updated.id,
          taskId: updated.task_id,
          title: updated.title,
          sortOrder: updated.sort_order,
          isDone: Boolean(updated.is_done),
        },
      });
    })
  );

  router.delete(
    '/:id/steps/:stepId',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: stepParamSchema }),
    asyncHandler(async (req, res) => {
      const step = await db('task_steps')
        .where({ id: req.validatedParams.stepId, task_id: req.validatedParams.id })
        .first();
      assertOwnership(step, req.currentUser.id, 'Langkah tugas tidak ditemukan.');
      await db('task_steps').where({ id: step.id }).del();
      return sendSuccess(res, { deleted: true });
    })
  );

  return router;
}

export function createScheduleBlocksRouter({ db, csrf, authenticate, authorize, requireConsent }) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  router.get(
    '/',
    ...guard,
    asyncHandler(async (req, res) => {
      const rows = await db('schedule_blocks')
        .where({ user_id: req.currentUser.id })
        .orderBy('local_date', 'desc')
        .orderBy('start_time', 'asc')
        .limit(30);

      return sendSuccess(res, {
        blocks: rows.map((r) => ({
          id: r.id,
          blockType: r.block_type,
          title: r.title,
          localDate: r.local_date,
          startTime: r.start_time,
          endTime: r.end_time,
        })),
      });
    })
  );

  router.post(
    '/',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: scheduleBlockSchema }),
    asyncHandler(async (req, res) => {
      const school = await db('schools').select('timezone').where({ id: req.currentUser.schoolId }).first();
      const tz = school?.timezone || 'Asia/Jakarta';
      const b = req.validatedBody;
      const localDate = b.localDate || getLocalDateString(new Date(), tz);

      const [row] = await db('schedule_blocks')
        .insert({
          id: crypto.randomUUID(),
          school_id: req.currentUser.schoolId,
          user_id: req.currentUser.id,
          block_type: b.blockType,
          title: b.title,
          local_date: localDate,
          start_time: b.startTime,
          end_time: b.endTime,
        })
        .returning('*');

      return sendSuccess(
        res,
        {
          block: {
            id: row.id,
            blockType: row.block_type,
            title: row.title,
            localDate: row.local_date,
            startTime: row.start_time,
            endTime: row.end_time,
          },
        },
        201
      );
    })
  );

  router.delete(
    '/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('schedule_blocks').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Blok istirahat tidak ditemukan.');
      await db('schedule_blocks').where({ id: existing.id }).del();
      return sendSuccess(res, { deleted: true });
    })
  );

  return router;
}
