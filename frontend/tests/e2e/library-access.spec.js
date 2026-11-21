import { expect, test } from './fixtures.js';

test('Pustaka memerlukan login dan kembali tertutup setelah keluar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /^Pustaka$/i })).toHaveCount(0);
  for (const endpoint of [
    '/api/articles',
    '/api/articles/memahami-stres-belajar',
    '/api/exercises',
    '/api/exercises/napas-terpandu',
  ]) {
    const response = await page.request.get(endpoint);
    expect(response.status()).toBe(401);
    expect(response.headers()['cache-control']).toContain('no-store');
  }

  await page.goto('/pustaka');
  await expect(page).toHaveURL(/\/masuk$/);
  await expect(page.getByRole('heading', { name: 'Ruang Tenang', exact: true })).toHaveCount(0);
  await page.getByLabel(/Kode Akun atau Email/i).fill('awan-028');
  await page.getByLabel(/Kata Sandi/i).fill('SiswaDemo!2026');
  await page.getByRole('button', { name: /^Masuk$/i }).click();
  await expect(page).toHaveURL(/\/pustaka$/);
  await expect(page.getByRole('heading', { name: 'Ruang Tenang', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pustaka', exact: true }).first()).toBeVisible();

  for (const endpoint of ['/api/articles', '/api/exercises']) {
    const response = await page.request.get(endpoint);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ruang Tenang', exact: true })).toBeVisible();

  const csrf = await (await page.request.get('/api/auth/csrf')).json();
  const logout = await page.request.post('/api/auth/logout', {
    headers: { 'x-csrf-token': csrf.data.csrfToken },
    data: {},
  });
  expect(logout.status()).toBe(200);
  await page.reload();
  await expect(page).toHaveURL(/\/masuk$/);
  expect((await page.request.get('/api/articles')).status()).toBe(401);

  await page.goto('/app/pustaka');
  await expect(page).toHaveURL(/\/masuk$/);
  await page.goto('/app/tenang');
  await expect(page).toHaveURL(/\/masuk$/);
});
