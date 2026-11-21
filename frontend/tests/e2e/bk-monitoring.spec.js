import { expect, test } from './fixtures.js';
import { generateTotpCode } from './helpers.js';

test('Alur E2E BK Read-Only (T68): Login + MFA -> Dashboard BK -> Tolak akses Superadmin/Siswa', async ({
  page,
}) => {
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/i).fill('rani.bk@sekolah.sch.id');
  await page.getByLabel(/Kata Sandi/i).fill('StafDemo!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();

  await expect(page.getByRole('heading', { name: /Masukkan Kode Authenticator/i })).toBeVisible();
  const totp = generateTotpCode('JBSWY3DPEHPK3PXP');
  await page.getByLabel(/Kode 6 Digit/i).fill(totp);
  await page.getByRole('button', { name: /Verifikasi & Masuk Dashboard/i }).click();

  await expect(page).toHaveURL(/\/bk$/);
  await expect(page.getByRole('heading', { name: /Dashboard BK/i })).toBeVisible();
  await expect(page.getByText(/Akses pemantauan \(Read-Only\)/i).first()).toBeVisible();
  await expect(page.getByText(/Data belum cukup untuk ditampilkan/i).first()).toBeVisible();

  // Pastikan Senja-099 (Kelas XII di luar penugasan Bu Rani) tidak muncul
  await expect(page.getByText('Senja-099')).toHaveCount(0);

  // Manipulasi URL ke /superadmin dan /app/catat tetap ditolak
  await page.goto('/superadmin');
  await expect(page.getByText(/Halaman tidak tersedia untuk peranmu/i)).toBeVisible();

  await page.goto('/app/catat');
  await expect(page.getByText(/Halaman tidak tersedia untuk peranmu/i)).toBeVisible();
});
