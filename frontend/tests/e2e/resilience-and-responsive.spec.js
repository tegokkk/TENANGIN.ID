import { expect, test } from './fixtures.js';

test('Responsif 320px/390px/1280px, Bantuan selalu tersedia, & ketahanan gagal simpan (T70, T71)', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Butuh bicara\?/i }).first()).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasOverflow).toBe(false);
  }

  // Masuk sebagai siswa pada lebar mobile 390px dan uji navigasi bawah & ketahanan gagal simpan
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/i).fill('awan-028');
  await page.getByLabel(/Kata Sandi/i).fill('SiswaDemo!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('navigation', { name: /Navigasi bawah siswa/i })).toBeVisible();

  // Navigasi ke Catat, simulasikan API gagal -> input tetap terjaga!
  await page.getByRole('link', { name: 'Catat', exact: true }).last().click();
  await expect(page).toHaveURL(/\/app\/catat/);

  await page.route('**/api/journals', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { code: 'OFFLINE', message: 'Simulasi gagal koneksi saat simpan.' },
        }),
      });
    }
    return route.continue();
  });

  const sit = page.getByLabel(/1\. Apa yang terjadi/i);
  await sit.fill('Teks penting siswa saat koneksi putus');
  await page.getByLabel(/2\. Apa yang kamu pikirkan/i).fill('Tetap terjaga di memori');
  await page.getByLabel(/3\. Apa yang kamu rasakan/i).fill('Waspada');
  await page.getByRole('button', { name: /Simpan Jurnal/i }).click();

  await expect(page.getByText(/Simulasi gagal koneksi saat simpan/i)).toBeVisible();
  await expect(sit).toHaveValue('Teks penting siswa saat koneksi putus');
});
