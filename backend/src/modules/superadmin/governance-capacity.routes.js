import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { conflict, notFound, forbidden } from '../../lib/errors.js';
import { hashPassword } from '../../lib/password.js';
import { timezoneSchema } from '../../lib/validation.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { recordAuditEvent } from '../audit/audit.service.js';
import { buildGovernanceSeedRows } from './governance-defaults.js';

const reviewPatchSchema = z.object({
  status: z.enum(['pending_review', 'needs_revision', 'approved', 'deferred']),
  reviewerName: z.string().trim().min(2, 'Cantumkan nama peninjau manusia.').max(160),
  reviewerRole: z.enum(['ahli_materi', 'ahli_media', 'guru_bk', 'pengelola_sekolah']),
  decisionNotes: z.string().trim().min(5, 'Catatan keputusan minimal 5 karakter.').max(1500),
  revisionNotes: z.string().trim().max(1500).optional().default(''),
});

const createSchoolSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Z0-9-]+$/, 'Gunakan huruf kapital, angka, atau tanda hubung untuk kode sekolah.'),
  name: z.string().trim().min(3).max(200),
  timezone: timezoneSchema.default('Asia/Jakarta'),
  serviceHours: z.string().trim().max(200).optional().default(''),
  maxStudents: z.coerce.number().int().min(10).max(10000).optional().default(500),
  retentionDays: z.coerce.number().int().min(30).max(365).optional().default(90),
  adminAccountCode: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/),
  adminDisplayName: z.string().trim().min(2).max(120),
  adminLoginEmail: z.string().trim().email().max(200),
  adminPassword: z.string().min(8).max(128),
});

