import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const profile = {
  NODE_ENV: 'production',
  APP_MODE: 'pilot',
  ALLOW_DEMO_SEED: 'false',
  APP_ORIGIN: 'https://tenangin.id',
  DATABASE_URL: 'postgres://runtime:unit-test-only@127.0.0.1/tenangin_production',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
};
describe('Konfigurasi production', () => {
  it('menerima profil nyata dengan HTTPS dan memilih pilot sebagai default production', () => {
    expect(loadEnv(profile).isProd).toBe(true);
    expect(loadEnv({ ...profile, APP_MODE: undefined }).APP_MODE).toBe('pilot');
  });
  it('menolak mode demo, seed demo, HTTP dan database demo pada production', () => {
    for (const override of [
      { APP_MODE: 'demo' },
      { ALLOW_DEMO_SEED: 'true' },
      { APP_ORIGIN: 'http://tenangin.id' },
      { DATABASE_URL: 'postgres://runtime:unit-test-only@127.0.0.1/tenangin_demo' },
    ]) {
      expect(() => loadEnv({ ...profile, ...override })).toThrow();
    }
  });
});
