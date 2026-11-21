import crypto from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { loadVercelEnv } from '../../src/config/vercel-env.js';
import { createServerlessHandler } from '../../src/lib/serverless-handler.js';

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
  });
});
