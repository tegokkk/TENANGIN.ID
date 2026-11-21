import { test, expect } from './fixtures.js';
import { generateTotpCode } from './helpers.js';

async function login(page, role = 'student') {
  const identity =
    role === 'student'
      ? ['awan-028', 'SiswaDemo!2026']
      : role === 'bk'
        ? ['rani.bk@sekolah.sch.id', 'StafDemo!2026', 'JBSWY3DPEHPK3PXP']
        : ['superadmin@tenangin.id', 'StafDemo!2026', 'KRSXG5CTMVRXEZLU'];
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/).fill(identity[0]);
  await page.getByLabel(/Kata Sandi/).fill(identity[1]);
  await page.getByRole('button', { name: /^Masuk$/ }).click();
  if (identity[2]) {
    await page.getByLabel(/Kode 6 Digit/).fill(generateTotpCode(identity[2]));
    await page.getByRole('button', { name: /Verifikasi & Masuk Dashboard/ }).click();
  }
  await expect(page).toHaveURL(
    role === 'student' ? /\/app$/ : role === 'bk' ? /\/bk$/ : /\/superadmin$/
  );
}
async function noOverflow(page) {
  await page.waitForLoadState('networkidle');
  const size = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll('body *')]
      .filter(
        (el) =>
          el.getBoundingClientRect().right > innerWidth + 1 && el.getBoundingClientRect().width > 0
      )
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        class: el.className,
        right: Math.round(el.getBoundingClientRect().right),
      })),
  }));
  expect(
    size.content,
    `overflow pada ${page.url()} (${size.viewport}px): ${JSON.stringify(size.overflowing)}`
  ).toBeLessThanOrEqual(size.viewport + 1);
}
test('Seluruh halaman dan enam tab Superadmin reflow pada 320/390/1280px', async ({ browser }) => {
  test.setTimeout(300000);
  for (const role of ['public', 'student', 'bk', 'superadmin']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (role !== 'public') await login(page, role);
    const routes =
      role === 'public'
        ? ['/', '/masuk', '/bantuan', '/pustaka']
        : role === 'student'
          ? ['/app', '/app/tenang', '/app/catat', '/app/refleksi', '/app/bantuan']
          : role === 'bk'
            ? ['/bk']
            : ['/superadmin'];
    for (const route of routes) {
      await page.goto(route);
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await noOverflow(page);
        if (role === 'superadmin')
          for (const tab of await page.getByRole('tab').all()) {
            await tab.click();
            await noOverflow(page);
          }
      }
    }
    await context.close();
  }
});

