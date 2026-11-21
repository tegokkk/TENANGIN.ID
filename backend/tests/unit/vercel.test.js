import crypto from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { loadVercelEnv } from '../../src/config/vercel-env.js';
import { createServerlessHandler } from '../../src/lib/serverless-handler.js';
import { describeStartupError, startupError } from '../../src/lib/startup-error.js';

const profile = {
  APP_MODE: 'pilot',
  ALLOW_DEMO_SEED: 'false',
  APP_ORIGIN: 'https://tenangin.example',
  DATABASE_URL: 'postgresql://runtime:unit-test-only@db.example/tenangin_production',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
};

describe('Konfigurasi dan cold start Vercel', () => {
  it('memakai cookie proxy HTTPS dan pool kecil yang dapat menjadi kosong', () => {
    const env = loadVercelEnv(profile);
    expect(env).toMatchObject({
      isProd: true,
      isServerless: true,
      TRUST_PROXY: 1,
      DB_POOL_MIN: 0,
      DB_POOL_MAX: 3,
    });
  });

  it.each([undefined, '', '  ', 'http://127.0.0.1:5173', 'http://tenanginid-xi.vercel.app'])(
    'memakai origin HTTPS sistem Vercel ketika konfigurasi origin %s',
    (origin) => {
      expect(
        loadVercelEnv({
          ...profile,
          APP_ORIGIN: origin,
          VERCEL_ENV: 'production',
          VERCEL_PROJECT_PRODUCTION_URL: 'tenanginid-xi.vercel.app',
          VERCEL_URL: 'tenangin-preview.vercel.app',
        }).APP_ORIGIN
      ).toBe('https://tenanginid-xi.vercel.app');
    }
  );

  it('mempertahankan custom domain dan memakai deployment origin untuk preview tanpa override', () => {
    expect(
      loadVercelEnv({
        ...profile,
        APP_ORIGIN: ' https://sekolah.example/ ',
        VERCEL_PROJECT_PRODUCTION_URL: 'tenanginid-xi.vercel.app',
      }).APP_ORIGIN
    ).toBe('https://sekolah.example');
    expect(
      loadVercelEnv({
        ...profile,
        APP_ORIGIN: undefined,
        VERCEL_ENV: 'preview',
        VERCEL_PROJECT_PRODUCTION_URL: 'tenanginid-xi.vercel.app',
        VERCEL_URL: 'tenangin-preview.vercel.app',
      }).APP_ORIGIN
    ).toBe('https://tenangin-preview.vercel.app');
  });

  it('menolak origin hilang tanpa hostname sistem, origin berkredensial, dan HTTP di luar domain deployment', () => {
    for (const override of [
      { APP_ORIGIN: undefined },
      { APP_ORIGIN: 'https://private-user:private-password@sekolah.example' },
      { APP_ORIGIN: 'http://other.example', VERCEL_URL: 'tenangin-preview.vercel.app' },
      { APP_ORIGIN: '', VERCEL_URL: 'user:password@other.example' },
    ])
      expect(() => loadVercelEnv({ ...profile, ...override })).toThrow('APP_ORIGIN');
  });

  it('menolak database lokal/test, HTTP, seed dummy, dan proxy yang salah', () => {
    for (const override of [
      { DATABASE_URL: 'postgresql://runtime:unit-test-only@127.0.0.1/production' },
      { DATABASE_URL: 'postgresql://runtime:unit-test-only@db.example/tenangin_test' },
      { APP_ORIGIN: 'http://tenangin.example' },
      { ALLOW_DEMO_SEED: 'true' },
      { TRUST_PROXY: '0' },
    ])
      expect(() => loadVercelEnv({ ...profile, ...override })).toThrow();
  });

  it('berbagi cold start untuk permintaan bersamaan dan mempertahankan URL API', async () => {
    const initialize = vi.fn(async () => ({
      app: (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ url: req.url }));
      },
    }));
    const handler = createServerlessHandler(initialize);
    const responses = await Promise.all([
      request(handler).get('/api/health'),
      request(handler).get('/api/articles?q=tidur'),
    ]);
    expect(initialize).toHaveBeenCalledOnce();
    expect(responses.map((r) => r.body.url)).toEqual(['/api/health', '/api/articles?q=tidur']);
  });

  it('gagal dengan JSON tersanitasi lalu mencoba lagi pada permintaan berikutnya', async () => {
    const initialize = vi
      .fn()
      .mockRejectedValueOnce(new Error('postgresql://secret:password@private.example/db'))
      .mockResolvedValue({ app: (_req, res) => res.end('ready') });
    const logger = vi.fn();
    const handler = createServerlessHandler(initialize, logger);
    const failed = await request(handler).get('/api/ready');
    expect(failed.status).toBe(503);
    expect(failed.headers['cache-control']).toContain('no-store');
    expect(failed.text).not.toContain('password');
    expect((await request(handler).get('/api/ready')).text).toBe('ready');
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(logger).toHaveBeenCalledOnce();
    expect(JSON.stringify(logger.mock.calls)).not.toContain('password');
    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'vercel_api_initialization_failed',
        stage: 'initialize',
      })
    );
  });

  it('mencatat tahap, field konfigurasi, dan kode database tanpa nilai rahasia', () => {
    const configuration = startupError(
      'configuration',
      new Error(
        'Konfigurasi environment tidak valid: ENCRYPTION_KEY: secret-value; APP_ORIGIN: private-url'
      )
    );
    expect(describeStartupError(configuration)).toMatchObject({
      stage: 'configuration',
      code: 'INVALID_CONFIGURATION',
      fields: expect.arrayContaining(['ENCRYPTION_KEY', 'APP_ORIGIN']),
      summary: expect.stringContaining('ENCRYPTION_KEY'),
    });
    const database = startupError(
      'database_check',
      Object.assign(new Error('password authentication failed for user private-user'), {
        code: '28P01',
      })
    );
    expect(describeStartupError(database)).toMatchObject({
      stage: 'database_check',
      code: '28P01',
    });
    expect(JSON.stringify(describeStartupError(database))).not.toContain('private-user');
    expect(JSON.stringify(describeStartupError(configuration))).not.toContain('secret-value');
    const moduleError = startupError(
      'module_load',
      Object.assign(new Error("Cannot find package 'pg' imported from /private/secret-value"), {
        code: 'ERR_MODULE_NOT_FOUND',
      })
    );
    expect(describeStartupError(moduleError)).toMatchObject({ module: 'pg' });
    expect(JSON.stringify(describeStartupError(moduleError))).not.toContain('secret-value');
  });

  it('mencatat kegagalan import dan membalas 503 pada permintaan bersamaan', async () => {
    const logger = vi.fn();
    const error = startupError(
      'module_load',
      Object.assign(new Error('Cannot find module /private/path/secret-value'), {
        code: 'ERR_MODULE_NOT_FOUND',
      })
    );
    const handler = createServerlessHandler(async () => {
      throw error;
    }, logger);
    const responses = await Promise.all([
      request(handler).get('/api/health'),
      request(handler).get('/api/ready'),
    ]);
    expect(responses.every((response) => response.status === 503)).toBe(true);
    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'module_load',
        code: 'ERR_MODULE_NOT_FOUND',
      })
    );
    expect(JSON.stringify(logger.mock.calls)).not.toContain('secret-value');
  });
});
