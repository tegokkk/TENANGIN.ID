import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'node ../backend/src/server.js',
      url: 'http://127.0.0.1:3001/api/ready',
      env: {
        NODE_ENV: 'test',
        APP_MODE: 'demo',
        ALLOW_DEMO_SEED: 'true',
        PORT: '3001',
        APP_ORIGIN: 'http://127.0.0.1:5174',
        LOG_LEVEL: 'silent',
      },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      env: { VITE_API_PROXY_TARGET: 'http://127.0.0.1:3001' },
      reuseExistingServer: false,
    },
  ],
});
