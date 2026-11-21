import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';
import { purgeDummyDatabase } from '../../scripts/purge-demo-data.mjs';
import { provisionFirstAdmin } from '../../scripts/bootstrap-admin.js';
import { assertNoDummyData } from '../../src/config/production-data.js';
import { verifyPassword } from '../../src/lib/password.js';

describe('Pembersihan fixture dan provisioning production kosong', () => {
  let ctx;
  let database;
  beforeAll(() => {
    ctx = createTestContext();
    database = decodeURIComponent(new URL(ctx.env.TEST_DATABASE_URL).pathname.slice(1));
  });
  beforeEach(async () => {
    await ctx.resetAndSeed();
  });
  afterAll(async () => {
    await ctx.teardown();
  });

  it('memeriksa tanpa mengubah, menghapus seluruh tabel aplikasi, dan mempertahankan migrasi', async () => {
    const migrations = await ctx.adminDb('knex_migrations').count('* as count').first();
    const dryRun = await purgeDummyDatabase(ctx.adminDb, { expectedDatabase: database });
    expect(dryRun.applied).toBe(false);
    expect(Number((await ctx.adminDb('users').count('* as count').first()).count)).toBeGreaterThan(
      0
    );
    await expect(assertNoDummyData(ctx.appDb)).rejects.toThrow();
    await purgeDummyDatabase(ctx.adminDb, { expectedDatabase: database, apply: true });
    for (const table of Object.keys(dryRun.before)) {
      expect(Number((await ctx.adminDb(table).count('* as count').first()).count), table).toBe(0);
    }
    expect(await ctx.adminDb('knex_migrations').count('* as count').first()).toEqual(migrations);
    await expect(assertNoDummyData(ctx.appDb)).resolves.toBeUndefined();
    const client = await ctx.createAgent();
    const config = await client.agent.get('/api/public/config');
    expect(config.body.data.school).toBeNull();
    expect(config.body.data.schools).toEqual([]);
    expect(config.headers['cache-control']).toContain('no-store');
    expect((await client.login('awan-028', 'SiswaDemo!2026')).loginRes.status).toBe(401);
    expect((await client.login('0081234567', 'SiswaPassword!2026')).loginRes.status).toBe(401);
  });

  it('menolak target berbeda, nama production, dan sekolah di luar fixture tanpa menghapus data', async () => {
    await expect(
      purgeDummyDatabase(ctx.adminDb, { expectedDatabase: 'tenangin_production', apply: true })
    ).rejects.toThrow();
    await expect(
      purgeDummyDatabase(ctx.adminDb, { expectedDatabase: 'tenangin_wrong_test', apply: true })
    ).rejects.toThrow();
    await ctx.adminDb('schools').insert({
      id: crypto.randomUUID(),
      code: 'SEKOLAH-RESMI',
      name: 'Sekolah Pemeriksaan Terisolasi',
      timezone: 'Asia/Jakarta',
    });
    const before = await ctx.adminDb('users').count('* as count').first();
    await expect(
      purgeDummyDatabase(ctx.adminDb, { expectedDatabase: database, apply: true })
    ).rejects.toThrow('di luar fixture');
    expect(await ctx.adminDb('users').count('* as count').first()).toEqual(before);
    expect(await ctx.adminDb('schools').where({ code: 'SEKOLAH-RESMI' }).first()).toBeDefined();
  });

  it('bootstrap membuat satu admin dengan login sandi tanpa siswa, persetujuan otomatis, kontak, atau materi fiktif', async () => {
    await purgeDummyDatabase(ctx.adminDb, { expectedDatabase: database, apply: true });
    const settings = {
      schoolCode: 'SEKOLAH-RESMI',
      schoolName: 'Sekolah Pemeriksaan Terisolasi',
      timezone: 'Asia/Makassar',
      adminCode: 'Pengelola-01',
      adminEmail: 'operator@example.test',
      adminPassword: 'OperatorUnique!2026',
    };
    await expect(
      provisionFirstAdmin({ db: ctx.adminDb, env: ctx.env, settings: {} })
    ).rejects.toThrow('BOOTSTRAP_ADMIN_EMAIL');
    const result = await provisionFirstAdmin({ db: ctx.adminDb, env: ctx.env, settings });
    const admin = await ctx.adminDb('users').where({ id: result.adminId }).first();
    expect(admin.mfa_enabled).toBe(false);
    expect(admin.mfa_secret_encrypted).toBeNull();
    expect(admin.mfa_recovery_hashes).toBeNull();
    expect(result.totpSecret).toBeNull();
    const client = await ctx.createAgent();
    const login = await client.login(settings.adminEmail, settings.adminPassword);
    expect(login.loginRes.status).toBe(200);
    expect(login.loginRes.body.data.nextStep).toBe('superadmin_dashboard');
    expect((await client.agent.get('/api/superadmin/dashboard')).status).toBe(200);
    expect(await verifyPassword(admin.password_hash, settings.adminPassword)).toBe(true);
    expect(await verifyPassword(admin.password_hash, 'AdminPassword!2026')).toBe(false);
    const school = await ctx.adminDb('schools').where({ id: result.schoolId }).first();
    expect(school.active_handler_configured).toBe(true);
    expect(school.personal_access_mode).toBe('account_approval');
    expect(school.guardian_consent_required).toBe(false);
    expect(school.verified_contacts).toEqual([]);
    expect(school.service_hours).toBe('');
    const reviews = await ctx.adminDb('governance_reviews').where({ school_id: result.schoolId });
    expect(reviews).toHaveLength(8);
    expect(reviews.every((row) => row.status === 'pending_review' && !row.reviewer_name)).toBe(
      true
    );
    for (const table of ['consents', 'consent_policies', 'screening_instruments']) {
      expect(Number((await ctx.adminDb(table).count('* as count').first()).count)).toBe(0);
    }
    expect(await ctx.adminDb('exercise_contents').select('slug')).toEqual([
      { slug: 'jeda-belajar-mandiri' },
    ]);
    expect(await ctx.adminDb('articles').select('id')).toHaveLength(3);
    expect(await ctx.adminDb('exercise_contents').whereNotNull('reviewer_ref')).toHaveLength(0);
    await expect(provisionFirstAdmin({ db: ctx.adminDb, env: ctx.env, settings })).rejects.toThrow(
      'sudah tersedia'
    );
    expect(Number((await ctx.adminDb('users').count('* as count').first()).count)).toBe(1);
    await expect(
      provisionFirstAdmin({
        db: ctx.adminDb,
        env: ctx.env,
        settings: { ...settings, schoolCode: 'SEKOLAH-LAIN' },
      })
    ).rejects.toThrow();
    expect(await ctx.adminDb('schools').where({ code: 'SEKOLAH-LAIN' }).first()).toBeUndefined();
  });

  it.each([
    ['tidak diisi', {}],
    ['kosong', { schoolCode: '  ', schoolName: '' }],
  ])(
    'bootstrap tanpa identitas sekolah (%s) membuat ruang kerja dan admin yang dapat login',
    async (_label, workspaceSettings) => {
      await purgeDummyDatabase(ctx.adminDb, { expectedDatabase: database, apply: true });
      const settings = {
        ...workspaceSettings,
        adminEmail: 'pengelola@example.test',
        adminPassword: 'OperatorUnique!2026',
      };
      await expect(
        provisionFirstAdmin({
          db: ctx.adminDb,
          env: ctx.env,
          settings: { ...settings, adminPassword: 'pendek' },
        })
      ).rejects.toThrow('BOOTSTRAP_ADMIN_PASSWORD');
      expect(await ctx.adminDb('schools').select('id')).toHaveLength(0);

      const result = await provisionFirstAdmin({ db: ctx.adminDb, env: ctx.env, settings });
      const workspace = await ctx.adminDb('schools').where({ id: result.schoolId }).first();
      expect(workspace).toMatchObject({
        code: 'TENANGIN-ID',
        name: 'TENANGIN.ID',
        timezone: 'Asia/Jakarta',
        personal_access_mode: 'account_approval',
      });
      const admin = await ctx.adminDb('users').where({ id: result.adminId }).first();
      expect(admin).toMatchObject({
        school_id: workspace.id,
        role: 'superadmin',
        account_code: 'Superadmin-01',
        display_name: 'Superadmin',
      });
      const client = await ctx.createAgent();
      const login = await client.login(settings.adminEmail, settings.adminPassword);
      expect(login.loginRes.status).toBe(200);
      expect(login.loginRes.body.data.nextStep).toBe('superadmin_dashboard');
      expect((await client.agent.get('/api/superadmin/dashboard')).status).toBe(200);
      await expect(assertNoDummyData(ctx.appDb)).resolves.toBeUndefined();

      await expect(
        provisionFirstAdmin({ db: ctx.adminDb, env: ctx.env, settings })
      ).rejects.toThrow('sudah tersedia');
      expect(await ctx.adminDb('schools').select('id')).toHaveLength(1);
      expect(await ctx.adminDb('users').select('id')).toHaveLength(1);
    }
  );
});
