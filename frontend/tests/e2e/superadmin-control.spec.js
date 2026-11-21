import { expect, test } from './fixtures.js';
import { generateTotpCode } from './helpers.js';

test('Alur E2E Superadmin (T69): Login + MFA -> 6 Tab Kendali & Audit Data Siswa', async ({
  page,
}) => {
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/i).fill('superadmin@tenangin.id');
  await page.getByLabel(/Kata Sandi/i).fill('StafDemo!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();

  await expect(page.getByRole('heading', { name: /Masukkan Kode Authenticator/i })).toBeVisible();
  const totp = generateTotpCode('KRSXG5CTMVRXEZLU');
  await page.getByLabel(/Kode 6 Digit/i).fill(totp);
  await page.getByRole('button', { name: /Verifikasi & Masuk Dashboard/i }).click();

  await expect(page).toHaveURL(/\/superadmin$/);
  await expect(page.getByRole('heading', { name: /Dashboard Superadmin/i })).toBeVisible();

  // Tab 2: Akun & Role
  await page.getByRole('tab', { name: /Akun & Role/i }).click();
  await expect(page.getByText(/Daftar Akun Pengguna/i)).toBeVisible();

  // Tab 3: Data Siswa (inspeksi teraudit)
  await page.getByRole('tab', { name: /Data Siswa/i }).click();
  const select = page.getByLabel(/Pilih Akun Siswa/i);
  await select.selectOption({ index: 1 });
  await expect(page.getByText(/Akses pembacaan ini otomatis dicatat/i)).toBeVisible();

  // Tab 4: Konten
  await page.getByRole('tab', { name: /Konten/i }).click();
  await expect(page.getByText(/Alur Penerbitan Artikel/i)).toBeVisible();

  // Tab 5: Bantuan & Pesan
  await page.getByRole('tab', { name: /Bantuan & Pesan/i }).click();
  await expect(page.getByText(/Antrean Permintaan Bantuan/i)).toBeVisible();

  // Tab 6: Pengaturan & Audit -> pastikan pembacaan data siswa tercatat di log audit
  await page.getByRole('tab', { name: /Pengaturan & Audit/i }).click();
  await expect(page.getByText(/superadmin_read_student_data/i).first()).toBeVisible();
});
