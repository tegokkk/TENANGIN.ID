import { expect, test } from './fixtures.js';
import { generateTotpCode } from './helpers.js';

const WIDTHS = [320, 390, 768, 1280];

async function login(page, admin = false) {
  await page.goto('/masuk');
  await page
    .getByLabel(/Kode Akun atau Email/i)
    .fill(admin ? 'superadmin@tenangin.id' : 'Awan-028');
  await page.getByLabel(/Kata Sandi/i).fill(admin ? 'StafDemo!2026' : 'SiswaDemo!2026');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  if (admin) {
    await page.getByLabel(/Kode 6 Digit/i).fill(generateTotpCode('KRSXG5CTMVRXEZLU'));
    await page.getByRole('button', { name: /Verifikasi & Masuk Dashboard/i }).click();
  }
  await expect(page).toHaveURL(admin ? /\/superadmin$/ : /\/app$/);
}

async function fitsViewport(page) {
  expect(
    await page.evaluate(() => ({
      width: innerWidth,
      document: document.documentElement.scrollWidth,
      offenders: [
        ...document.querySelectorAll(
          'main *, [role="dialog"], [role="dialog"] *, [role="menu"], [role="menu"] *'
        ),
      ]
        .filter((el) => {
          if (!el.getClientRects().length || el.closest('.tableWrap')) return false;
          const rect = el.getBoundingClientRect();
          return rect.right > innerWidth + 1 || rect.left < -1;
        })
        .map((el) => el.tagName + '.' + el.className)
        .slice(0, 10),
    }))
  ).toEqual(expect.objectContaining({ offenders: [] }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
}

function recordFailures(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
}

test('Siswa: semua halaman, panel tambahan, dialog dan fokus nyaman pada empat lebar', async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors = recordFailures(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/app', '/app/tenang', '/app/catat', '/app/refleksi', '/app/bantuan']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      await fitsViewport(page);
      if (route === '/app') {
        await expect(page.getByLabel(/Tambah tugas/i)).not.toBeVisible();
        await expect(page.getByRole('switch', { name: /Aktif|Nonaktif/ })).not.toBeVisible();
      }
      await page.screenshot({
        path: `tests/screenshots/minimal/student-${route.split('/').at(-1)}-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto('/app');
    for (const title of [
      'Jadwal Istirahat & Tidur',
      'Pengaturan Pengingat',
      'Pesan & Aktivitas Tambahan',
      'Privasi & Akses Data',
    ]) {
      await page.getByText(title, { exact: true }).click();
    }
    await fitsViewport(page);
    await page.getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tambah Tugas', exact: true });
    await dialog.getByRole('button', { name: 'Opsi', exact: true }).click();
    const title = dialog.getByLabel(/Tambah tugas/i);
    await title.pressSequentially('Draf tetap fokus');
    await expect(title).toBeFocused();
    await fitsViewport(page);
    await page.screenshot({ path: `tests/screenshots/minimal/student-task-dialog-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Tambah Tugas', exact: true })).toBeFocused();
    await page.getByRole('button', { name: /Buka pengaturan akun/i }).click();
    await fitsViewport(page);
    await page.getByRole('button', { name: /Tutup panel akun/i }).click();
  }
  expect(errors).toEqual([]);
});

test('Superadmin: tiap halaman fokus, tabel dan formulir responsif, navigasi keyboard dan URL bertahan', async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors = recordFailures(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page, true);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const label of [
      'Ringkasan',
      'Akun & Role',
      'Data Siswa',
      'Konten',
      'Bantuan & Pesan',
      'Pengaturan & Audit',
    ]) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      const panel = page.getByRole('tabpanel');
      await expect(panel).toBeVisible();
      await expect(page.locator('h1')).toHaveText(
        label === 'Ringkasan' ? 'Dashboard Superadmin' : label
      );
      if (label !== 'Ringkasan')
        await expect(page.getByText('Siswa Terdaftar', { exact: true })).toHaveCount(0);
      if (label === 'Akun & Role') {
        await expect(
          page.getByRole('heading', { name: 'Pendaftaran Siswa', exact: true })
        ).toHaveCount(0);
        await expect(
          page.getByRole('cell', { name: 'Awan-028', exact: false }).first()
        ).toBeVisible();
      }
      await fitsViewport(page);
      await page.screenshot({
        path: `tests/screenshots/minimal/admin-${label.split(' ')[0].toLowerCase()}-${width}.png`,
        fullPage: true,
      });
    }
    await expect(page.getByLabel('Nama Sekolah', { exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: 'Edit Pengaturan Sekolah', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Konfigurasi Sekolah & Layanan' });
    await expect(settings).toBeVisible();
    await fitsViewport(page);
    await page.screenshot({ path: `tests/screenshots/minimal/admin-settings-dialog-${width}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Akun & Role', exact: true }).click();
    await page.getByRole('button', { name: 'Lainnya', exact: true }).first().click();
    await expect(page.getByRole('menuitem', { name: 'Token Pulih', exact: true })).toBeFocused();
    await fitsViewport(page);
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: /Aktifkan|Nonaktifkan/ })).toBeFocused();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Buat Akun Baru', exact: true }).click();
    await fitsViewport(page);
    await page.screenshot({ path: `tests/screenshots/minimal/admin-account-dialog-${width}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Bantuan & Pesan', exact: true }).click();
    await expect(page.getByLabel('Judul Pesan', { exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: 'Tulis Pesan Kelompok', exact: true }).click();
    await fitsViewport(page);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('tab', { name: 'Akun & Role', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('tab', { name: 'Data Siswa', exact: true })).toBeFocused();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Data Siswa', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(errors).toEqual([]);
});

test('Superadmin: respons bantuan, pesan kelompok dan simpan pengaturan tetap tersimpan tanpa mengubah akses', async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors = recordFailures(page);
  await login(page, true);
  await page.getByRole('tab', { name: 'Bantuan & Pesan', exact: true }).click();
  await page.getByRole('button', { name: 'Tulis Respons', exact: true }).first().click();
  const response = page.getByRole('dialog');
  await response.getByLabel(/Respons Administratif Satu Arah/).fill('Respons pengujian antarmuka');
  await response.getByLabel('Lokasi', { exact: true }).fill('Lokasi layanan pengujian');
  await response.getByLabel('Jadwal', { exact: true }).fill('Jadwal pengujian');
  await response.getByRole('button', { name: 'Simpan Respons Administratif', exact: true }).click();
  await expect(response).not.toBeVisible();
  await page.getByRole('button', { name: 'Tulis Pesan Kelompok', exact: true }).click();
  const message = page.getByRole('dialog', { name: 'Tulis Pesan Kelompok' });
  await message.getByLabel('Judul Pesan', { exact: true }).fill('Pesan pengujian antarmuka');
  await message
    .getByLabel(/Isi Pesan/)
    .fill('Pesan kelompok untuk memverifikasi penyimpanan formulir dialog.');
  await message.getByRole('button', { name: 'Terbitkan Pesan Kelompok', exact: true }).click();
  await expect(message).not.toBeVisible();
  await page.reload();
  await expect(page.getByText('Pesan pengujian antarmuka', { exact: true })).toBeVisible();
  const requests = (await (await page.request.get('/api/superadmin/help-requests')).json()).data
    .requests;
  expect(
    requests.some((item) => item.acknowledgement?.message === 'Respons pengujian antarmuka')
  ).toBe(true);
  const before = (await (await page.request.get('/api/superadmin/settings')).json()).data.school;
  await page.getByRole('tab', { name: 'Pengaturan & Audit', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Pengaturan Sekolah', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Konfigurasi Sekolah & Layanan' });
  await expect(settings.getByLabel('Nama Sekolah', { exact: true })).toHaveValue(before.name);
  await settings.getByRole('button', { name: 'Simpan Pengaturan Sekolah', exact: true }).click();
  await expect(settings).not.toBeVisible();
  const after = (await (await page.request.get('/api/superadmin/settings')).json()).data.school;
  for (const key of [
    'name',
    'timezone',
    'service_hours',
    'personal_access_mode',
    'guardian_consent_required',
    'active_handler_configured',
    'verified_contacts',
  ])
    expect(after[key]).toEqual(before[key]);
  expect(errors).toEqual([]);
});
