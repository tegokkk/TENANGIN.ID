import { expect, test } from './fixtures.js';
import { generateTotpCode } from './helpers.js';

test('Siswa mendaftar tanpa token, Superadmin menyetujui, lalu siswa dapat masuk', async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/aktivasi');
  await expect(page).toHaveURL(/\/daftar$/);
  await expect(page.getByLabel('Token Aktivasi', { exact: true })).toHaveCount(0);
  await page.goto('/masuk');
  await page.getByRole('button', { name: 'Daftar Akun', exact: true }).click();
  await expect(page).toHaveURL(/\/daftar$/);
  await expect(page.getByLabel('Nama Lengkap', { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    if (width === 390)
      await page.screenshot({ path: test.info().outputPath('registration-form-390.png') });
  }
  await page.getByLabel('Nama Lengkap', { exact: true }).fill('Siswa Registrasi E2E');
  await page.getByLabel('NISN', { exact: true }).fill('0099900011');
  await page.getByLabel('Kelas', { exact: true }).fill('X IPA 2');
  await page.getByLabel('Kata Sandi Pendaftaran', { exact: true }).fill('SandiPendaftaran!2026');
  await page.getByLabel('Konfirmasi Kata Sandi', { exact: true }).fill('BelumSama!2026');
  await page.getByRole('button', { name: 'Daftar Akun', exact: true }).click();
  await expect(page.getByText('Konfirmasi sandi belum sama.')).toBeVisible();
  await expect(page.getByLabel('Nama Lengkap', { exact: true })).toHaveValue(
    'Siswa Registrasi E2E'
  );
  await page.getByLabel('Konfirmasi Kata Sandi', { exact: true }).fill('SandiPendaftaran!2026');
  await page.getByRole('button', { name: 'Daftar Akun', exact: true }).click();
  await expect(page.getByText(/Pendaftaran terkirim/i)).toBeVisible();
  await page.getByRole('button', { name: 'Kembali ke Masuk', exact: true }).click();
  await page.getByLabel(/Kata Sandi/i).fill('SandiPendaftaran!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();
  await expect(page.getByText(/Akunmu masih menunggu persetujuan Superadmin/i)).toBeVisible();

  const adminContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' });
  try {
    const admin = await adminContext.newPage();
    await admin.goto('/masuk');
    await admin.getByRole('button', { name: 'Guru BK & Superadmin', exact: true }).click();
    await admin.getByLabel(/Kode Akun atau Email/i).fill('superadmin@tenangin.id');
    await admin.getByLabel(/Kata Sandi/i).fill('StafDemo!2026');
    await admin.getByRole('button', { name: /^Masuk$/i }).click();
    await admin.getByLabel(/Kode 6 Digit/i).fill(generateTotpCode('KRSXG5CTMVRXEZLU'));
    await admin.getByRole('button', { name: /Verifikasi & Masuk Dashboard/i }).click();
    await expect(admin).toHaveURL(/\/superadmin$/);
    await expect(
      admin.getByRole('heading', { name: 'Pendaftaran Siswa', exact: true })
    ).toBeVisible();
    for (const width of [320, 390, 768, 1280]) {
      await admin.setViewportSize({ width, height: 900 });
      expect(
        await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true);
      if (width === 390) {
        await admin
          .getByRole('heading', { name: 'Pendaftaran Siswa', exact: true })
          .scrollIntoViewIfNeeded();
        await admin.screenshot({ path: test.info().outputPath('registration-queue-390.png') });
      }
    }
    await admin.getByRole('button', { name: 'Setujui & Aktifkan', exact: true }).click();
    const dialog = admin.getByRole('dialog', { name: 'Setujui Pendaftaran Siswa', exact: true });
    await expect(dialog.getByText(/Siswa Registrasi E2E/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Konfirmasi Persetujuan', exact: true }).click();
    await expect(admin.getByText(/Pendaftaran disetujui. Siswa dapat masuk/i)).toBeVisible();

    await page.getByRole('button', { name: /^Masuk$/i }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByRole('heading', { name: /Selamat datang, Siswa Registrasi E2E/i })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fitur Pribadi', exact: true })).toBeVisible();
    const session = await (await page.request.get('/api/auth/session')).json();
    expect(session.data.authenticated).toBe(true);
    expect(session.data.user.nisn).toBe('0099900011');
    expect(session.data.consentStatus.hasActiveConsent).toBe(false);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Setujui Kebijakan Data', exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('button', { name: /Simpan Suasana Hati/i })).toBeVisible();
  } finally {
    await adminContext.close();
  }
});
