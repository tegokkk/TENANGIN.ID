import request from 'supertest';
import { authenticator } from 'otplib';
import { loadEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { createLogger } from '../../src/lib/logger.js';
import { createApp } from '../../src/app.js';
import { runDemoSeed } from '../../database/seeds/demo-seed.js';

export function createTestContext(envOverrides = {}, appOverrides = {}) {
  const env = loadEnv({
    NODE_ENV: 'test',
    APP_MODE: 'demo',
    ALLOW_DEMO_SEED: 'true',
    LOG_LEVEL: 'silent',
    ...envOverrides,
  });

  const adminDb = createDatabase(env.TEST_DATABASE_URL || env.DATABASE_ADMIN_URL || env.DATABASE_URL);
  const appDb = createDatabase(env.DATABASE_URL);
  const logger = createLogger('silent');
  const { app, close } = createApp({ db: appDb, env, logger, ...appOverrides });

  return {
    env,
    adminDb,
    appDb,
    app,
    async resetAndSeed() {
      await adminDb('schools').whereNot({ code: 'SMA-CONTOH-01' }).del();
      await adminDb('user_sessions').del();
      await adminDb('audit_events').del();
      await adminDb('deleted_account_tombstones').del();
      await adminDb('deletion_requests').del();
      return runDemoSeed(adminDb, env);
    },
    async createAgent() {
      const agent = request.agent(app);
      const csrfRes = await agent.get('/api/auth/csrf');
      let csrfToken = csrfRes.body.data.csrfToken;

      return {
        agent,
        get csrfToken() {
          return csrfToken;
        },
        async refreshCsrf() {
          const r = await agent.get('/api/auth/csrf');
          csrfToken = r.body.data.csrfToken;
          return csrfToken;
        },
        async login(identifier, password, totpSecret = null) {
          const res = await agent
            .post('/api/auth/login')
            .set('x-csrf-token', csrfToken)
            .send({ identifier, password });
          if (res.body?.data?.csrfToken) {
            csrfToken = res.body.data.csrfToken;
          }
          if (res.status === 200 && totpSecret) {
            const code = authenticator.generate(totpSecret);
            const mfaRes = await agent
              .post('/api/auth/mfa/verify')
              .set('x-csrf-token', csrfToken)
              .send({ code });
            if (mfaRes.body?.data?.csrfToken) {
              csrfToken = mfaRes.body.data.csrfToken;
            }
            return { loginRes: res, mfaRes };
          }
          return { loginRes: res, mfaRes: null };
        },
      };
    },
    async teardown() {
      await close();
      await appDb.destroy();
      await adminDb.destroy();
    },
  };
}
