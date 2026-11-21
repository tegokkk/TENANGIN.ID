import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';
import { assertSafeDemoSeedTarget } from '../../database/seeds/demo-seed.js';

describe('Fixture hanya untuk pengujian terisolasi', () => {
  const fixture = {
    NODE_ENV: 'test',
    APP_MODE: 'demo',
    ALLOW_DEMO_SEED: true,
    TEST_DATABASE_URL: 'postgres://local@127.0.0.1/tenangin_test',
  };
  it('menolak seed runtime, production, dan database yang bukan test', () => {
    expect(() => assertSafeDemoSeedTarget(fixture)).not.toThrow();
    for (const override of [
      { NODE_ENV: 'development' },
      { NODE_ENV: 'production' },
      { APP_MODE: 'pilot' },
      { ALLOW_DEMO_SEED: false },
      { TEST_DATABASE_URL: 'postgres://local@127.0.0.1/tenangin_production' },
      { TEST_DATABASE_URL: 'postgres://local@127.0.0.1/tenangin_demo' },
    ])
      expect(() => assertSafeDemoSeedTarget({ ...fixture, ...override })).toThrow();
  });
  it('default runtime memilih mode nyata dan menolak opt-in dummy di luar test', () => {
    expect(
      loadEnv({ NODE_ENV: 'development', APP_MODE: undefined, ALLOW_DEMO_SEED: 'false' }).APP_MODE
    ).toBe('pilot');
    expect(() =>
      loadEnv({ NODE_ENV: 'development', APP_MODE: 'demo', ALLOW_DEMO_SEED: 'true' })
    ).toThrow();
  });
});
