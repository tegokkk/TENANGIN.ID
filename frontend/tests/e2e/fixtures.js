import { test as base, expect } from '@playwright/test';
import { createTestContext } from '../../../backend/tests/setup/test-app.js';

export const test = base.extend({
  isolatedDataset: [
    async ({ baseURL }, use) => {
      if (baseURL !== 'http://127.0.0.1:5174')
        throw new Error('E2E harus memakai server test terisolasi.');
      const ctx = createTestContext();
      try {
        for (const raw of [ctx.env.DATABASE_URL, ctx.env.TEST_DATABASE_URL]) {
          const url = new URL(raw);
          if (url.hostname !== '127.0.0.1' || url.pathname !== '/tenangin_test')
            throw new Error('E2E hanya boleh mereset database lokal tenangin_test.');
        }
        await ctx.resetAndSeed();
        await use();
      } finally {
        await ctx.teardown();
      }
    },
    { auto: true },
  ],
});
export { expect };
