import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { createTestContext } from '../setup/test-app.js';
import { computeWeeklySnapshots } from '../../src/modules/dashboard/aggregate-computation.service.js';
import { getWeekBounds, getLastCompletedWeekStart } from '../../src/lib/time.js';
import { runRetentionCleanup } from '../../src/modules/superadmin/superadmin.routes.js';
import { exportEncryptedBackup, restoreEncryptedBackup } from '../../scripts/backup-restore.mjs';
import { hashToken } from '../../src/lib/idempotency.js';

describe('Regresi audit: izin, penghapusan, MFA, editorial, dan kontrol Superadmin', () => {
  let ctx;
  beforeAll(() => {
    ctx = createTestContext();
  });
  beforeEach(async () => {
    await ctx.resetAndSeed();
  });
  afterAll(async () => {
    await ctx.teardown();
  });
  async function login(role = 'student') {
    const client = await ctx.createAgent();
    const info =
      role === 'student'
        ? ['awan-028', 'SiswaDemo!2026']
        : role === 'bk'
          ? ['rani.bk@sekolah.sch.id', 'StafDemo!2026', 'JBSWY3DPEHPK3PXP']
          : ['superadmin@tenangin.id', 'StafDemo!2026', 'KRSXG5CTMVRXEZLU'];
    const response = await client.login(...info);
    expect(response.loginRes.status).toBe(200);
    if (role !== 'student') expect(response.mfaRes.status).toBe(200);
    return client;
  }
  const mutate = (client, method, url, body) =>
    client.agent[method](url).set('x-csrf-token', client.csrfToken).send(body);
  const student = () => ctx.adminDb('users').where({ account_code: 'Awan-028' }).first();

  it('restore backup lama mempertahankan tombstone lokal tanpa parameter khusus dan mencabut seluruh sesi', async () => {
    const client = await login();
    const user = await student();
    const backup = await exportEncryptedBackup(ctx.adminDb, ctx.env.keyRing);
    expect(
      (
        await mutate(client, 'post', '/api/me/deletion-request', {
          currentPassword: 'SiswaDemo!2026',
          scope: 'account',
        })
      ).status
    ).toBe(202);
    await restoreEncryptedBackup(ctx.adminDb, ctx.env.keyRing, backup);
    expect(await ctx.adminDb('users').where({ id: user.id }).first()).toBeUndefined();
    expect(
      await ctx.adminDb('deleted_account_tombstones').where({ user_id: user.id }).first()
    ).toBeTruthy();
    expect(Number((await ctx.adminDb('user_sessions').count('* as n').first()).n)).toBe(0);
  });
  it('hapus seluruh entri mencakup bantuan dan respons; restore lama menerapkan ulang penghapusan entri', async () => {
    const client = await login();
    const user = await student();
    const backup = await exportEncryptedBackup(ctx.adminDb, ctx.env.keyRing);
    expect(
      await ctx.adminDb('help_requests').where({ student_user_id: user.id }).first()
    ).toBeTruthy();
    expect(
      (
        await mutate(client, 'post', '/api/me/deletion-request', {
          currentPassword: 'SiswaDemo!2026',
          scope: 'entries',
        })
      ).status
    ).toBe(202);
    expect(
      await ctx.adminDb('help_requests').where({ student_user_id: user.id }).first()
    ).toBeUndefined();
    await restoreEncryptedBackup(ctx.adminDb, ctx.env.keyRing, backup);
    expect(
      await ctx.adminDb('journal_entries').where({ user_id: user.id }).first()
    ).toBeUndefined();
    expect(
      await ctx.adminDb('help_requests').where({ student_user_id: user.id }).first()
    ).toBeUndefined();
    expect(await ctx.adminDb('users').where({ id: user.id }).first()).toBeTruthy();
  });
  it('retensi menghapus seluruh kategori aktivitas lama beserta langkah tugas, mempertahankan entri baru', async () => {
    const user = await student();
    const other = await ctx.adminDb('users').where({ account_code: 'Awan-015' }).first();
    const journal = await ctx.adminDb('journal_entries').where({ user_id: user.id }).first();
    await ctx
      .adminDb('journal_entries')
      .insert({
        ...journal,
        emotion_tags: JSON.stringify(journal.emotion_tags),
        id: crypto.randomUUID(),
        user_id: other.id,
        created_at: new Date(),
      });
    for (const table of [
      'mood_entries',
      'journal_entries',
      'exercise_sessions',
      'tasks',
      'weekly_reflections',
    ]) {
      await ctx
        .adminDb(table)
        .where({ user_id: user.id })
        .update({ created_at: new Date('2000-01-01T00:00:00Z') });
    }
    const summary = await runRetentionCleanup(ctx.adminDb, user.school_id);
    for (const table of [
      'mood_entries',
      'journal_entries',
      'exercise_sessions',
      'tasks',
      'weekly_reflections',
    ]) {
      expect(
        Number((await ctx.adminDb(table).where({ user_id: user.id }).count('* as n').first()).n)
      ).toBe(0);
      expect(summary.personalEntries).toHaveProperty(table);
    }
    expect(
      Number((await ctx.adminDb('journal_entries').count('* as n').first()).n)
    ).toBeGreaterThan(0);
    expect(await ctx.adminDb('task_steps').where({ user_id: user.id }).first()).toBeUndefined();
  });
  it('agregat menolak scope kosong/nonaktif, wali belum diverifikasi, dan kebijakan aktif yang tidak tersedia', async () => {
    const user = await student();
    const week = getLastCompletedWeekStart(new Date(), 'Asia/Jakarta');
    async function count() {
      const rows = await computeWeeklySnapshots(ctx.adminDb, user.school_id, week);
      return rows.find(
        (r) => r.scope_group === 'Semua Siswa' && r.metric_key === 'weekly_active_students'
      ).contributor_count;
    }
    await ctx
      .adminDb('consents')
      .update({ scope: JSON.stringify({ personal_activities: true, group_aggregate: false }) });
    expect(await count()).toBe(0);
    await ctx
      .adminDb('consents')
      .update({
        scope: JSON.stringify({ personal_activities: true, group_aggregate: true }),
        guardian_verified: false,
      });
    await ctx
      .adminDb('schools')
      .where({ id: user.school_id })
      .update({ guardian_consent_required: true });
    expect(await count()).toBe(0);
    await ctx
      .adminDb('schools')
      .where({ id: user.school_id })
      .update({ guardian_consent_required: false });
    await ctx.adminDb('consent_policies').update({ is_active: false });
    expect(await count()).toBe(0);
  });
  it('penarikan izin menutup data pribadi dan metadata historis dari browser BK', async () => {
    const client = await login();
    const bk = await login('bk');
    expect((await mutate(client, 'post', '/api/consents/withdraw', {})).status).toBe(200);
    const activities = await bk.agent.get('/api/bk/activities?q=Awan-028');
    expect(activities.body.data.activities).toEqual([]);
    expect((await client.agent.get('/api/journals')).status).toBe(403);
  });
  it('aktivasi kebijakan baru menginvalidasi seluruh snapshot dan minggu belum selesai ditolak', async () => {
    const admin = await login('superadmin');
    const bk = await login('bk');
    expect(
      (
        await mutate(admin, 'post', '/api/superadmin/settings/consent-policies', {
          version: 'audit-v2',
          title: 'Kebijakan Baru',
          summary: 'Kebijakan ini membutuhkan persetujuan ulang.',
          fullPolicyText: 'Informasi data baru yang wajib dibaca dan disetujui kembali.',
          dataAccessNotice: 'Akses siswa dan Superadmin teraudit.',
        })
      ).status
    ).toBe(201);
    expect((await bk.agent.get('/api/bk/dashboard')).body.data.snapshots).toEqual([]);
    for (const weekStart of [
      getWeekBounds(new Date(), 'Asia/Jakarta').weekStart,
      '2026-99-99',
      'invalid',
    ]) {
      expect(
        (await mutate(admin, 'post', '/api/superadmin/jobs/aggregate-weekly', { weekStart })).status
      ).toBe(400);
    }
  });
  it('kode recovery MFA yang sama hanya berhasil sekali dalam request paralel', async () => {
    const user = await ctx.adminDb('users').where({ role: 'superadmin' }).first();
    await ctx
      .adminDb('users')
      .where({ id: user.id })
      .update({ mfa_recovery_hashes: JSON.stringify([hashToken('ONE-TIME-AUDIT')]) });
    const clients = [];
    for (let i = 0; i < 6; i++) {
      const client = await ctx.createAgent();
      await client.login('superadmin@tenangin.id', 'StafDemo!2026');
      clients.push(client);
    }
    const responses = await Promise.all(
      clients.map((client) =>
        mutate(client, 'post', '/api/auth/mfa/recover', { recoveryCode: 'ONE-TIME-AUDIT' })
      )
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 400)).toHaveLength(5);
  });
  it('perubahan artikel terbit tanpa flag klien tetap membuat versi baru/draf dan menutup publikasi', async () => {
    const admin = await login('superadmin');
    const row = await ctx.adminDb('articles').where({ status: 'published' }).first();
    const response = await mutate(admin, 'patch', `/api/superadmin/content/articles/${row.id}`, {
      slug: row.slug,
      title: row.title,
      topic: row.topic,
      summary: row.summary,
      body: 'Isi diubah setelah review tanpa flag substantif dari klien.',
      tags: row.tags,
      sourceReference: row.source_reference,
      mediaRights: row.media_rights,
    });
    expect(response.status).toBe(200);
    expect(response.body.data.article.version).toBe(row.version + 1);
    expect(response.body.data.article.status).toBe('draft');
    expect(response.body.data.article.reviewer_ref).toBeNull();
    expect((await admin.agent.get(`/api/articles/${row.slug}`)).status).toBe(404);
    expect(
      (
        await mutate(admin, 'patch', `/api/superadmin/content/articles/${row.id}/status`, {
          status: 'published',
        })
      ).status
    ).toBe(400);
  });
  it('seluruh mutasi latihan tercatat pada audit dan perubahan isinya kembali ke draf', async () => {
    const admin = await login('superadmin');
    const payload = {
      slug: 'audit-exercise',
      category: 'mindfulness',
      title: 'Latihan Audit',
      subtitle: 'Panduan latihan audit',
      durationSeconds: 180,
      instructions: [
        { phase: 'Awal', seconds: 5, quote: 'Perhatikan lingkungan sekitar dengan nyaman.' },
      ],
      stopNotice: 'Berhenti kapan pun kamu merasa tidak nyaman.',
      sourceReference: 'Tim Sekolah',
      mediaRights: 'Internal',
    };
    const created = await mutate(admin, 'post', '/api/superadmin/content/exercises', payload);
    expect(created.status).toBe(201);
    const id = created.body.data.exercise.id;
    expect(
      (
        await mutate(admin, 'patch', `/api/superadmin/content/exercises/${id}/status`, {
          status: 'in_review',
        })
      ).status
    ).toBe(200);
    const updated = await mutate(admin, 'patch', `/api/superadmin/content/exercises/${id}`, {
      ...payload,
      title: 'Panduan Audit Baru',
    });
    expect(updated.body.data.exercise.status).toBe('draft');
    expect(updated.body.data.exercise.version).toBe(2);
    const events = await ctx.adminDb('audit_events').where({ target_id: id });
    expect(events.map((e) => e.action)).toEqual(
      expect.arrayContaining(['exercise_created', 'exercise_updated', 'exercise_status_changed'])
    );
  });
  it('zona waktu palsu ditolak dan layanan mood tetap berfungsi', async () => {
    const admin = await login('superadmin');
    const client = await login();
    const user = await student();
    const school = await ctx.adminDb('schools').where({ id: user.school_id }).first();
    const result = await mutate(admin, 'patch', '/api/superadmin/settings', {
      name: school.name,
      timezone: 'Mars/Olympus',
      serviceHours: school.service_hours,
      verifiedContacts: school.verified_contacts,
      guardianConsentRequired: false,
      activeHandlerConfigured: true,
    });
    expect(result.status).toBe(400);
    expect((await client.agent.get('/api/moods')).status).toBe(200);
    expect(
      (
        await mutate(client, 'put', '/api/reminders', {
          enabled: true,
          reminderType: 'cek_mood',
          daysOfWeek: [1],
          preferredTime: '99:99',
          timezone: 'Mars/Olympus',
          quietHoursStart: '21:30',
          quietHoursEnd: '06:00',
        })
      ).status
    ).toBe(400);
  });
  it('latihan berdurasi nol tidak dapat ditandai selesai dan tidak menjadi kontributor latihan', async () => {
    const client = await login();
    const row = await ctx.adminDb('exercise_contents').where({ status: 'published' }).first();
    const started = await mutate(client, 'post', '/api/exercise-sessions', { exerciseId: row.id });
    const id = started.body.data.session.id;
    expect(
      (
        await mutate(client, 'patch', `/api/exercise-sessions/${id}`, {
          status: 'completed',
          activeSeconds: 0,
        })
      ).status
    ).toBe(400);
    expect(
      (
        await mutate(client, 'patch', `/api/exercise-sessions/${id}`, {
          status: 'stopped',
          activeSeconds: 0,
        })
      ).status
    ).toBe(200);
  });
  it('Superadmin CRUD data lintas domain, konflik versi, audit, dan penolakan siswa/BK', async () => {
    const admin = await login('superadmin');
    const client = await login();
    const bk = await login('bk');
    const user = await student();
    const base = `/api/superadmin/students/${user.id}/records`;
    for (const [domain, payload] of [
      ['journals', { situation: 'Situasi audit', thoughts: 'Pikiran audit', feelings: 'Tenang' }],
      ['tasks', { title: 'Tugas audit', steps: [{ title: 'Langkah pertama', isDone: false }] }],
      [
        'schedule-blocks',
        { blockType: 'rest', title: 'Jeda audit', startTime: '16:00', endTime: '16:15' },
      ],
    ]) {
      const created = await mutate(admin, 'post', `${base}/${domain}`, {
        ...payload,
        reason: 'Koreksi data demo',
      });
      expect(created.status).toBe(201);
      const id = created.body.data.id;
      const list = await admin.agent.get(`${base}/${domain}`);
      expect(list.status).toBe(200);
      expect(list.body.data.entries.some((e) => e.id === id)).toBe(true);
      const updated = await mutate(admin, 'patch', `${base}/${domain}/${id}`, {
        ...payload,
        version: 1,
        reason: 'Pemeriksaan revisi',
      });
      expect(updated.status).toBe(200);
      if (domain === 'journals')
        expect(
          (
            await mutate(admin, 'patch', `${base}/${domain}/${id}`, {
              ...payload,
              version: 1,
              reason: 'Tab lama',
            })
          ).status
        ).toBe(409);
      expect(
        (await mutate(admin, 'delete', `${base}/${domain}/${id}`, { reason: 'Pembersihan demo' }))
          .status
      ).toBe(200);
    }
    expect((await client.agent.get(`${base}/journals`)).status).toBe(403);
    expect((await bk.agent.get(`${base}/journals`)).status).toBe(403);
    const other = await ctx.adminDb('schools').whereNot({ id: user.school_id }).first();
    if (other) {
      const outside = await ctx
        .adminDb('users')
        .where({ school_id: other.id, role: 'student' })
        .first();
      if (outside)
        expect(
          (await admin.agent.get(`/api/superadmin/students/${outside.id}/records/journals`)).status
        ).toBe(404);
    }
    expect(
      (await ctx.adminDb('audit_events').where({ action: 'superadmin_update_student_record' }))
        .length
    ).toBeGreaterThanOrEqual(3);
  });
});
