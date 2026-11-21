import { expect, test } from './fixtures.js';

test('Antarmuka publik bersih dari badge demo dan kredensial akun uji', async ({ page }) => {
  for (const route of ['/', '/masuk', '/pustaka', '/bantuan']) {
    await page.goto(route);
    await expect(page.getByText(/^(Mode contoh|Demo|Akun demo:)$/i)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Awan-028|BK-Rani-01|Admin-Root-01|Pasang Aplikasi/ })
    ).toHaveCount(0);
  }
  await page.goto('/masuk');
  await expect(page.getByRole('list', { name: 'Daftar Akun Siswa' })).toHaveCount(0);
  await expect(
    page.getByText(/SiswaPassword!2026|AdminPassword!2026|StafPassword!2026/)
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Gunakan akun/i })).toHaveCount(0);
  await expect(page.getByLabel(/Kode Akun atau Email/i)).toHaveValue('');
  await expect(page.getByLabel(/Kata Sandi/i)).toHaveValue('');
});
