import { expect, test } from './fixtures.js';

test('Alur E2E Siswa (T67): Landing -> Login -> Mood -> Tugas -> Tenang -> Catat -> Refleksi -> Bantuan -> Reload -> Logout', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Pelan-pelan, kamu boleh ambil jeda/i })
  ).toBeVisible();
  await page.getByRole('link', { name: /Mulai dengan tenang/i }).click();

  await expect(page).toHaveURL(/\/masuk/);
  await page.getByLabel(/Kode Akun atau Email/i).fill('awan-028');
  await page.getByLabel(/Kata Sandi/i).fill('SiswaDemo!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /Halo, Awan-028/i })).toBeVisible();

  // F2: Simpan suasana hati
  await page.getByRole('radio', { name: /Tenang \/ Lega/i }).click();
  await page.getByRole('button', { name: /Simpan Suasana Hati/i }).click();
  await expect(page.getByText(/Tersimpan untuk hari ini/i)).toBeVisible();

  // F5: Tambah tugas di perencana dan verifikasi setelah reload
  const uniqueTask = `Tugas Uji E2E ${Date.now()}`;
  await page.getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
  await page.getByRole('textbox', { name: /Tambah tugas/i }).fill(uniqueTask);
  await page.getByRole('dialog').getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
  await page.getByRole('button', { name: /Lihat Semua Tugas/ }).click();
  await expect(page.getByText(uniqueTask)).toBeVisible();

  await page.reload();
  await expect(page.getByText(uniqueTask)).toBeVisible();

  // F4 & F8: Tenang
  await page.getByRole('link', { name: 'Tenang', exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/tenang/);
  await page.getByRole('button', { name: /Mulai Latihan/i }).click();
  await page.getByRole('button', { name: /^Berhenti$/i }).click();
  await expect(page.getByText(/Latihan dihentikan\. Kamu bisa kembali kapan pun\./i)).toBeVisible();

  // F3: Catat Jurnal (tanpa localStorage)
  await page.getByRole('link', { name: 'Catat', exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/catat/);
  const uniqueSit = `Situasi E2E ${Date.now()}`;
  await page.getByLabel(/1\. Apa yang terjadi/i).fill(uniqueSit);
  await page.getByLabel(/2\. Apa yang kamu pikirkan/i).fill('Pikiran uji E2E');
  await page.getByLabel(/3\. Apa yang kamu rasakan/i).fill('Tenang terkendali');
  await page.getByRole('button', { name: /Simpan Jurnal/i }).click();
  await expect(page.getByText(/Catatan jurnal berhasil disimpan/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText(uniqueSit)).toBeVisible();

  const lsLen = await page.evaluate(() => localStorage.length);
  expect(lsLen).toBe(0);

  // F7: Refleksi
  await page.getByRole('link', { name: 'Refleksi', exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/refleksi/);
  await page.getByLabel(/1\. Apa yang membantumu/i).fill('Latihan napas singkat');
  await page.getByLabel(/2\. Apa hambatannya/i).fill('Jadwal padat');
  await page.getByLabel(/3\. Apa rencana kecilmu/i).fill('Jeda 10 menit');
  await page.getByRole('button', { name: /Simpan Refleksi/i }).click();
  await expect(page.getByText(/Refleksi mingguan berhasil disimpan/i)).toBeVisible();

  // F9: Bantuan -> Pratinjau -> Kirim
  await page.getByRole('link', { name: 'Bantuan', exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/bantuan/);
  await page.getByLabel(/Pesan singkat/i).fill('Permintaan bantuan uji E2E');
  await page.getByRole('button', { name: /Tinjau Permintaan/i }).click();
  await expect(page.getByText(/Superadmin Sekolah/i)).toBeVisible();
  await page.getByRole('button', { name: /Kirim Permintaan ke Superadmin/i }).click();
  await expect(page.getByText(/Permintaan tersimpan/i)).toBeVisible();

  // Logout & pastikan sesi dicabut
  await page.getByRole('button', { name: /Buka pengaturan akun/i }).click();
  await page.getByRole('button', { name: /Keluar dari Akun/i }).click();
  await expect(page).toHaveURL(/\/masuk/);

  await page.goto('/app');
  await expect(page).toHaveURL(/\/masuk/);
});
