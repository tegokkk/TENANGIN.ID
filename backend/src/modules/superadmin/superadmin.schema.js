import { z } from 'zod';
import { timezoneSchema } from '../../lib/validation.js';

export const createUserSchema = z.object({
  accountCode: z
    .string()
    .trim()
    .min(3, 'Kode akun minimal 3 karakter.')
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Gunakan huruf, angka, titik, garis bawah, atau tanda hubung.'),
  loginEmail: z.string().trim().email().max(200).nullable().optional(),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(['student', 'bk', 'superadmin']),
  nisn: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'NISN harus 10 digit.')
    .nullable()
    .optional(),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(128),
  gradeGroup: z.string().trim().max(64).nullable().optional(),
});

export const patchUserSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['student', 'bk', 'superadmin']).optional(),
  status: z.enum(['pending_activation', 'active', 'inactive']).optional(),
  gradeGroup: z.string().trim().max(64).nullable().optional(),
  loginEmail: z.string().trim().email().max(200).nullable().optional(),
});

export const assignmentSchema = z.object({
  counselorUserId: z.string().uuid(),
  gradeGroup: z.string().trim().min(1).max(64),
  periodLabel: z.string().trim().min(2).max(120),
  isActive: z.boolean().optional().default(true),
});

export const patchAssignmentSchema = z.object({
  gradeGroup: z.string().trim().min(1).max(64).optional(),
  periodLabel: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
});

export const superadminJournalPatchSchema = z.object({
  version: z.number().int().min(1),
  situation: z.string().trim().min(1).max(2000),
  thoughts: z.string().trim().min(1).max(2000),
  feelings: z.string().trim().min(1).max(2000),
  emotionTags: z.array(z.string().trim().max(40)).max(10).optional().default([]),
  alternative: z.string().trim().max(2000).optional().default(''),
  reason: z.string().trim().min(3, 'Cantumkan alasan audit untuk perubahan data pribadi.').max(200),
});

export const articleSchema = z.object({
  version: z.number().int().min(1).optional(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(140)
    .regex(/^[a-z0-9-]+$/),
  topic: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(5).max(400),
  body: z.string().trim().min(10).max(20000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  sourceReference: z.string().trim().min(2).max(300),
  mediaRights: z.string().trim().min(2).max(200),
  reviewerRef: z.string().trim().max(160).nullable().optional(),
  substantiveChange: z.boolean().optional().default(false),
  publishNow: z.boolean().optional().default(false),
});

export const exerciseSchema = z.object({
  version: z.number().int().min(1).optional(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  category: z.enum(['breathing', 'muscle_relaxation', 'mindfulness']),
  title: z.string().trim().min(3).max(200),
  subtitle: z.string().trim().min(3).max(260),
  durationSeconds: z.number().int().min(30).max(1800),
  instructions: z
    .array(
      z.object({
        phase: z.string().trim().min(1).max(80),
        seconds: z.number().int().min(1).max(120),
        quote: z.string().trim().min(1).max(300),
        detail: z.string().trim().max(400).optional().default(''),
      })
    )
    .min(1)
    .max(20),
  stopNotice: z.string().trim().min(5).max(400),
  audioUrl: z.string().trim().max(300).nullable().optional(),
  sourceReference: z.string().trim().min(2).max(300),
  mediaRights: z.string().trim().min(2).max(200),
  reviewerRef: z.string().trim().max(160).nullable().optional(),
  substantiveChange: z.boolean().optional().default(false),
  publishNow: z.boolean().optional().default(false),
});

export const contentStatusSchema = z.object({
  version: z.number().int().min(1).optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'published', 'archived']),
  reviewerRef: z.string().trim().max(160).nullable().optional(),
});

export const helpStatusSchema = z.object({
  status: z.enum(['acknowledged', 'follow_up', 'closed']),
  note: z.string().trim().max(300).optional(),
});

export const helpAckSchema = z.object({
  message: z.string().trim().min(3, 'Pesan respons administratif wajib diisi.').max(1500),
  locationInfo: z.string().trim().max(200).nullable().optional(),
  scheduleInfo: z.string().trim().max(200).nullable().optional(),
});

export const groupFeedbackSchema = z.object({
  targetGroup: z.string().trim().min(2).max(64),
  periodLabel: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(5).max(2000),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
});

export const schoolSettingsSchema = z.object({
  name: z.string().trim().min(2).max(200),
  timezone: timezoneSchema,
  serviceHours: z.string().trim().max(200),
  verifiedContacts: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        value: z.string().trim().min(1).max(160),
        note: z.string().trim().max(300).optional().default(''),
      })
    )
    .max(10),
  guardianConsentRequired: z.boolean(),
  activeHandlerConfigured: z.boolean(),
  personalAccessMode: z.enum(['account_approval', 'consent']).optional(),
});

export const newConsentPolicySchema = z.object({
  version: z.string().trim().min(1).max(32),
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(10).max(1000),
  fullPolicyText: z.string().trim().min(20).max(10000),
  dataAccessNotice: z.string().trim().min(5).max(300),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
export const studentChildParamSchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
});