test('Draf jurnal: tahan navigasi, jaga input ketika offline, simpan lalu keluar, dan buang eksplisit', async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto('/app/catat');
  const situation = page.getByLabel(/1\. Apa yang terjadi/);
  await situation.fill(`Draf audit ${Date.now()}`);
  await page.getByLabel(/2\. Apa yang kamu pikirkan/).fill('Pikiran belum tersimpan');
  await page.getByLabel(/3\. Apa yang kamu rasakan/).fill('Tenang');
  await page.getByRole('link', { name: 'Tenang', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Perubahan Belum Disimpan' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/app\/catat$/);
  await dialog.getByRole('button', { name: 'Kembali Mengedit' }).click();
  await expect(situation).toHaveValue(/Draf audit/);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Simpan Jurnal', exact: true }).click();
  await expect(page.getByText(/Koneksi terputus/)).toBeVisible();
  await expect(situation).toHaveValue(/Draf audit/);
  await context.setOffline(false);
  await expect(page.getByText(/Catatan jurnal berhasil disimpan/)).toBeVisible();
  await situation.fill('Draf yang disimpan sebelum berpindah menu');
  await page.getByRole('link', { name: 'Tenang', exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Simpan Perubahan' }).click();
  await expect(page).toHaveURL(/\/app\/tenang$/);
  await page.goto('/app/catat');
  await situation.fill('Draf yang dibuang');
  await page.getByRole('link', { name: 'Tenang', exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Buang Perubahan' }).click();
  await expect(page).toHaveURL(/\/app\/tenang$/);
  await page.goto('/app/catat');
  await expect(situation).toHaveValue('');
});

test('Dialog menjaga fokus keyboard dan menutup dengan Escape', async ({ page }) => {
  await login(page);
  await page.goto('/app/catat');
  await page.getByLabel(/1\. Apa yang terjadi/).fill('Draf untuk fokus');
  const link = page.getByRole('link', { name: 'Tenang', exact: true }).first();
  await link.click();
  const dialog = page.getByRole('dialog', { name: 'Perubahan Belum Disimpan' });
  await expect(dialog.getByRole('button', { name: 'Tutup dialog' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Buang Perubahan' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Tutup dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/app\/catat$/);
});

test('Reflow teks 200 persen dan reduced motion menjaga halaman publik serta ruang siswa', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /Langsung ke/ })).toBeFocused();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await noOverflow(page);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto'
  );
  await login(page);
  for (const route of ['/app', '/app/tenang', '/app/catat', '/app/refleksi', '/app/bantuan']) {
    await page.goto(route);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await noOverflow(page);
    await expect(page.getByRole('link', { name: 'Bantuan', exact: true }).last()).toBeVisible();
  }
});

test('Superadmin membuat, mengedit, mereview dan menerbitkan artikel melalui UI', async ({
  page,
}) => {
  await login(page, 'superadmin');
  await page.getByRole('tab', { name: /Konten/ }).click();
  await page.getByRole('button', { name: 'Buat Artikel Baru', exact: true }).click();
  const slug = `audit-ui-${Date.now()}`;
  const title = `Artikel Audit ${Date.now()}`;
  const form = page.locator('form');
  for (const [label, value] of [
    ['Slug', slug],
    ['Judul Artikel', title],
    ['Topik', 'Belajar'],
    ['Ringkasan', 'Ringkasan artikel untuk uji alur editorial.'],
    ['Isi Artikel', 'Isi artikel audit yang menunggu review dan publikasi.'],
    ['Sumber Materi', 'Tim Sekolah Demo'],
    ['Hak Penggunaan Media', 'Materi internal demo'],
  ])
    await form.getByLabel(label, { exact: true }).fill(value);
  await form.getByRole('button', { name: 'Simpan Draf' }).click();
  const section = page.getByRole('region', { name: title, exact: true });
  await expect(section.getByText(/v1 • Draf/)).toBeVisible();
  await section.getByRole('button', { name: 'Status Konten', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Ajukan Tinjauan' }).click();
  await section.getByLabel(/Referensi Peninjau/).fill('Ahli Demo — Referensi Uji');
  await section.getByRole('button', { name: 'Status Konten', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Setujui', exact: true }).click();
  await section.getByRole('button', { name: 'Status Konten', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Terbitkan', exact: true }).click();
  await expect(section.getByText(/v1 • Terbit/)).toBeVisible();
  expect((await page.request.get(`/api/articles/${slug}`)).status()).toBe(200);
  await section.getByRole('button', { name: /^Edit Artikel:/ }).click();
  await form
    .getByLabel('Isi Artikel', { exact: true })
    .fill('Isi artikel berubah dan wajib masuk review lagi.');
  await form.getByRole('button', { name: 'Simpan Draf' }).click();
  await expect(section.getByText(/v2 • Draf/)).toBeVisible();
  expect((await page.request.get(`/api/articles/${slug}`)).status()).toBe(404);
});

test('Superadmin mengelola tugas/langkah siswa melalui UI dan hasilnya bertahan setelah reload', async ({
  page,
}) => {
  await login(page, 'superadmin');
  await page.getByRole('tab', { name: /Data Siswa/ }).click();
  const select = page.getByLabel(/Pilih Akun Siswa/);
  const studentOption = select.locator('option').filter({ hasText: 'Awan-028' });
  await expect(studentOption).toHaveCount(1);
  await select.selectOption(await studentOption.getAttribute('value'));
  await page.getByLabel('Jenis Data Siswa').selectOption('tasks');
  await page.getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
  const title = `Tugas Audit UI ${Date.now()}`;
  await page.getByLabel('Judul Tugas', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Tambah Langkah Kecil' }).click();
  await page.getByLabel('Judul Langkah 1').fill('Langkah dari dashboard');
  await page.getByLabel('Alasan Perubahan').fill('Koreksi data demo');
  await page.getByRole('button', { name: 'Simpan Data Siswa' }).click();
  await expect(page.locator('article').filter({ hasText: title })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: /Data Siswa/ }).click();
  await expect(studentOption).toHaveCount(1);
  await select.selectOption(await studentOption.getAttribute('value'));
  await page.getByLabel('Jenis Data Siswa').selectOption('tasks');
  const entry = page.locator('article').filter({ hasText: title });
  await expect(entry).toBeVisible();
  await entry.getByRole('button', { name: 'Edit Entri' }).click();
  await expect(page.getByLabel('Judul Langkah 1')).toHaveValue('Langkah dari dashboard');
  await page.getByRole('button', { name: 'Batal Mengedit' }).click();
  await entry.getByRole('button', { name: 'Hapus Entri' }).click();
  await page.getByLabel('Alasan Penghapusan').fill('Selesai pengujian demo');
  await page.getByRole('button', { name: 'Konfirmasi Hapus' }).click();
  await expect(entry).not.toBeVisible();
});

test('Editor latihan membuat dan merevisi naskah, durasi, sumber serta audit', async ({ page }) => {
  await login(page, 'superadmin');
  await page.getByRole('tab', { name: /Konten/ }).click();
  await page.getByRole('button', { name: 'Buat Latihan Baru', exact: true }).click();
  const title = `Latihan UI ${Date.now()}`;
  const form = page.locator('form');
  for (const [label, value] of [
    ['Slug', `latihan-ui-${Date.now()}`],
    ['Judul Latihan', title],
    ['Deskripsi Singkat', 'Latihan untuk pengujian editor.'],
    ['Durasi Latihan (detik)', '180'],
    ['Petunjuk Berhenti', 'Berhenti kapan pun jika tidak nyaman.'],
    ['Nama Fase 1', 'Perhatikan'],
    ['Durasi Fase (detik) 1', '5'],
    ['Instruksi 1', 'Perhatikan benda di sekitarmu.'],
    ['Sumber Materi', 'Tim Sekolah Demo'],
    ['Hak Penggunaan Media', 'Internal demo'],
  ])
    await form.getByLabel(label, { exact: true }).fill(value);
  await form.getByRole('button', { name: 'Simpan Draf' }).click();
  const section = page.getByRole('region', { name: title, exact: true });
  await expect(section.getByText('v1 • Draf')).toBeVisible();
  await section.getByRole('button', { name: /^Edit Latihan:/ }).click();
  await form.getByLabel('Durasi Latihan (detik)', { exact: true }).fill('240');
  await form.getByRole('button', { name: 'Simpan Draf' }).click();
  await expect(section.getByText('v2 • Draf')).toBeVisible();
  await section.getByRole('button', { name: /^Edit Latihan:/ }).click();
  await expect(form.getByLabel('Durasi Latihan (detik)', { exact: true })).toHaveValue('240');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Pengaturan & Audit/ }).click();
  await expect(page.getByText('exercise_updated', { exact: true }).first()).toBeVisible();
});

test('Dua tab menolak penimpaan jurnal lama; logout mencabut akses di tab lain', async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto('/app/catat');
  await page.getByRole('button', { name: 'Buka & Edit', exact: true }).first().click();
  const other = await context.newPage();
  await other.goto('http://127.0.0.1:5174/app/catat');
  await other.getByRole('button', { name: 'Buka & Edit', exact: true }).first().click();
  await page.getByLabel(/2\. Apa yang kamu pikirkan/).fill('Perubahan tab pertama');
  await page.getByRole('button', { name: 'Perbarui Jurnal', exact: true }).click();
  await expect(page.getByText(/Catatan jurnal berhasil disimpan/)).toBeVisible();
  await other.getByLabel(/2\. Apa yang kamu pikirkan/).fill('Draf tab lama tetap tersedia');
  await other.getByRole('button', { name: 'Perbarui Jurnal', exact: true }).click();
  await expect(other.getByText(/diperbarui di sesi atau tab lain/i).first()).toBeVisible();
  await expect(other.getByLabel(/2\. Apa yang kamu pikirkan/)).toHaveValue(
    'Draf tab lama tetap tersedia'
  );
  const csrf = (await (await page.request.get('/api/auth/csrf')).json()).data.csrfToken;
  expect(
    (
      await page.request.post('/api/auth/logout', { headers: { 'x-csrf-token': csrf }, data: {} })
    ).status()
  ).toBe(200);
  await other.goto('http://127.0.0.1:5174/app');
  await expect(other).toHaveURL(/\/masuk$/);
  expect((await page.request.get('/api/journals')).status()).toBe(401);
});
