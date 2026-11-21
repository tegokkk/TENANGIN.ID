import { expect, test } from './fixtures.js';

async function login(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/masuk');
  await page.getByLabel(/Kode Akun atau Email/i).fill('Awan-028');
  await page.getByLabel('Kata Sandi', { exact: true }).fill('SiswaDemo!2026');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
}

const failedSave = (message) => ({
  status: 503,
  contentType: 'application/json',
  body: JSON.stringify({ ok: false, error: { code: 'SERVICE_UNAVAILABLE', message } }),
});

test('Formulir tugas dan istirahat: galat terlihat di dialog, draf terjaga, dan simpan ulang berhasil', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await login(page);
  await page.getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
  const taskDialog = page.getByRole('dialog', { name: 'Tambah Tugas', exact: true });
  await taskDialog.getByLabel(/Tambah tugas/).fill('Draf tugas setelah gagal simpan');
  await taskDialog.getByRole('button', { name: 'Opsi', exact: true }).click();
  await taskDialog.getByLabel(/Estimasi menit/).fill('25');
  await page.route('**/api/tasks', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill(failedSave('Tugas gagal disimpan sementara.'))
      : route.continue()
  );
  await taskDialog.getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
  await expect(taskDialog.getByRole('alert')).toContainText('Tugas gagal disimpan sementara.');
  await expect(taskDialog.getByLabel(/Tambah tugas/)).toHaveValue(
    'Draf tugas setelah gagal simpan'
  );
  await expect(taskDialog.getByRole('button', { name: 'Tutup dialog' })).toBeInViewport();
  expect(await taskDialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.unroute('**/api/tasks');
  await taskDialog.getByRole('button', { name: 'Tambah Tugas', exact: true }).click();
  await expect(taskDialog).not.toBeVisible();
  await expect(page.getByText('Draf tugas setelah gagal simpan', { exact: true })).toBeVisible();

  await page.getByText('Jadwal Istirahat & Tidur', { exact: true }).click();
  await page.getByRole('button', { name: 'Tambah Blok Istirahat', exact: true }).click();
  const restDialog = page.getByRole('dialog', { name: 'Tambah Blok Istirahat & Tidur' });
  await restDialog
    .getByLabel('Nama jeda / istirahat', { exact: true })
    .fill('Jeda uji simpan ulang');
  await page.route('**/api/schedule-blocks', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill(failedSave('Jadwal istirahat gagal disimpan sementara.'))
      : route.continue()
  );
  await restDialog.getByRole('button', { name: 'Simpan Blok', exact: true }).click();
  await expect(restDialog.getByRole('alert')).toContainText(
    'Jadwal istirahat gagal disimpan sementara.'
  );
  await expect(restDialog.getByLabel('Nama jeda / istirahat', { exact: true })).toHaveValue(
    'Jeda uji simpan ulang'
  );
  await page.unroute('**/api/schedule-blocks');
  await restDialog.getByRole('button', { name: 'Simpan Blok', exact: true }).click();
  await expect(restDialog).not.toBeVisible();
  await expect(page.getByText(/Istirahat: Jeda uji simpan ulang/)).toBeVisible();
});

test('Pengingat: Batal membuang perubahan, galat tetap terlihat, dan jadwal berhasil tersimpan setelah dicoba ulang', async ({
  page,
}) => {
  await login(page);
  const before = (await (await page.request.get('/api/reminders')).json()).data.preference;
  await page.getByText('Pengaturan Pengingat', { exact: true }).click();
  await page.getByRole('button', { name: 'Atur Jadwal', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Atur Jadwal Pengingat & Jam Tenang' });
  const time = dialog.getByLabel('Jam Pengingat', { exact: true });
  await time.fill('12:34');
  await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
  await page.getByRole('button', { name: 'Atur Jadwal', exact: true }).click();
  await expect(time).toHaveValue(before.preferredTime);
  await time.fill('12:34');
  await page.route('**/api/reminders', (route) =>
    route.request().method() === 'PUT'
      ? route.fulfill(failedSave('Pengingat gagal disimpan sementara.'))
      : route.continue()
  );
  await dialog.getByRole('button', { name: 'Simpan Jadwal Pengingat', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Pengingat gagal disimpan sementara.');
  await expect(time).toHaveValue('12:34');
  await page.unroute('**/api/reminders');
  await dialog.getByRole('button', { name: 'Simpan Jadwal Pengingat', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  const saved = (await (await page.request.get('/api/reminders')).json()).data.preference;
  expect(saved.preferredTime).toBe('12:34');
});
