import { expect, test } from './fixtures.js';
import { generateTotpCode } from './helpers.js';

test('Pilihan Guru BK tidak ikut terfilter oleh daftar akun; galat formulir terlihat dan bisa dicoba ulang', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/i).fill('superadmin@tenangin.id');
  await page.getByLabel('Kata Sandi', { exact: true }).fill('StafDemo!2026');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.getByLabel(/Kode 6 Digit/).fill(generateTotpCode('KRSXG5CTMVRXEZLU'));
  await page.getByRole('button', { name: /Verifikasi & Masuk Dashboard/ }).click();
  await expect(page).toHaveURL(/\/superadmin$/);
  await page.getByRole('tab', { name: 'Akun & Role', exact: true }).click();
  await page.getByLabel('Filter role', { exact: true }).selectOption('student');
  await page.getByLabel('Cari Kode Akun / Nama', { exact: true }).fill('Awan');
  await page.getByRole('button', { name: 'Tambah Penugasan', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Tambah Penugasan Guru BK' });
  await expect(
    dialog.getByLabel('Pilih Guru BK', { exact: true }).locator('option')
  ).not.toHaveCount(0);
  await dialog.getByLabel('Kelompok Penugasan', { exact: true }).fill('Kelas XI');
  await dialog.getByLabel('Periode Penugasan', { exact: true }).fill('Periode uji filter');
  await page.route('**/api/superadmin/assignments', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Penugasan gagal disimpan sementara.' },
          }),
        })
      : route.continue()
  );
  await dialog.getByRole('button', { name: 'Simpan Penugasan', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Penugasan gagal disimpan sementara.');
  await expect(dialog.getByLabel('Periode Penugasan', { exact: true })).toHaveValue(
    'Periode uji filter'
  );
  await page.unroute('**/api/superadmin/assignments');
  await dialog.getByRole('button', { name: 'Simpan Penugasan', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByText('Periode uji filter', { exact: true })).toBeVisible();
});
