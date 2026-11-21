import { expect, test } from './fixtures.js';
import { createTestContext } from '../../../backend/tests/setup/test-app.js';
import { purgeDummyDatabase } from '../../../backend/scripts/purge-demo-data.mjs';
import { provisionFirstAdmin } from '../../../backend/scripts/bootstrap-admin.js';

test.use({ actionTimeout: 10000 });

async function prepareApprovedAccount() {
  const ctx = createTestContext();
  try {
    for (const raw of [ctx.env.DATABASE_URL, ctx.env.TEST_DATABASE_URL]) {
      const url = new URL(raw);
      if (url.hostname !== '127.0.0.1' || url.port !== '5433' || url.pathname !== '/tenangin_test')
        throw Error('Unexpected E2E database');
    }
    await purgeDummyDatabase(ctx.adminDb, { expectedDatabase: 'tenangin_test', apply: true });
    await provisionFirstAdmin({
      db: ctx.adminDb,
      env: ctx.env,
      settings: {
        schoolCode: 'SMA-CONTOH-01',
        schoolName: 'Pengujian Dashboard Terisolasi',
        adminEmail: 'operator@example.test',
        adminPassword: 'PengelolaPengujian!2026',
      },
    });
    const student = await ctx.createAgent();
    const registration = await student.agent
      .post('/api/auth/register')
      .set('x-csrf-token', student.csrfToken)
      .send({
        displayName: 'Siswa Alur Lengkap',
        nisn: '0091100012',
        gradeGroup: 'X A',
        password: 'SiswaPengujian!2026',
      });
    if (registration.status !== 202) throw Error('Registration fixture failed');
    const user = await ctx.adminDb('users').where({ nisn: '0091100012' }).first();
    const operator = await ctx.createAgent();
    await operator.login('operator@example.test', 'PengelolaPengujian!2026');
    const reviewed = await operator.agent
      .post(`/api/superadmin/users/${user.id}/registration-review`)
      .set('x-csrf-token', operator.csrfToken)
      .send({ decision: 'approve' });
    if (reviewed.status !== 200) throw Error('Approval fixture failed');
  } finally {
    await ctx.teardown();
  }
}

test('Dashboard bersih: akun disetujui dapat memakai mood, tugas, jeda, pengingat, catatan, refleksi, dan bantuan', async ({
  page,
}) => {
  test.setTimeout(90000);
  await prepareApprovedAccount();
  const failures = [];
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400)
      failures.push(`${res.status()} ${res.url()}`);
  });
  page.on('pageerror', (error) => failures.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/i).fill('0091100012');
  await page.getByLabel(/Kata Sandi/i).fill('SiswaPengujian!2026');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole('button', { name: 'Simpan Suasana Hati', exact: true })
  ).toBeVisible();
  await expect(page.getByText(/Pengelola belum menyiapkan kebijakan data/i)).toHaveCount(0);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    if (width === 390)
      await page.screenshot({ path: test.info().outputPath('dashboard-active-390.png') });
  }
  await page.getByRole('radio', { name: /Tenang \/ Lega/i }).click();
  await page.getByRole('button', { name: 'Simpan Suasana Hati', exact: true }).click();
  await expect(page.getByText('Tersimpan untuk hari ini.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
  await page.getByRole('textbox', { name: /Tambah tugas/i }).fill('Tugas pada dashboard bersih');
  await page.getByRole('dialog').getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
  await expect(page.getByText('Tugas pada dashboard bersih', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Langkah (0)', exact: true }).click();
  await page.getByPlaceholder('Tambah langkah kecil...').fill('Langkah pada dashboard bersih');
  await page.getByRole('button', { name: 'Tambah Langkah', exact: true }).click();
  await expect(page.getByText('Langkah pada dashboard bersih', { exact: true })).toBeVisible();
  await page.getByText('Jadwal Istirahat & Tidur', { exact: true }).click();
  await page.getByRole('button', { name: 'Tambah Blok Istirahat', exact: true }).click();
  await page
    .getByLabel('Nama jeda / istirahat', { exact: true })
    .fill('Jeda pada dashboard bersih');
  await page.getByRole('button', { name: 'Simpan Blok', exact: true }).click();
  await expect(page.getByText(/Jeda pada dashboard bersih/)).toBeVisible();
  await page.getByText('Pengaturan Pengingat', { exact: true }).click();
  await page.getByRole('switch', { name: 'Nonaktif', exact: true }).click();
  await expect(page.getByText('Preferensi pengingat disimpan.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Tugas pada dashboard bersih', { exact: true })).toBeVisible();
  await page.getByText('Pengaturan Pengingat', { exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Aktif', exact: true })).toBeChecked();

  await page.goto('/app/tenang');
  await expect(page.getByRole('heading', { name: 'Jeda Belajar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mulai Latihan', exact: true }).click();
  await page.getByRole('button', { name: 'Jeda', exact: true }).click();
  await page.getByRole('button', { name: 'Lanjut', exact: true }).click();
  await page.getByRole('button', { name: 'Langkah Berikutnya', exact: true }).click();
  await expect(page.getByText(/Lihat benda-benda di sekitarmu/i)).toBeVisible();
  await page.getByRole('button', { name: 'Berhenti', exact: true }).click();
  await expect(
    page.getByText('Latihan dihentikan. Kamu bisa kembali kapan pun.', { exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Mulai dari Satu Langkah/i })).toBeVisible();

  await page.goto('/app/catat');
  await page.getByLabel(/1\. Apa yang terjadi/i).fill('Situasi pada dashboard bersih');
  await page.getByLabel(/2\. Apa yang kamu pikirkan/i).fill('Pikiran pengujian');
  await page.getByLabel(/3\. Apa yang kamu rasakan/i).fill('Tenang');
  await page.getByRole('button', { name: 'Simpan Jurnal', exact: true }).click();
  await expect(page.getByText('Catatan jurnal berhasil disimpan.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Situasi pada dashboard bersih', { exact: true })).toBeVisible();
  await page.goto('/app/refleksi');
  await page.getByLabel(/1\. Apa yang membantumu/i).fill('Jeda belajar');
  await page.getByLabel(/2\. Apa hambatannya/i).fill('Waktu terbatas');
  await page.getByLabel(/3\. Apa rencana kecilmu/i).fill('Satu langkah');
  await page.getByRole('button', { name: 'Simpan Refleksi', exact: true }).click();
  await expect(
    page.getByText('Refleksi mingguan berhasil disimpan.', { exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/1\. Apa yang membantumu/i)).toHaveValue('Jeda belajar');
  await page.goto('/app/bantuan');
  await page.getByLabel(/Pesan singkat/i).fill('Permintaan dari dashboard bersih');
  await page.getByRole('button', { name: 'Tinjau Permintaan', exact: true }).click();
  await page.getByRole('button', { name: 'Kirim Permintaan ke Superadmin', exact: true }).click();
  await expect(page.getByText(/Permintaan tersimpan/i)).toBeVisible();

  await page.getByRole('button', { name: /Buka pengaturan akun/i }).click();
  await page.getByRole('button', { name: 'Jeda Pencatatan', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, Jeda Pencatatan', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/persetujuan$/);
  await page.getByRole('button', { name: 'Aktifkan Kembali', exact: true }).click();
  await page.getByRole('link', { name: 'Kembali ke Beranda', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Simpan Suasana Hati', exact: true })
  ).toBeVisible();
  const state = (await (await page.request.get('/api/auth/session')).json()).data;
  expect(state.consentStatus.canUsePersonalFeatures).toBe(true);
  expect(state.consentStatus.hasActiveConsent).toBe(false);
  expect(failures).toEqual([]);
});
