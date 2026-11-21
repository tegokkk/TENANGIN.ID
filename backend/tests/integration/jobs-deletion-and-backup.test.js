import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';
import { exportEncryptedBackup, restoreEncryptedBackup } from '../../scripts/backup-restore.mjs';

describe('Integration: Penghapusan Akun, Tombstone, Backup/Restore, dan Retensi', () => {
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

  it('menghapus akun siswa setelah autentikasi ulang, mencabut sesi, dan menjaga tombstone saat backup/restore', async () => {
    const client = await ctx.createAgent();
    const { loginRes } = await client.login('awan-015', 'SiswaDemo!2026');
    const userId = loginRes.body.data.user.id;

    // Ekspor backup terenkripsi SEBELUM akun dihapus (simulasi snapshot backup lama)
    const oldBackupEncrypted = await exportEncryptedBackup(ctx.adminDb, ctx.env.keyRing);
    expect(oldBackupEncrypted.startsWith('v1:')).toBe(true);
    expect(oldBackupEncrypted).not.toContain('SiswaDemo!2026');

    // Kata sandi salah saat hapus akun -> ditolak
    const wrongPassDel = await client.agent
      .post('/api/me/deletion-request')
      .set('x-csrf-token', client.csrfToken)
      .send({ currentPassword: 'SalahPassword', scope: 'account' });
    expect(wrongPassDel.status).toBe(400);

    // Kata sandi benar -> akun dihapus, sesi dicabut, tombstone dicatat
    const okDel = await client.agent
      .post('/api/me/deletion-request')
      .set('x-csrf-token', client.csrfToken)
      .send({ currentPassword: 'SiswaDemo!2026', scope: 'account' });
    expect(okDel.status).toBe(202);

    const meAfter = await client.agent.get('/api/me');
    expect(meAfter.status).toBe(401);

    const tombstone = await ctx
      .adminDb('deleted_account_tombstones')
      .where({ user_id: userId })
      .first();
    expect(tombstone).toBeTruthy();

    // Jalur yang sama dengan CLI: ledger lokal dipertahankan otomatis sebelum restore backup lama.
    await restoreEncryptedBackup(ctx.adminDb, ctx.env.keyRing, oldBackupEncrypted);

    const resurrectedUser = await ctx.adminDb('users').where({ id: userId }).first();
    expect(resurrectedUser).toBeUndefined();
  });

  it('menjalankan job agregasi mingguan dan pembersihan retensi melalui endpoint Superadmin', async () => {
    const admin = await ctx.createAgent();
    await admin.login('superadmin@tenangin.id', 'StafDemo!2026', 'KRSXG5CTMVRXEZLU');

    const aggRes = await admin.agent
      .post('/api/superadmin/jobs/aggregate-weekly')
      .set('x-csrf-token', admin.csrfToken)
      .send({ weekStart: '2026-11-09' });
    expect(aggRes.status).toBe(200);
    expect(aggRes.body.data.metricsComputed).toBeGreaterThanOrEqual(4);

    const retRes = await admin.agent
      .post('/api/superadmin/jobs/cleanup-retention')
      .set('x-csrf-token', admin.csrfToken)
      .send({});
    expect(retRes.status).toBe(200);
    expect(retRes.body.data.summary).toHaveProperty('expiredTokens');
  });
});
