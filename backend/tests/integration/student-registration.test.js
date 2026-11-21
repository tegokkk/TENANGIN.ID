import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';
import { verifyPassword } from '../../src/lib/password.js';
import { hashToken } from '../../src/lib/idempotency.js';

const form = {
  displayName: 'Siswa Pendaftar Terisolasi',
  nisn: '0098765401',
  gradeGroup: 'X IPA 1',
  password: 'Pendaftaran!2026',
};

describe('Pendaftaran siswa dan persetujuan Superadmin', () => {
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
  async function register(overrides = {}) {
    const client = await ctx.createAgent();
    return client.agent
      .post('/api/auth/register')
      .set('x-csrf-token', client.csrfToken)
      .send({ ...form, ...overrides });
  }
  async function admin() {
    const client = await ctx.createAgent();
    const login = await client.login('superadmin@tenangin.id', 'StafDemo!2026', 'KRSXG5CTMVRXEZLU');
    expect(login.mfaRes.status).toBe(200);
    return client;
  }
  async function review(client, id, decision = 'approve') {
    return client.agent
      .post(`/api/superadmin/users/${id}/registration-review`)
      .set('x-csrf-token', client.csrfToken)
      .send({ decision });
  }

  it('menyimpan sandi terhash, memblokir login sebelum persetujuan, dan mencatat keputusan tanpa persetujuan data otomatis', async () => {
    const result = await register();
    expect(result.status).toBe(202);
    expect(result.body.data.status).toBe('pending_approval');
    expect(JSON.stringify(result.body)).not.toContain(form.password);
    const pending = await ctx.adminDb('users').where({ nisn: form.nisn }).first();
    expect(pending.role).toBe('student');
    expect(pending.status).toBe('pending_activation');
    expect(pending.registration_status).toBe('pending');
    expect(await verifyPassword(pending.password_hash, form.password)).toBe(true);
    expect(
      await ctx.adminDb('account_tokens').where({ user_id: pending.id }).first()
    ).toBeUndefined();
    const student = await ctx.createAgent();
    const denied = await student.login(form.nisn, form.password);
    expect(denied.loginRes.status).toBe(401);
    expect(denied.loginRes.body.error.code).toBe('ACCOUNT_PENDING_APPROVAL');
    expect((await student.agent.get('/api/superadmin/registrations')).status).toBe(401);
    const wrongPassword = await student.login(form.nisn, 'SandiSalah!2026');
    expect(wrongPassword.loginRes.body.error.code).toBe('INVALID_CREDENTIALS');
    const operator = await admin();
    const queue = await operator.agent.get('/api/superadmin/registrations');
    expect(queue.body.data.total).toBe(1);
    expect(queue.body.data.registrations[0].nisn).toBe(form.nisn);
    expect(JSON.stringify(queue.body)).not.toContain('password');
    expect((await review(operator, pending.id)).status).toBe(200);
    expect((await review(operator, pending.id)).status).toBe(409);
    const user = await ctx.adminDb('users').where({ id: pending.id }).first();
    expect(user.status).toBe('active');
    expect(user.registration_status).toBe('approved');
    expect(user.registration_reviewer_id).toBe(
      (await operator.agent.get('/api/me')).body.data.user.id
    );
    expect(user.registration_reviewed_at).toBeTruthy();
    expect(
      await ctx
        .adminDb('audit_events')
        .where({ target_id: pending.id, action: 'student_registration_approved' })
        .first()
    ).toBeDefined();
    expect(await ctx.adminDb('consents').where({ user_id: pending.id }).first()).toBeUndefined();
    const admitted = await student.login(form.nisn, form.password);
    expect(admitted.loginRes.status).toBe(200);
    expect(admitted.loginRes.body.data.nextStep).toBe('student_home');
    expect(admitted.loginRes.body.data.consentStatus.hasActiveConsent).toBe(false);
  });

  it('menolak CSRF hilang, NISN tidak valid, duplikasi, dan peran/status tambahan dari pendaftar', async () => {
    const client = await ctx.createAgent();
    expect((await client.agent.post('/api/auth/register').send(form)).status).toBe(403);
    for (const overrides of [
      { nisn: '123' },
      { password: 'pendek' },
      { role: 'superadmin' },
      { status: 'active' },
      { registration_status: 'approved' },
    ]) {
      expect((await register(overrides)).status).toBe(400);
    }
    const responses = await Promise.all([register(), register()]);
    expect(responses.map((r) => r.status).sort()).toEqual([202, 409]);
    expect(
      Number(
        (await ctx.adminDb('users').where({ nisn: form.nisn }).count('* as count').first()).count
      )
    ).toBe(1);
  });

  it('membatasi antrean ke sekolah sendiri dan menolak siswa/BK yang mencoba menyetujui', async () => {
    await register();
    const user = await ctx.adminDb('users').where({ nisn: form.nisn }).first();
    const student = await ctx.createAgent();
    await student.login('awan-028', 'SiswaDemo!2026');
    expect((await review(student, user.id)).status).toBe(403);
    const bk = await ctx.createAgent();
    await bk.login('rani.bk@sekolah.sch.id', 'StafDemo!2026', 'JBSWY3DPEHPK3PXP');
    expect((await review(bk, user.id)).status).toBe(403);
    const operator = await admin();
    const copy = await ctx.adminDb('users').where({ role: 'superadmin' }).first();
    const schoolId = crypto.randomUUID();
    await ctx
      .adminDb('schools')
      .insert({ id: schoolId, code: 'SEKOLAH-LAIN', name: 'Unit Pengujian Lain' });
    await ctx.adminDb('users').insert({
      id: crypto.randomUUID(),
      school_id: schoolId,
      account_code: 'ADMIN-LAIN',
      login_email: 'other@example.test',
      display_name: 'Operator Uji Lain',
      role: 'superadmin',
      status: 'active',
      password_hash: copy.password_hash,
      mfa_enabled: false,
    });
    const other = await ctx.createAgent();
    await other.login('other@example.test', 'StafDemo!2026');
    expect((await other.agent.get('/api/superadmin/registrations')).body.data.total).toBe(0);
    expect((await review(other, user.id)).status).toBe(404);
    expect((await register({ schoolCode: 'SEKOLAH-LAIN' })).status).toBe(409);
    expect((await review(operator, user.id)).status).toBe(200);
  });

  it('penolakan dan pemulihan sandi tidak dapat melewati persetujuan', async () => {
    await register();
    const user = await ctx.adminDb('users').where({ nisn: form.nisn }).first();
    const operator = await admin();
    const patch = await operator.agent
      .patch(`/api/superadmin/users/${user.id}`)
      .set('x-csrf-token', operator.csrfToken)
      .send({ status: 'active' });
    expect(patch.status).toBe(400);
    expect(
      (
        await operator.agent
          .post(`/api/superadmin/users/${user.id}/recovery-token`)
          .set('x-csrf-token', operator.csrfToken)
          .send({})
      ).status
    ).toBe(400);
    await ctx.adminDb('account_tokens').insert({
      id: crypto.randomUUID(),
      school_id: user.school_id,
      user_id: user.id,
      purpose: 'recovery',
      token_hash: hashToken('REC-TEST-ONLY-123'),
      expires_at: new Date(Date.now() + 3600000),
    });
    const client = await ctx.createAgent();
    const recovered = await client.agent
      .post('/api/auth/recover')
      .set('x-csrf-token', client.csrfToken)
      .send({ accountCode: form.nisn, token: 'REC-TEST-ONLY-123', newPassword: 'TidakBoleh!2026' });
    expect(recovered.status).toBe(400);
    expect((await review(operator, user.id, 'reject')).status).toBe(200);
    expect((await client.login(form.nisn, form.password)).loginRes.status).toBe(401);
    expect((await ctx.adminDb('users').where({ id: user.id }).first()).registration_status).toBe(
      'rejected'
    );
    expect(
      (
        await operator.agent
          .patch(`/api/superadmin/users/${user.id}`)
          .set('x-csrf-token', operator.csrfToken)
          .send({ status: 'active' })
      ).status
    ).toBe(400);
    const resubmitted = await register({
      displayName: 'Data Diperbaiki',
      password: 'SandiBaru!2026',
    });
    expect(resubmitted.status).toBe(202);
    const revised = await ctx.adminDb('users').where({ nisn: form.nisn }).first();
    expect(revised.id).not.toBe(user.id);
    expect(revised.registration_status).toBe('pending');
    expect(await verifyPassword(revised.password_hash, form.password)).toBe(false);
    expect((await review(operator, user.id)).status).toBe(404);
    expect((await client.login(form.nisn, 'SandiBaru!2026')).loginRes.body.error.code).toBe(
      'ACCOUNT_PENDING_APPROVAL'
    );
    expect((await review(operator, revised.id)).status).toBe(200);
    expect((await client.login(form.nisn, 'SandiBaru!2026')).loginRes.status).toBe(200);
  });

  it('pendaftaran paralel mematuhi kuota dan keputusan paralel tidak menggandakan tinjauan', async () => {
    const school = await ctx.adminDb('schools').where({ code: 'SMA-CONTOH-01' }).first();
    const current = Number(
      (
        await ctx
          .adminDb('users')
          .where({ school_id: school.id, role: 'student' })
          .whereNotIn('status', ['inactive', 'deletion_pending'])
          .count('* as count')
          .first()
      ).count
    );
    await ctx
      .adminDb('schools')
      .where({ id: school.id })
      .update({ max_students: current + 1 });
    const results = await Promise.all([register(), register({ nisn: '0098765402' })]);
    expect(results.map((r) => r.status).sort()).toEqual([202, 400]);
    const user = await ctx.adminDb('users').where({ registration_status: 'pending' }).first();
    const operator = await admin();
    const reviewed = await Promise.all([
      review(operator, user.id),
      review(operator, user.id, 'reject'),
    ]);
    expect(reviewed.map((r) => r.status).sort()).toEqual([200, 409]);
    const events = await ctx
      .adminDb('audit_events')
      .where({ target_id: user.id })
      .whereIn('action', ['student_registration_approved', 'student_registration_rejected']);
    expect(events).toHaveLength(1);
  });

  it('akun yang dibuat Superadmin langsung aktif dengan sandi pilihan admin tanpa token aktivasi', async () => {
    const operator = await admin();
    const created = await operator.agent
      .post('/api/superadmin/users')
      .set('x-csrf-token', operator.csrfToken)
      .send({
        accountCode: 'STAF-BARU',
        displayName: 'Staf Pemeriksaan',
        loginEmail: 'staf.baru@example.test',
        role: 'bk',
        password: 'StafBaru!2026',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.user.status).toBe('active');
    expect(created.body.data.activationTokenOnce).toBeUndefined();
    expect(JSON.stringify(created.body)).not.toContain('StafBaru!2026');
    expect(
      await ctx
        .adminDb('account_tokens')
        .where({ user_id: created.body.data.user.id, purpose: 'activation' })
        .first()
    ).toBeUndefined();
    const staff = await ctx.createAgent();
    expect(
      (await staff.login('staf.baru@example.test', 'StafBaru!2026')).loginRes.body.data.nextStep
    ).toBe('bk_dashboard');
    expect((await staff.agent.get('/api/bk/dashboard')).status).toBe(200);
  });
});
