import { expect, test } from './fixtures.js';
import { createTestContext } from '../../../backend/tests/setup/test-app.js';
import { generateTotpCode } from './helpers.js';

async function configureTestSchool(update) {
  const ctx = createTestContext();
  try {
    for (const raw of [ctx.env.DATABASE_URL, ctx.env.TEST_DATABASE_URL]) {
      const url = new URL(raw);
      if (url.hostname !== '127.0.0.1' || url.pathname !== '/tenangin_test') {
        throw new Error('This fixture may only update the local E2E test database.');
      }
    }
    await update(ctx.adminDb);
  } finally {
    await ctx.teardown();
  }
}

async function loginStudent(page) {
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/i).fill('bintang-014');
  await page.getByLabel(/Kata Sandi/i).fill('SiswaDemo!2026');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test('Akun aktif masuk tanpa kebijakan, tetap dapat menavigasi, lalu memakai fitur setelah kebijakan diterbitkan', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await configureTestSchool(async (db) => {
    await db('consent_policies').update({ is_active: false });
  });
  const uiFailures = [];
  const privateReads = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      uiFailures.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('request', (request) => {
    if (
      /\/api\/(moods|journals|reflections|tasks|schedule-blocks|reminders)(?:[/?]|$)/.test(
        request.url()
      )
    ) {
      privateReads.push(request.url());
    }
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginStudent(page);
  await expect(page.getByRole('heading', { name: /Selamat datang/i })).toBeVisible();
  await expect(page.getByText(/Pengelola belum menyiapkan kebijakan data/i)).toBeVisible();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    if (width === 390)
      await page.screenshot({ path: test.info().outputPath('active-student-no-policy-390.png') });
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: /Selamat datang/i })).toBeVisible();
  await page.getByRole('link', { name: 'Buka Pustaka', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/pustaka$/);
  await expect(page.getByRole('button', { name: /Mulai Latihan/i })).toBeVisible();
  for (const path of ['/app/catat', '/app/refleksi', '/persetujuan']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Fitur Pribadi', exact: true })).toBeVisible();
    await expect(page.getByText(/Pengelola belum menyiapkan kebijakan data/i)).toBeVisible();
    await expect(page).not.toHaveURL(/\/masuk/);
  }
  await page.goto('/app/bantuan');
  await expect(page.getByRole('heading', { name: /Mengirim Permintaan Bantuan/i })).toBeVisible();
  await page.goto('/masuk?step=consent');
  await expect(page).toHaveURL(/\/app$/);
  const session = (await (await page.request.get('/api/auth/session')).json()).data;
  expect(session.authenticated).toBe(true);
  expect(session.nextStep).toBe('student_home');
  expect(session.consentStatus.hasActiveConsent).toBe(false);
  expect(session.consentStatus.activePolicyVersion).toBeNull();
  expect(uiFailures).toEqual([]);
  expect(privateReads).toEqual([]);

  const adminContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' });
  try {
    const admin = await adminContext.newPage();
    await admin.goto('/masuk');
    await admin.getByRole('button', { name: 'Guru BK & Superadmin', exact: true }).click();
    await admin.getByLabel(/Kode Akun atau Email/i).fill('superadmin@tenangin.id');
    await admin.getByLabel(/Kata Sandi/i).fill('StafDemo!2026');
    await admin.getByRole('button', { name: 'Masuk', exact: true }).click();
    await admin.getByLabel(/Kode 6 Digit/i).fill(generateTotpCode('KRSXG5CTMVRXEZLU'));
    await admin.getByRole('button', { name: /Verifikasi & Masuk Dashboard/i }).click();
    await expect(admin).toHaveURL(/\/superadmin$/);
    await admin.getByRole('tab', { name: /Pengaturan/i }).click();
    await expect(
      admin.getByRole('heading', { name: 'Kebijakan Data Siswa', exact: true })
    ).toBeVisible();
    await admin.getByText('Siapkan Kebijakan Data', { exact: true }).click();
    await admin.getByLabel('Versi Kebijakan', { exact: true }).fill('e2e-2.0');
    await admin
      .getByLabel('Judul Kebijakan', { exact: true })
      .fill('Kebijakan Pengujian Terisolasi');
    await admin
      .getByLabel('Ringkasan Kebijakan', { exact: true })
      .fill('Ringkasan untuk pengujian alur kebijakan data.');
    await admin
      .getByLabel('Isi Kebijakan Data', { exact: true })
      .fill(
        'Kebijakan khusus pengujian pada database tenangin_test, bukan kebijakan sekolah nyata.'
      );
    await admin
      .getByLabel('Informasi Akses Data', { exact: true })
      .fill('Akses data mengikuti peran pengguna pengujian.');
    for (const width of [320, 390, 1280]) {
      await admin.setViewportSize({ width, height: 900 });
      expect(
        await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true);
    }
    await admin.getByRole('button', { name: 'Tinjau Penerbitan', exact: true }).click();
    await admin
      .getByRole('dialog')
      .getByRole('button', { name: 'Terbitkan Kebijakan', exact: true })
      .click();
    await expect(
      admin.getByText(/Kebijakan diterbitkan. Siswa dapat memberikan persetujuan/i)
    ).toBeVisible();
    await page.getByRole('button', { name: 'Periksa Status', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Kebijakan data siswa' })).toContainText(
      'e2e-2.0'
    );
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Setujui Kebijakan Data', exact: true }).click();
    await expect(page.getByRole('button', { name: /Simpan Suasana Hati/i })).toBeVisible();
    const accepted = (await (await page.request.get('/api/auth/session')).json()).data;
    expect(accepted.consentStatus.hasActiveConsent).toBe(true);
    expect(accepted.consentStatus.activePolicyVersion).toBe('e2e-2.0');
    await page.getByRole('button', { name: /Buka pengaturan akun/i }).click();
    await page.getByRole('button', { name: 'Tarik Persetujuan', exact: true }).click();
    await page.getByRole('button', { name: 'Ya, Tarik Persetujuan', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/persetujuan$/);
    await expect(
      page.getByRole('button', { name: 'Setujui Kebijakan Data', exact: true })
    ).toBeVisible();
    await page.getByRole('link', { name: 'Buka Pustaka', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/pustaka$/);
    const withdrawn = (await (await page.request.get('/api/auth/session')).json()).data;
    expect(withdrawn.authenticated).toBe(true);
    expect(withdrawn.consentStatus.hasActiveConsent).toBe(false);
    expect(uiFailures).toEqual([]);
  } finally {
    await adminContext.close();
  }
});

test('Menunggu persetujuan wali tetap berada di ruang siswa tanpa berulang ke login', async ({
  page,
}) => {
  await configureTestSchool(async (db) => {
    await db('schools').update({ guardian_consent_required: true });
  });
  await loginStudent(page);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Setujui Kebijakan Data', exact: true }).click();
  await expect(page.getByText(/Fitur pribadi menunggu konfirmasi persetujuan wali/i)).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText(/Fitur pribadi menunggu konfirmasi persetujuan wali/i)).toBeVisible();
  await page.getByRole('link', { name: 'Buka Pustaka', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/pustaka$/);
});
