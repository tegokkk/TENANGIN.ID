import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';

describe('Integration: BK Read-Only & Isolasi Penugasan vs Superadmin Akses Penuh & Audit', () => {
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

  it('menegakkan BK strictly read-only, supresi k=5 pada Kelas X, scope penugasan, dan nol kebocoran isi pribadi', async () => {
    const bk = await ctx.createAgent();
    await bk.login('rani.bk@sekolah.sch.id', 'StafDemo!2026', 'JBSWY3DPEHPK3PXP');

    const dashRes = await bk.agent.get('/api/bk/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.counselor.assignedGroups).toEqual(['Kelas X', 'Kelas XI']);

    // Kelas XI (6 siswa >= 5) tampil, Kelas X (1 siswa < 5) tersupresi
    const kelasXSnaps = dashRes.body.data.snapshotsByGroup['Kelas X'] || [];
    expect(kelasXSnaps.length).toBeGreaterThan(0);
    for (const s of kelasXSnaps) {
      expect(s.isSuppressed).toBe(true);
      expect(s.value).toBeNull();
      expect(s.contributorCount).toBeNull();
    }

    const kelasXISnaps = dashRes.body.data.snapshotsByGroup['Kelas XI'] || [];
    const activeSnap = kelasXISnaps.find((s) => s.metricKey === 'weekly_active_students');
    expect(activeSnap.isSuppressed).toBe(false);
    expect(activeSnap.value).toBeGreaterThanOrEqual(5);

    // Kelas XII di luar penugasan Bu Rani tidak boleh muncul
    expect(dashRes.body.data.snapshotsByGroup['Kelas XII']).toBeUndefined();

    // Activities hanya mengembalikan metadata allowlist dalam penugasan (Senja-099 Kelas XII tidak muncul)
    const actRes = await bk.agent.get('/api/bk/activities?limit=100');
    expect(actRes.status).toBe(200);
    const codes = actRes.body.data.activities.map((a) => a.studentCode);
    expect(codes).toContain('Awan-028');
    expect(codes).not.toContain('Senja-099');

    const serialized = JSON.stringify(actRes.body);
    for (const forbiddenField of [
      'situation',
      'thoughts',
      'feelings',
      'moodScore',
      'pressureLevel',
      'topicMessage',
      'helpful',
      'computedScore',
    ]) {
      expect(serialized).not.toContain(forbiddenField);
    }

    // Filter kelompok di luar penugasan ditolak 403
    const outOfScope = await bk.agent.get('/api/bk/activities?gradeGroup=Kelas%20XII');
    expect(outOfScope.status).toBe(403);

    // Mutasi & endpoint Superadmin ditolak 403 untuk BK
    const bkMutateHelp = await bk.agent
      .patch('/api/superadmin/help-requests/00000000-0000-0000-0000-000000000001/status')
      .set('x-csrf-token', bk.csrfToken)
      .send({ status: 'acknowledged' });
    expect(bkMutateHelp.status).toBe(403);

    const bkPost = await bk.agent
      .post('/api/bk/anything')
      .set('x-csrf-token', bk.csrfToken)
      .send({});
    expect(bkPost.status).toBe(403);

    const bkReadSuperadminData = await bk.agent.get('/api/superadmin/users');
    expect(bkReadSuperadminData.status).toBe(403);
  });

  it('memberikan Superadmin kendali penuh lintas domain dengan pencatatan audit dan tanpa membocorkan rahasia', async () => {
    const admin = await ctx.createAgent();
    await admin.login('superadmin@tenangin.id', 'StafDemo!2026', 'KRSXG5CTMVRXEZLU');

    const usersRes = await admin.agent.get('/api/superadmin/users');
    expect(usersRes.status).toBe(200);
    const serializedUsers = JSON.stringify(usersRes.body);
    expect(serializedUsers).not.toContain('password_hash');
    expect(serializedUsers).not.toContain('mfa_secret_encrypted');

    const awan = usersRes.body.data.users.find((u) => u.accountCode === 'Awan-028');
    expect(awan).toBeTruthy();

    // Superadmin membaca isi data pribadi siswa -> berhasil dan mencatat audit wajib
    const studentDataRes = await admin.agent.get(`/api/superadmin/students/${awan.id}/data`);
    expect(studentDataRes.status).toBe(200);
    expect(studentDataRes.body.data.journals.length).toBeGreaterThanOrEqual(1);
    expect(studentDataRes.body.data.journals[0].situation).toContain('Biologi');

    // Alur publikasi artikel draft -> in_review -> approved -> published
    const artCreate = await admin.agent
      .post('/api/superadmin/content/articles')
      .set('x-csrf-token', admin.csrfToken)
      .send({
        slug: 'artikel-baru-teruji',
        topic: 'Uji',
        title: 'Artikel Baru Teruji',
        summary: 'Ringkasan artikel baru untuk verifikasi alur terbit.',
        body: 'Isi lengkap artikel baru yang sudah ditinjau ahli materi.',
        tags: ['uji'],
        sourceReference: 'Tim Kurasi',
        mediaRights: 'Internal',
      });
    expect(artCreate.status).toBe(201);
    const artId = artCreate.body.data.article.id;

    for (const status of ['in_review', 'approved', 'published']) {
      const stRes = await admin.agent
        .patch(`/api/superadmin/content/articles/${artId}/status`)
        .set('x-csrf-token', admin.csrfToken)
        .send({ status, reviewerRef: 'Ahli BK Demo' });
      expect(stRes.status).toBe(200);
    }

    const publicCheck = await admin.agent.get('/api/articles/artikel-baru-teruji');
    expect(publicCheck.status).toBe(200);

    // Cek log audit merekam pembacaan pribadi & perubahan
    const auditRes = await admin.agent.get('/api/superadmin/audit?limit=20');
    expect(auditRes.status).toBe(200);
    const actions = auditRes.body.data.events.map((e) => e.action);
    expect(actions).toContain('superadmin_read_student_data');
    expect(actions).toContain('article_status_changed');
  });
});
