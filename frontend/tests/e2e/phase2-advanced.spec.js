import { expect, test } from './fixtures.js';
import { generateTotpCode } from './helpers.js';

test('Alur E2E Fase Lanjutan (L01-L05 & T73): PWA Assets, Audio/Ilustrasi, Push UI, Ekspor 3 Role, Kapasitas & Review T73', async ({
  page,
  request,
}) => {
  // 1. L02 PWA & L03 Audio Assets tersedia langsung
  for (const assetPath of [
    '/manifest.webmanifest',
    '/sw.js',
    '/icons/icon-192.png',
    '/audio/napas-terpandu-4-4-4.wav',
  ]) {
    const res = await request.get(assetPath);
    expect(res.status()).toBe(200);
  }

  // 2. Siswa Awan-028: cek Push Opt-In UI di Beranda, Audio/Ilustrasi di Tenang, & Ekspor di Panel Akun
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/i).fill('Awan-028');
  await page.getByLabel(/Kata Sandi/i).fill('SiswaDemo!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();
  await expect(page).toHaveURL(/\/app$/);

  await page.getByText('Pengaturan Pengingat', { exact: true }).click();
  await expect(page.getByText(/Notifikasi Browser \(Sukarela\)/i)).toBeVisible();
  await page.getByRole('button', { name: /Aktifkan Push Perangkat Ini/i }).click();
  await expect(
    page.getByText(/Push eksternal|notifikasi|ditolak|Langganan push/i).first()
  ).toBeVisible();

  // D03 Tenang: ilustrasi + tombol audio opsional tidak autoplay
  await page
    .getByRole('navigation', { name: /Menu utama siswa/i })
    .getByRole('link', { name: 'Tenang' })
    .click();
  await expect(page).toHaveURL(/\/app\/tenang$/);
  await expect(page.getByText(/Ilustrasi ritme napas/i)).toBeVisible();
  await page.getByRole('button', { name: /Audio Panduan/i }).click();
  const audioEl = page.locator('audio');
  await expect(audioEl).toBeVisible();
  await expect(audioEl).toHaveAttribute('src', /napas-terpandu-4-4-4\.wav/);

  // Ekspor data pribadi siswa dari Panel Akun (autentikasi ulang)
  await page.getByRole('button', { name: /Buka pengaturan akun/i }).click();
  await page.getByRole('button', { name: /Ekspor Data Pribadi/i }).click();
  await page
    .getByLabel(/Masukkan kata sandi untuk mengunduh salinan data pribadimu/i)
    .fill('SiswaDemo!2026');
  const [studentDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Unduh JSON/i }).click(),
  ]);
  expect(studentDownload.suggestedFilename()).toContain('tenangin-ekspor-pribadi-Awan-028.json');

  await page.getByRole('button', { name: /Keluar dari Akun/i }).click();
  await expect(page).toHaveURL(/\/masuk$/);

  // 3. Guru BK: login + MFA -> cek card Ekspor Agregat Tersupresi k=5
  await page.getByLabel(/Kode Akun atau Email/i).fill('rani.bk@sekolah.sch.id');
  await page.getByLabel(/Kata Sandi/i).fill('StafDemo!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();
  await page.getByLabel(/Kode 6 Digit/i).fill(generateTotpCode('JBSWY3DPEHPK3PXP'));
  await page.getByRole('button', { name: /Verifikasi & Masuk Dashboard/i }).click();
  await expect(page).toHaveURL(/\/bk$/);

  await expect(page.getByText(/Unduh Ringkasan Agregat Kelompok/i)).toBeVisible();
  await page.getByLabel(/Konfirmasi kata sandi Guru BK/i).fill('StafDemo!2026');
  const [bkDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Unduh Agregat CSV/i }).click(),
  ]);
  expect(bkDownload.suggestedFilename()).toContain('tenangin-agregat-bk-BK-Rani-01.csv');

  await page.getByRole('button', { name: /Pengaturan akun BK/i }).click();
  await page.getByRole('button', { name: /Keluar dari Akun/i }).click();
  await expect(page).toHaveURL(/\/masuk$/);

  // 4. Superadmin: login + MFA -> Tab 6 Pengaturan & Audit -> Review T73 + Kapasitas L05
  await page.getByLabel(/Kode Akun atau Email/i).fill('superadmin@tenangin.id');
  await page.getByLabel(/Kata Sandi/i).fill('StafDemo!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();
  await page.getByLabel(/Kode 6 Digit/i).fill(generateTotpCode('KRSXG5CTMVRXEZLU'));
  await page.getByRole('button', { name: /Verifikasi & Masuk Dashboard/i }).click();
  await expect(page).toHaveURL(/\/superadmin$/);

  await page.getByRole('tab', { name: /Pengaturan & Audit/i }).click();
  await page.getByText('Tinjauan Ahli & Sekolah', { exact: true }).click();
  await page.getByText('Kapasitas & Sekolah Mitra', { exact: true }).click();
  await expect(
    page.getByText(/Tinjauan Ahli & Pengelola Sekolah \(Prasyarat Pilot\)/i)
  ).toBeVisible();
  await expect(page.getByText(/Kapasitas Sistem & Sekolah Mitra/i)).toBeVisible();
  await expect(page.getByText(/SMA-CONTOH-01/i).first()).toBeVisible();
});
