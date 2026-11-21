import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';
import { dispatchDuePushReminders } from '../../src/jobs/handlers/dispatch-push.job.js';

describe('Integration Phase 2: L01 Push, L02 Public Cache, L04 Ekspor, L05 Multi-Sekolah, T73 Tata Kelola', () => {
  let ctx;
  let capturedPushCalls;

  beforeAll(() => {
    capturedPushCalls = [];
    ctx = createTestContext(
      {},
      {
        pushTransport: async (endpoint, init) => {
          capturedPushCalls.push({ endpoint, init });
          if (endpoint.includes('/gone-410')) {
            return { status: 410 };
          }
          return { status: 201 };
        },
      }
    );
  });

  beforeEach(async () => {
    capturedPushCalls.length = 0;
    await ctx.resetAndSeed();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  it('L01: menegakkan opt-in terenkripsi, penghormatan jam tenang, dedupe worker, auto-revoke 410, dan pencabutan saat tarik izin', async () => {
    const student = await ctx.createAgent();
    await student.login('awan-028', 'SiswaDemo!2026');

    const statusBefore = await student.agent.get('/api/reminders/push/status');
    expect(statusBefore.status).toBe(200);
    expect(statusBefore.body.data.vapidPublicKey.length).toBeGreaterThan(40);
    expect(statusBefore.body.data.subscriptions).toEqual([]);

    const ecdh = crypto.createECDH('prime256v1');
    ecdh.generateKeys();
    const fakeAuth = crypto.randomBytes(16).toString('base64url');
    const fakePub = ecdh.getPublicKey().toString('base64url');

    const subRes = await student.agent
      .post('/api/reminders/push/subscriptions')
      .set('x-csrf-token', student.csrfToken)
      .send({
        endpoint: 'https://push.example.invalid/device-1',
        keys: { p256dh: fakePub, auth: fakeAuth },
        userAgentLabel: 'Chromium Uji',
      });
    expect(subRes.status).toBe(201);
    const subId = subRes.body.data.subscription.id;

    // Pastikan p256dh & auth tersimpan terenkripsi di PostgreSQL (bukan plaintext)
    const dbSub = await ctx.adminDb('push_subscriptions').where({ id: subId }).first();
    expect(dbSub.p256dh_encrypted.startsWith('v1:')).toBe(true);
    expect(dbSub.p256dh_encrypted).not.toContain(fakePub);

    // Aktifkan pengingat semua hari dengan jam mulai 00:01 & jam tenang 21:30-06:00 WIB
    await student.agent
      .put('/api/reminders')
      .set('x-csrf-token', student.csrfToken)
      .send({
        enabled: true,
        reminderType: 'jeda_belajar',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        preferredTime: '00:01',
        timezone: 'Asia/Jakarta',
        quietHoursStart: '21:30',
        quietHoursEnd: '06:00',
      });

    // Uji dispatch saat jam tenang (22:30 WIB = 15:30 UTC) -> harus ditahan
    const quietRun = await dispatchDuePushReminders(ctx.adminDb, ctx.env, null, {
      now: new Date('2026-11-20T15:30:00Z'),
      transport: async (endpoint, init) => {
        capturedPushCalls.push({ endpoint, init });
        return { status: 201 };
      },
    });
    expect(quietRun.sentCount).toBe(0);
    expect(quietRun.skippedQuietHours).toBe(1);
    expect(capturedPushCalls.length).toBe(0);

    // Uji dispatch di luar jam tenang (10:00 WIB = 03:00 UTC) -> terkirim sekali + dedupe
    const activeRun = await dispatchDuePushReminders(ctx.adminDb, ctx.env, null, {
      now: new Date('2026-11-20T03:00:00Z'),
      transport: async (endpoint, init) => {
        capturedPushCalls.push({ endpoint, init });
        return { status: 201 };
      },
    });
    expect(activeRun.sentCount).toBe(1);
    expect(capturedPushCalls[0].init.headers['Content-Encoding']).toBe('aes128gcm');
    expect(capturedPushCalls[0].init.headers.Authorization).toMatch(/^vapid t=/);

    const secondRunSameDay = await dispatchDuePushReminders(ctx.adminDb, ctx.env, null, {
      now: new Date('2026-11-20T03:15:00Z'),
      transport: async () => ({ status: 201 }),
    });
    expect(secondRunSameDay.sentCount).toBe(0);

    // Uji device test saat endpoint membalas 410 Gone -> otomatis dicabut
    await student.agent
      .post('/api/reminders/push/subscriptions')
      .set('x-csrf-token', student.csrfToken)
      .send({
        endpoint: 'https://push.example.invalid/gone-410',
        keys: { p256dh: fakePub, auth: fakeAuth },
      });

    const test410 = await student.agent
      .post('/api/reminders/push/test')
      .set('x-csrf-token', student.csrfToken)
      .send({ forceDeviceCheck: true });
    expect(test410.status).toBe(200);
    const expiredRow = await ctx
      .adminDb('push_subscriptions')
      .where({ endpoint: 'https://push.example.invalid/gone-410' })
      .first();
    expect(expiredRow.is_active).toBe(false);

    // Penarikan persetujuan otomatis menghapus seluruh langganan push siswa
    await student.agent
      .post('/api/consents/withdraw')
      .set('x-csrf-token', student.csrfToken)
      .send({});
    const remainingSubs = await ctx.adminDb('push_subscriptions').where({ user_id: dbSub.user_id });
    expect(remainingSubs.length).toBe(0);
  });

  it('L02: memberi Cache-Control public hanya pada katalog publik bebas sesi dan no-store pada API pribadi', async () => {
    const anon = await ctx.createAgent();

    const articlesRes = await anon.agent.get('/api/articles');
    expect(articlesRes.status).toBe(401);
    expect(articlesRes.headers['cache-control']).toContain('no-store');

    const exercisesRes = await anon.agent.get('/api/exercises');
    expect(exercisesRes.status).toBe(401);
    expect(exercisesRes.headers['cache-control']).toContain('no-store');

    const configRes = await anon.agent.get('/api/public/config');
    expect(configRes.status).toBe(200);
    expect(configRes.headers['cache-control']).toContain('public');

    const student = await ctx.createAgent();
    await student.login('awan-028', 'SiswaDemo!2026');
    for (const endpoint of ['/api/articles', '/api/exercises']) {
      const response = await student.agent.get(endpoint);
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toContain('no-store');
    }
    const journalRes = await student.agent.get('/api/journals');
    expect(journalRes.status).toBe(200);
    expect(journalRes.headers['cache-control']).toContain('no-store');
  });

  it('L04: mengekspor data sesuai role dengan autentikasi ulang wajib dan menjaga supresi k=5 pada ekspor BK', async () => {
    const student = await ctx.createAgent();
    await student.login('awan-028', 'SiswaDemo!2026');

    const badPassStudent = await student.agent
      .post('/api/exports/personal')
      .set('x-csrf-token', student.csrfToken)
      .send({ currentPassword: 'Salah', format: 'json' });
    expect(badPassStudent.status).toBe(400);

    const okStudentJson = await student.agent
      .post('/api/exports/personal')
      .set('x-csrf-token', student.csrfToken)
      .send({ currentPassword: 'SiswaDemo!2026', format: 'json' });
    expect(okStudentJson.status).toBe(200);
    expect(okStudentJson.headers['cache-control']).toContain('no-store');
    expect(okStudentJson.body.data.account.accountCode).toBe('Awan-028');
    expect(okStudentJson.body.data.journals.length).toBeGreaterThanOrEqual(1);

    const okStudentCsv = await student.agent
      .post('/api/exports/personal')
      .set('x-csrf-token', student.csrfToken)
      .send({ currentPassword: 'SiswaDemo!2026', format: 'csv' });
    expect(okStudentCsv.status).toBe(200);
    expect(okStudentCsv.headers['content-type']).toContain('text/csv');
    expect(okStudentCsv.text).toContain('kategori,tanggal_atau_periode');

    // Siswa ditolak mengakses endpoint ekspor BK/Superadmin
    const forbiddenBkExport = await student.agent
      .post('/api/exports/bk-aggregate')
      .set('x-csrf-token', student.csrfToken)
      .send({ currentPassword: 'SiswaDemo!2026', format: 'json' });
    expect(forbiddenBkExport.status).toBe(403);

    // BK hanya mengekspor agregat tersupresi kelompok penugasan (Kelas X tersupresi, Kelas XI tampil, Kelas XII absen)
    const bk = await ctx.createAgent();
    await bk.login('rani.bk@sekolah.sch.id', 'StafDemo!2026', 'JBSWY3DPEHPK3PXP');

    const badPassBk = await bk.agent
      .post('/api/exports/bk-aggregate')
      .set('x-csrf-token', bk.csrfToken)
      .send({ currentPassword: 'Salah', format: 'json' });
    expect(badPassBk.status).toBe(400);

    const okBkCsv = await bk.agent
      .post('/api/exports/bk-aggregate')
      .set('x-csrf-token', bk.csrfToken)
      .send({ currentPassword: 'StafDemo!2026', format: 'csv' });
    expect(okBkCsv.status).toBe(200);
    expect(okBkCsv.text).toContain('Kelas XI');
    expect(okBkCsv.text).toContain('TERSUPRESI (k < 5)');
    expect(okBkCsv.text).not.toContain('Kelas XII');
    expect(okBkCsv.text).not.toContain('Biologi'); // isi jurnal siswa tidak pernah masuk

    const admin = await ctx.createAgent();
    await admin.login('superadmin@tenangin.id', 'StafDemo!2026', 'KRSXG5CTMVRXEZLU');
    const okAdminExport = await admin.agent
      .post('/api/exports/superadmin-aggregate')
      .set('x-csrf-token', admin.csrfToken)
      .send({ currentPassword: 'StafDemo!2026', format: 'json', includeAuditSummary: true });
    expect(okAdminExport.status).toBe(200);
    const adminText = JSON.stringify(okAdminExport.body);
    expect(adminText).not.toContain('password_hash');
    expect(adminText).not.toContain('mfa_secret_encrypted');
  });

  it('L05 & T73: memonitor kapasitas, provisioning sekolah mitra terisolasi, dan mengelola tinjauan tata kelola T73', async () => {
    const admin = await ctx.createAgent();
    await admin.login('superadmin@tenangin.id', 'StafDemo!2026', 'KRSXG5CTMVRXEZLU');

    // T73: 8 item tinjauan awal masih pending_review
    const govRes = await admin.agent.get('/api/superadmin/governance-reviews');
    expect(govRes.status).toBe(200);
    expect(govRes.body.data.reviews.length).toBe(8);
    expect(govRes.body.data.pilotGateReady).toBe(false);

    const targetReview = govRes.body.data.reviews.find(
      (r) => r.domainCode === 'D13_MATERI_LATIHAN'
    );
    const patchGov = await admin.agent
      .patch(`/api/superadmin/governance-reviews/${targetReview.id}`)
      .set('x-csrf-token', admin.csrfToken)
      .send({
        status: 'needs_revision',
        reviewerName: 'Dr. Ratna (Ahli Materi)',
        reviewerRole: 'ahli_materi',
        decisionNotes: 'Periksa kembali panjang instruksi jeda untuk kelas X.',
        revisionNotes: 'Ringkas kalimat ke-2 agar lebih padat.',
      });
    expect(patchGov.status).toBe(200);
    expect(patchGov.body.data.review.version).toBe(2);

    // L05: Kapasitas & provisioning sekolah baru
    const capRes = await admin.agent.get('/api/superadmin/capacity');
    expect(capRes.status).toBe(200);
    expect(capRes.body.data.pool.max).toBeGreaterThanOrEqual(2);
    expect(capRes.body.data.schoolQuota.studentCount).toBeGreaterThanOrEqual(5);

    const createSchoolRes = await admin.agent
      .post('/api/superadmin/schools')
      .set('x-csrf-token', admin.csrfToken)
      .send({
        code: 'SMA-MITRA-02',
        name: 'SMA Negeri 2 Mitra',
        timezone: 'Asia/Makassar',
        maxStudents: 150,
        retentionDays: 60,
        adminAccountCode: 'Admin-Mitra-02',
        adminDisplayName: 'Admin Mitra Dua',
        adminLoginEmail: 'mitra@example.test',
        adminPassword: 'MitraPassword!2026',
      });
    expect(createSchoolRes.status).toBe(201);
    expect(createSchoolRes.body.data.oneTimeActivationToken).toBeUndefined();

    // Katalog publik mengenali ?schoolCode=SMA-MITRA-02
    const cfgMitra = await admin.agent.get('/api/public/config?schoolCode=SMA-MITRA-02');
    expect(cfgMitra.status).toBe(200);
    expect(cfgMitra.body.data.school.code).toBe('SMA-MITRA-02');

    // Aktivasi admin sekolah mitra dan pastikan isolasi tenant penuh (tidak melihat akun SMA-CONTOH-01)
    const mitraClient = await ctx.createAgent();
    await mitraClient.login('Admin-Mitra-02', 'MitraPassword!2026');
    const setupMfa = await mitraClient.agent
      .post('/api/auth/mfa/setup')
      .set('x-csrf-token', mitraClient.csrfToken)
      .send({});
    expect(setupMfa.status).toBe(200);
    const { authenticator } = await import('otplib');
    const confirmMfa = await mitraClient.agent
      .post('/api/auth/mfa/setup/confirm')
      .set('x-csrf-token', mitraClient.csrfToken)
      .send({ code: authenticator.generate(setupMfa.body.data.secret) });
    expect(confirmMfa.status).toBe(200);

    const mitraUsers = await mitraClient.agent.get('/api/superadmin/users');
    expect(mitraUsers.status).toBe(200);
    expect(mitraUsers.body.data.users.map((u) => u.accountCode)).toEqual(['Admin-Mitra-02']);
  });
});