const schoolQuotaSchema = z.object({
  maxStudents: z.coerce.number().int().min(10).max(10000).optional(),
  retentionDays: z.coerce.number().int().min(30).max(365).optional(),
  isActive: z.boolean().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

export function createGovernanceCapacityRouter({ db, env, csrf, guard }) {
  const router = express.Router();
  router.use(...guard);

  // === T73: Workflow Tinjauan Ahli & Pengelola Sekolah ===
  router.get(
    '/governance-reviews',
    asyncHandler(async (req, res) => {
      const reviews = await db('governance_reviews')
        .where({ school_id: req.currentUser.schoolId })
        .orderBy('domain_code', 'asc');

      const approvedCount = reviews.filter((r) => r.status === 'approved').length;
      const totalCount = reviews.length;
      return sendSuccess(res, {
        reviews: reviews.map((r) => ({
          id: r.id,
          domainCode: r.domain_code,
          title: r.title,
          scopeSummary: r.scope_summary,
          status: r.status,
          reviewerName: r.reviewer_name,
          reviewerRole: r.reviewer_role,
          decisionNotes: r.decision_notes,
          revisionNotes: r.revision_notes,
          reviewedAt: r.reviewed_at,
          version: r.version,
          updatedAt: r.updated_at,
        })),
        approvedCount,
        totalCount,
        pilotGateReady: totalCount > 0 && approvedCount === totalCount,
      });
    })
  );

  router.patch(
    '/governance-reviews/:id',
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: reviewPatchSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('governance_reviews')
        .where({ id: req.validatedParams.id, school_id: req.currentUser.schoolId })
        .first();
      if (!existing) throw notFound('Item tinjauan T73 tidak ditemukan.');

      const b = req.validatedBody;
      const now = new Date();
      const [updated] = await db.transaction(async (trx) => {
        const rows = await trx('governance_reviews')
          .where({ id: existing.id })
          .update({
            status: b.status,
            reviewer_name: b.reviewerName,
            reviewer_role: b.reviewerRole,
            decision_notes: b.decisionNotes,
            revision_notes: b.revisionNotes || null,
            reviewed_at: b.status === 'pending_review' ? null : now,
            updated_by_user_id: req.currentUser.id,
            version: existing.version + 1,
            updated_at: now,
          })
          .returning('*');

        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'governance_review_updated',
          targetType: 'governance_review',
          targetId: existing.domain_code,
          outcome: 'success',
          summary: `Catatan tinjauan ${existing.domain_code} diperbarui menjadi ${b.status} (peninjau: ${b.reviewerName}).`,
        });

        return rows;
      });

      return sendSuccess(res, {
        review: {
          id: updated.id,
          domainCode: updated.domain_code,
          title: updated.title,
          scopeSummary: updated.scope_summary,
          status: updated.status,
          reviewerName: updated.reviewer_name,
          reviewerRole: updated.reviewer_role,
          decisionNotes: updated.decision_notes,
          revisionNotes: updated.revision_notes,
          reviewedAt: updated.reviewed_at,
          version: updated.version,
        },
      });
    })
  );

  // === L05: Telemetri Kapasitas & Perluasan Multi-Sekolah ===
  router.get(
    '/capacity',
    asyncHandler(async (req, res) => {
      const schoolId = req.currentUser.schoolId;
      const [school, roleCounts, pushCount, metaCount, snapshotCount, auditCount] =
        await Promise.all([
          db('schools').where({ id: schoolId }).first(),
          db('users')
            .where({ school_id: schoolId })
            .select('role')
            .count('id as count')
            .groupBy('role'),
          db('push_subscriptions')
            .where({ school_id: schoolId, is_active: true })
            .count('id as count')
            .first(),
          db('activity_metadata_events')
            .where({ school_id: schoolId })
            .count('id as count')
            .first(),
          db('aggregate_snapshots').where({ school_id: schoolId }).count('id as count').first(),
          db('audit_events').where({ school_id: schoolId }).count('id as count').first(),
        ]);

      const byRole = Object.fromEntries(roleCounts.map((r) => [r.role, Number(r.count)]));
      const studentCount = byRole.student || 0;
      const maxStudents = Number(school?.max_students || 500);
      const pool = db.client?.pool;

      return sendSuccess(res, {
        appMode: env.APP_MODE,
        pool: {
          min: env.DB_POOL_MIN,
          max: env.DB_POOL_MAX,
          statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
          used: typeof pool?.numUsed === 'function' ? pool.numUsed() : 0,
          free: typeof pool?.numFree === 'function' ? pool.numFree() : 0,
          pendingAcquires:
            typeof pool?.numPendingAcquires === 'function' ? pool.numPendingAcquires() : 0,
        },
        schoolQuota: {
          schoolCode: school?.code,
          studentCount,
          bkCount: byRole.bk || 0,
          superadminCount: byRole.superadmin || 0,
          maxStudents,
          quotaUsagePct: Math.min(100, Math.round((studentCount / Math.max(maxStudents, 1)) * 100)),
          retentionDays: Number(school?.retention_days || 90),
          isActive: Boolean(school?.is_active),
        },
        volume: {
          activePushSubscriptions: Number(pushCount?.count || 0),
          activityMetadataEvents: Number(metaCount?.count || 0),
          aggregateSnapshots: Number(snapshotCount?.count || 0),
          auditEvents: Number(auditCount?.count || 0),
        },
      });
    })
  );

  router.get(
    '/schools',
    asyncHandler(async (_req, res) => {
      const [schools, userCounts] = await Promise.all([
        db('schools').orderBy('created_at', 'asc'),
        db('users').select('school_id', 'role').count('id as count').groupBy('school_id', 'role'),
      ]);

      const countMap = new Map();
      for (const row of userCounts) {
        if (!countMap.has(row.school_id)) {
          countMap.set(row.school_id, { student: 0, bk: 0, superadmin: 0 });
        }
        countMap.get(row.school_id)[row.role] = Number(row.count);
      }

      return sendSuccess(res, {
        schools: schools.map((s) => {
          const counts = countMap.get(s.id) || { student: 0, bk: 0, superadmin: 0 };
          return {
            id: s.id,
            code: s.code,
            name: s.name,
            timezone: s.timezone,
            serviceHours: s.service_hours,
            maxStudents: s.max_students,
            retentionDays: s.retention_days,
            isActive: Boolean(s.is_active),
            counts,
            createdAt: s.created_at,
          };
        }),
      });
    })
  );

  router.post(
    '/schools',
    csrf.csrfProtection,
    validateRequest({ body: createSchoolSchema }),
    asyncHandler(async (req, res) => {
      const b = req.validatedBody;
      const existing = await db('schools')
        .whereRaw('LOWER(code) = ?', [b.code.toLowerCase()])
        .first();
      if (existing) {
        throw conflict('Kode sekolah sudah terdaftar.');
      }

      const schoolId = crypto.randomUUID();
      const adminId = crypto.randomUUID();
      const passwordHash = await hashPassword(b.adminPassword, env.isTest);

      await db.transaction(async (trx) => {
        await trx('schools').insert({
          id: schoolId,
          code: b.code,
          name: b.name,
          timezone: b.timezone,
          service_hours: b.serviceHours,
          verified_contacts: JSON.stringify([]),
          guardian_consent_required: false,
          personal_access_mode: env.isTest ? 'consent' : 'account_approval',
          active_handler_configured: true,
          max_students: b.maxStudents,
          retention_days: b.retentionDays,
          is_active: true,
        });

        if (env.isTest)
          await trx('consent_policies').insert({
            id: crypto.randomUUID(),
            school_id: schoolId,
            version: '1.1',
            title: `Persetujuan Pengelolaan Data & Ruang Aman — ${b.name}`,
            summary:
              'Catatan pribadi digunakan untuk regulasi emosi. Catatan dapat diakses olehmu dan Superadmin sekolah; Guru BK hanya membaca metadata aktivitas.',
            full_policy_text:
              '1. Tujuan: membantu regulasi emosi siswa secara sukarela.\n2. Hak Akses: catatan pribadi dapat diakses oleh pemilik dan Superadmin berizin (tercatat audit). BK hanya memantau metadata dan agregat k >= 5.',
            data_access_notice:
              'Catatan dapat diakses olehmu dan Superadmin. BK hanya melihat aktivitas penggunaan.',
            effective_date: new Date().toISOString().slice(0, 10),
            is_active: true,
            created_by_user_id: req.currentUser.id,
          });

        await trx('governance_reviews').insert(buildGovernanceSeedRows(crypto, schoolId));

        await trx('users').insert({
          id: adminId,
          school_id: schoolId,
          account_code: b.adminAccountCode,
          login_email: b.adminLoginEmail ? b.adminLoginEmail.toLowerCase() : null,
          display_name: b.adminDisplayName,
          role: 'superadmin',
          status: 'active',
          password_hash: passwordHash,
          password_changed_at: new Date(),
          grade_group: null,
          mfa_enabled: false,
        });

        await recordAuditEvent(trx, {
          schoolId: req.currentUser.schoolId,
          actorUserId: req.currentUser.id,
          actorCode: req.currentUser.accountCode,
          actorRole: 'superadmin',
          action: 'school_provisioned',
          targetType: 'school',
          targetId: schoolId,
          outcome: 'success',
          summary: `Sekolah mitra baru ${b.code} (${b.name}) diprovisioning dengan admin awal ${b.adminAccountCode}.`,
        });
      });

      return sendSuccess(
        res,
        {
          school: {
            id: schoolId,
            code: b.code,
            name: b.name,
            timezone: b.timezone,
            maxStudents: b.maxStudents,
            retentionDays: b.retentionDays,
          },
          initialAdmin: {
            id: adminId,
            accountCode: b.adminAccountCode,
          },
          note: 'Admin awal dibuat dan diaktifkan oleh Superadmin menggunakan sandi yang ditetapkan.',
        },
        201
      );
    })
  );

  router.patch(
    '/schools/:id/quota',
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema, body: schoolQuotaSchema }),
    asyncHandler(async (req, res) => {
      const target = await db('schools').where({ id: req.validatedParams.id }).first();
      if (!target) throw notFound('Sekolah tidak ditemukan.');

      const b = req.validatedBody;
      const [updated] = await db('schools')
        .where({ id: target.id })
        .update({
          ...(b.maxStudents !== undefined ? { max_students: b.maxStudents } : {}),
          ...(b.retentionDays !== undefined ? { retention_days: b.retentionDays } : {}),
          ...(b.isActive !== undefined ? { is_active: b.isActive } : {}),
          updated_at: new Date(),
        })
        .returning('*');

      await recordAuditEvent(db, {
        schoolId: req.currentUser.schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'school_quota_updated',
        targetType: 'school',
        targetId: updated.id,
        outcome: 'success',
        summary: `Kuota sekolah ${updated.code} diperbarui (maxStudents=${updated.max_students}, retensi=${updated.retention_days} hari, aktif=${updated.is_active}).`,
      });

      return sendSuccess(res, {
        school: {
          id: updated.id,
          code: updated.code,
          maxStudents: updated.max_students,
          retentionDays: updated.retention_days,
          isActive: Boolean(updated.is_active),
        },
      });
    })
  );

  // === T73 Domain D2: Pengelolaan & Template Instrumen Skrining Validasi Ahli ===
  router.get(
    '/screening-instruments',
    asyncHandler(async (req, res) => {
      const rows = await db('screening_instruments')
        .where({ school_id: req.currentUser.schoolId })
        .orderBy('created_at', 'desc');

      return sendSuccess(res, {
        instruments: rows.map((r) => ({
          id: r.id,
          code: r.code,
          version: r.version,
          title: r.title,
          description: r.description,
          referencePeriod: r.reference_period,
          isSimulation: Boolean(r.is_simulation),
          isApproved: Boolean(r.is_approved),
          approvalRef: r.approval_ref,
          status: r.status,
          itemCount: Array.isArray(r.items) ? r.items.length : 0,
          createdAt: r.created_at,
        })),
        hasApprovedInstrument: rows.some(
          (r) => r.is_approved && !r.is_simulation && r.status === 'active'
        ),
      });
    })
  );

  router.post(
    '/screening-instruments/deploy-validated-template',
    csrf.csrfProtection,
    asyncHandler(async (req, res) => {
      if (!env.isTest || env.APP_MODE !== 'demo')
        throw forbidden(
          'Template uji tidak dapat diaktifkan pada layanan nyata. Gunakan instrumen dengan pengesahan ahli dan hak penggunaan yang terverifikasi.'
        );
      const { PILOT_VALIDATED_SCREENING_TEMPLATE: tmpl } =
        await import('../../../database/fixtures/pilot-screening-template.js');
      const schoolId = req.currentUser.schoolId;
      const approvalRef =
        (typeof req.body?.approvalRef === 'string' && req.body.approvalRef.trim()) ||
        tmpl.approval_ref;

      const [deployed] = await db('screening_instruments')
        .insert({
          id: crypto.randomUUID(),
          school_id: schoolId,
          code: tmpl.code,
          version: tmpl.version,
          title: tmpl.title,
          description: tmpl.description,
          reference_period: tmpl.reference_period,
          is_simulation: false,
          is_approved: true,
          approval_ref: approvalRef,
          status: 'active',
          items: JSON.stringify(tmpl.items),
          scoring_rules: JSON.stringify(tmpl.scoring_rules),
        })
        .onConflict(['school_id', 'code', 'version'])
        .merge({
          title: tmpl.title,
          description: tmpl.description,
          reference_period: tmpl.reference_period,
          is_simulation: false,
          is_approved: true,
          approval_ref: approvalRef,
          status: 'active',
          items: JSON.stringify(tmpl.items),
          scoring_rules: JSON.stringify(tmpl.scoring_rules),
          updated_at: new Date(),
        })
        .returning('*');

      await recordAuditEvent(db, {
        schoolId,
        actorUserId: req.currentUser.id,
        actorCode: req.currentUser.accountCode,
        actorRole: 'superadmin',
        action: 'screening_instrument_deployed',
        targetType: 'screening_instrument',
        targetId: deployed.id,
        outcome: 'success',
        summary: `Superadmin memasang instrumen tervalidasi "${deployed.title}" (ref: ${approvalRef}).`,
      });

      return sendSuccess(
        res,
        {
          instrument: {
            id: deployed.id,
            code: deployed.code,
            version: deployed.version,
            title: deployed.title,
            isApproved: Boolean(deployed.is_approved),
            approvalRef: deployed.approval_ref,
            status: deployed.status,
          },
          message: 'Template instrumen skrining tervalidasi berhasil dipasang untuk sekolah ini.',
        },
        201
      );
    })
  );

  return router;
}
