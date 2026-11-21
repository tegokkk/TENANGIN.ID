import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';
import { createTestContext } from '../setup/test-app.js';

describe('Integration: Deployment readiness (API 404 JSON, SPA fallback, Proxy HTTPS Cookie)', () => {
  let tempDistDir;
  let spaCtx;
  let prodProxyCtx;
  let apiOnlyCtx;

  beforeAll(() => {
    tempDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenangin-spa-dist-'));
    fs.writeFileSync(
      path.join(tempDistDir, 'index.html'),
      '<!doctype html><html><body><div id="root">TENANGIN SPA SHELL</div></body></html>',
      'utf8'
    );

    const testEnv = loadEnv({ NODE_ENV: 'test' });

    spaCtx = createTestContext({
      SERVE_FRONTEND_DIST: 'true',
      FRONTEND_DIST_DIR: tempDistDir,
    });

    prodProxyCtx = createTestContext({
      NODE_ENV: 'production',
      APP_MODE: 'pilot',
      ALLOW_DEMO_SEED: 'false',
      APP_ORIGIN: 'https://tenangin.id',
      TRUST_PROXY: '1',
      DATABASE_URL: testEnv.DATABASE_URL,
      SERVE_FRONTEND_DIST: 'true',
      FRONTEND_DIST_DIR: tempDistDir,
    });
    apiOnlyCtx = createTestContext(
      {
        NODE_ENV: 'production',
        APP_MODE: 'pilot',
        ALLOW_DEMO_SEED: 'false',
        APP_ORIGIN: 'https://tenangin.id',
        TRUST_PROXY: '1',
        DATABASE_URL: testEnv.DATABASE_URL,
        FRONTEND_DIST_DIR: path.join(tempDistDir, 'not-bundled'),
      },
      { serveFrontend: false }
    );
  });

  afterAll(async () => {
    await spaCtx?.teardown();
    await prodProxyCtx?.teardown();
    await apiOnlyCtx?.teardown();
    if (tempDistDir && fs.existsSync(tempDistDir)) {
      fs.rmSync(tempDistDir, { recursive: true, force: true });
    }
  });

  it('mengembalikan 404 JSON terstruktur untuk endpoint /api yang tidak ada dan fallback SPA untuk route frontend', async () => {
    const apiMissing = await request(spaCtx.app).get('/api/non-existent-endpoint');
    expect(apiMissing.status).toBe(404);
    expect(apiMissing.headers['content-type']).toMatch(/application\/json/);
    expect(apiMissing.body.ok).toBe(false);
    expect(apiMissing.body.error.code).toBe('NOT_FOUND');

    const bkFallback = await request(spaCtx.app).get('/bk');
    expect(bkFallback.status).toBe(200);
    expect(bkFallback.headers['content-type']).toMatch(/text\/html/);
    expect(bkFallback.text).toContain('TENANGIN SPA SHELL');

    const studentFallback = await request(spaCtx.app).get('/app/catat');
    expect(studentFallback.status).toBe(200);
    expect(studentFallback.headers['content-type']).toMatch(/text\/html/);
    expect(studentFallback.text).toContain('TENANGIN SPA SHELL');
  });

  it('mengeluarkan cookie sesi HttpOnly, Secure, dan SameSite=Lax di belakang reverse proxy HTTPS', async () => {
    const httpsRes = await request(prodProxyCtx.app)
      .get('/api/auth/csrf')
      .set('X-Forwarded-Proto', 'https');

    expect(httpsRes.status).toBe(200);
    const setCookies = httpsRes.headers['set-cookie'] || [];
    const sidCookie = setCookies.find((cookie) => cookie.startsWith('tenangin.sid='));
    expect(sidCookie).toBeTruthy();
    expect(sidCookie).toMatch(/HttpOnly/i);
    expect(sidCookie).toMatch(/Secure/i);
    expect(sidCookie).toMatch(/SameSite=Lax/i);
  });

  it('mode API-only berjalan tanpa bundle frontend dan tidak mengembalikan HTML untuk API salah', async () => {
    expect((await request(apiOnlyCtx.app).get('/api/health')).status).toBe(200);
    expect((await request(apiOnlyCtx.app).get('/api/ready')).status).toBe(200);
    const missing = await request(apiOnlyCtx.app).get('/api/not-found');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    const csrf = await request(apiOnlyCtx.app)
      .get('/api/auth/csrf')
      .set('X-Forwarded-Proto', 'https');
    expect(csrf.status).toBe(200);
    expect(csrf.headers['set-cookie'].join(';')).toMatch(/Secure/);
  });
});
