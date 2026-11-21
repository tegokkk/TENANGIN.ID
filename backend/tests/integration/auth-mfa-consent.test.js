import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';

describe('Integration: Auth, CSRF, Aktivasi/Pemulihan, MFA Staf, dan Persetujuan F1', () => {
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

  it('menolak mutasi tanpa CSRF dan mengembalikan error netral tanpa enumerasi akun', async () => {
    const noCsrfRes = await (
      await ctx.createAgent()
    ).agent
      .post('/api/auth/login')
      .send({ identifier: 'awan-028', password: 'SiswaDemo!2026' });
    expect(noCsrfRes.status).toBe(403);
    expect(noCsrfRes.body.error.code).toBe('CSRF_INVALID');

    const client = await ctx.createAgent();
    const wrongUser = await client.login('tidak-ada-999', 'Sembarang!123');
    const wrongPass = await client.login('awan-028', 'SalahPassword!123');
    expect(wrongUser.loginRes.status).toBe(401);
    expect(wrongPass.loginRes.status).toBe(401);
    expect(wrongUser.loginRes.body.error.message).toBe(wrongPass.loginRes.body.error.message);
  });

  it('menutup aktivasi token publik dan mempertahankan akun sebagai belum aktif', async () => {
    const client = await ctx.createAgent();
    const response = await client.agent
      .post('/api/auth/activate')
      .set('x-csrf-token', client.csrfToken)
      .send({ accountCode: 'Awan-088', token: 'AKTIVASI-DEMO-088', password: 'PasswordBaru!2026' });
    expect(response.status).toBe(410);
    expect(response.body.error.code).toBe('ACTIVATION_RETIRED');
    expect((await ctx.adminDb('users').where({ account_code: 'Awan-088' }).first()).status).toBe(
      'pending_activation'
    );
  });

  it('menegakkan gerbang persetujuan F1 (blokir sebelum setuju, publik tetap terbuka, tarik izin hentikan pengumpulan & pengingat)', async () => {
    const client = await ctx.createAgent();
    const { loginRes } = await client.login('bintang-014', 'SiswaDemo!2026');
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.nextStep).toBe('student_home');

    // Sebelum setuju: data pribadi ditolak (F1-AC1), pustaka tetap tersedia bagi akun yang sudah login
    const blockedMood = await client.agent
      .post('/api/moods')
      .set('x-csrf-token', client.csrfToken)
      .send({ moodCode: 'calm_relieved' });
    expect(blockedMood.status).toBe(403);
    expect(blockedMood.body.error.code).toBe('CONSENT_REQUIRED');

    const pubArticles = await client.agent.get('/api/articles');
    expect(pubArticles.status).toBe(200);
    expect(pubArticles.body.data.articles.length).toBeGreaterThanOrEqual(6);

    // Versi lama ditolak (F1-AC3)
    const oldPolicyRes = await client.agent
      .post('/api/consents')
      .set('x-csrf-token', client.csrfToken)
      .send({ policyVersion: '0.9', decision: 'accepted' });
    expect(oldPolicyRes.status).toBe(400);

    // Setuju versi aktif 1.1
    const acceptRes = await client.agent
      .post('/api/consents')
      .set('x-csrf-token', client.csrfToken)
      .send({ policyVersion: '1.1', decision: 'accepted' });
    expect(acceptRes.status).toBe(200);

    // Sekarang boleh menyimpan mood & mengaktifkan reminder
    const okMood = await client.agent
      .post('/api/moods')
      .set('x-csrf-token', client.csrfToken)
      .send({ moodCode: 'calm_relieved', pressureLevel: 3 });
    expect(okMood.status).toBe(201);

    await client.agent
      .put('/api/reminders')
      .set('x-csrf-token', client.csrfToken)
      .send({
        enabled: true,
        reminderType: 'jeda_belajar',
        daysOfWeek: [1, 2, 3, 4, 5],
        preferredTime: '16:00',
        quietHoursStart: '21:30',
        quietHoursEnd: '06:00',
      });

    // Tarik izin -> langsung menghentikan pengumpulan berikutnya dan menonaktifkan reminder (F1-AC4)
    const withdrawRes = await client.agent
      .post('/api/consents/withdraw')
      .set('x-csrf-token', client.csrfToken)
      .send({});
    expect(withdrawRes.status).toBe(200);

    const afterWithdrawMood = await client.agent
      .post('/api/moods')
      .set('x-csrf-token', client.csrfToken)
      .send({ moodCode: 'neutral' });
    expect(afterWithdrawMood.status).toBe(403);
    expect(afterWithdrawMood.body.error.code).toBe('CONSENT_REQUIRED');

    const prefRow = await ctx
      .adminDb('reminder_preferences')
      .where({ user_id: loginRes.body.data.user.id })
      .first();
    expect(prefRow.enabled).toBe(false);
  });

  it('akun aktif bisa masuk tanpa kebijakan; kebijakan sekolah lain tidak bocor dan data pribadi tetap dibatasi', async () => {
    const school = await ctx.adminDb('schools').first();
    const originalPolicy = await ctx.adminDb('consent_policies').first();
    await ctx
      .adminDb('consent_policies')
      .where({ school_id: school.id })
      .update({ is_active: false });
    const [otherSchool] = await ctx
      .adminDb('schools')
      .insert({
        ...school,
        id: crypto.randomUUID(),
        code: 'POLICY-OTHER-01',
        verified_contacts: JSON.stringify(school.verified_contacts),
      })
      .returning('*');
    await ctx.adminDb('consent_policies').insert({
      ...originalPolicy,
      id: crypto.randomUUID(),
      school_id: otherSchool.id,
      version: '9.9',
      is_active: true,
      created_by_user_id: null,
    });
    const client = await ctx.createAgent();
    expect((await client.agent.get('/api/consent-policy')).status).toBe(401);
    const { loginRes } = await client.login('bintang-014', 'SiswaDemo!2026');
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.nextStep).toBe('student_home');
    expect(loginRes.body.data.consentStatus.hasActiveConsent).toBe(false);
    expect(loginRes.body.data.consentStatus.activePolicyVersion).toBeNull();
    const policy = await client.agent.get('/api/consent-policy');
    expect(policy.status).toBe(200);
    expect(policy.body.data.policy).toBeNull();
    expect((await client.agent.get('/api/articles')).status).toBe(200);
    expect((await client.agent.get('/api/exercises')).status).toBe(200);
    const blocked = await client.agent
      .post('/api/moods')
      .set('x-csrf-token', client.csrfToken)
      .send({ moodCode: 'neutral' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('CONSENT_REQUIRED');
    expect(
      await ctx.adminDb('consents').where({ user_id: loginRes.body.data.user.id }).first()
    ).toBeUndefined();
    const session = await client.agent.get('/api/auth/session');
    expect(session.body.data.authenticated).toBe(true);
    expect(session.body.data.nextStep).toBe('student_home');
  });

  it('persetujuan yang menunggu wali tidak membatalkan login atau otomatis membuka data pribadi', async () => {
    await ctx.adminDb('schools').update({ guardian_consent_required: true });
    const client = await ctx.createAgent();
    const { loginRes } = await client.login('bintang-014', 'SiswaDemo!2026');
    const policy = await client.agent.get('/api/consent-policy');
    expect(policy.body.data.policy.schoolId).toBe(loginRes.body.data.user.schoolId);
    expect(
      (
        await client.agent
          .post('/api/consents')
          .set('x-csrf-token', client.csrfToken)
          .send({ policyVersion: policy.body.data.policy.version, decision: 'accepted' })
      ).status
    ).toBe(200);
    const session = (await client.agent.get('/api/auth/session')).body.data;
    expect(session.authenticated).toBe(true);
    expect(session.nextStep).toBe('student_home');
    expect(session.consentStatus.status).toBe('accepted');
    expect(session.consentStatus.guardianVerified).toBe(false);
    expect(session.consentStatus.hasActiveConsent).toBe(false);
    expect((await client.agent.get('/api/moods')).status).toBe(403);
    expect((await client.agent.get('/api/exercises')).status).toBe(200);
  });

  it('memblokir dashboard BK/Superadmin sebelum MFA diverifikasi dan membuka setelah TOTP atau recovery code', async () => {
    const bkClient = await ctx.createAgent();
    const { loginRes } = await bkClient.login('rani.bk@sekolah.sch.id', 'StafDemo!2026');
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.nextStep).toBe('mfa_verify');

    const preMfa = await bkClient.agent.get('/api/bk/dashboard');
    expect(preMfa.status).toBe(403);
    expect(preMfa.body.error.code).toBe('MFA_REQUIRED');

    // Kode MFA salah ditolak
    const badMfa = await bkClient.agent
      .post('/api/auth/mfa/verify')
      .set('x-csrf-token', bkClient.csrfToken)
      .send({ code: '000000' });
    expect(badMfa.status).toBe(400);

    // Pulihkan dengan recovery code sekali pakai
    const recRes = await bkClient.agent
      .post('/api/auth/mfa/recover')
      .set('x-csrf-token', bkClient.csrfToken)
      .send({ recoveryCode: 'REC-BK-RANI-01' });
    expect(recRes.status).toBe(200);
    await bkClient.refreshCsrf();

    const postMfa = await bkClient.agent.get('/api/bk/dashboard');
    expect(postMfa.status).toBe(200);
    expect(postMfa.body.data.counselor.accountCode).toBe('BK-Rani-01');
  });

  it('mencabut sesi saat logout dan mengembalikan Cache-Control: no-store + 404 JSON', async () => {
    const client = await ctx.createAgent();
    await client.login('awan-028', 'SiswaDemo!2026');

    const meBefore = await client.agent.get('/api/me');
    expect(meBefore.status).toBe(200);
    expect(meBefore.headers['cache-control']).toContain('no-store');

    const logoutRes = await client.agent
      .post('/api/auth/logout')
      .set('x-csrf-token', client.csrfToken);
    expect(logoutRes.status).toBe(200);

    const meAfter = await client.agent.get('/api/me');
    expect(meAfter.status).toBe(401);

    const notFoundApi = await client.agent.get('/api/endpoint-yang-tidak-ada');
    expect(notFoundApi.status).toBe(404);
    expect(notFoundApi.body.error.code).toBe('NOT_FOUND');
  });
});
