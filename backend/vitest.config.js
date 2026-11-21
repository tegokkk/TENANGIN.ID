import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: 'test',
    },
  },
});
