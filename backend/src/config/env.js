import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';
import { buildKeyRing } from '../lib/encryption.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.VERCEL)
  dotenv.config({
    path: path.resolve(
      __dirname,
      process.env.NODE_ENV === 'production' ? '../../.env.production' : '../../.env'
    ),
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_MODE: z.enum(['demo', 'pilot']).default('pilot'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url().default('http://127.0.0.1:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  SERVE_FRONTEND_DIST: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  FRONTEND_DIST_DIR: z.string().optional().default(''),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi.'),
  DATABASE_ADMIN_URL: z.string().optional(),
  WORKER_DATABASE_URL: z.string().optional().default(''),
  TEST_DATABASE_URL: z.string().optional(),
  TEST_APP_DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET minimal 32 karakter acak.'),
  ENCRYPTION_KEY_ID: z.string().min(1).default('k1'),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY harus 64 karakter hex.'),
  ENCRYPTION_KEYRING: z.string().optional().default(''),
  ALLOW_DEMO_SEED: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:pengelola@tenangin.id'),
  DB_POOL_MIN: z.coerce.number().int().min(0).max(20).default(1),
  DB_POOL_MAX: z.coerce.number().int().min(2).max(100).default(10),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
});

export function loadEnv(overrides = {}) {
  const merged = { ...process.env, ...overrides };
  merged.APP_MODE ??= 'pilot';
  if (merged.NODE_ENV === 'test' && merged.TEST_APP_DATABASE_URL) {
    merged.DATABASE_URL = merged.TEST_APP_DATABASE_URL;
  } else if (merged.NODE_ENV === 'test' && merged.TEST_DATABASE_URL && !merged.DATABASE_URL) {
    merged.DATABASE_URL = merged.TEST_DATABASE_URL;
  }

  const parsed = envSchema.safeParse(merged);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Konfigurasi environment tidak valid: ${issues}`);
  }

  const data = parsed.data;
  if (data.NODE_ENV !== 'test' && (data.APP_MODE === 'demo' || data.ALLOW_DEMO_SEED)) {
    throw new Error('Mode dan seed dummy hanya diizinkan pada environment test terisolasi.');
  }
  if (data.NODE_ENV === 'production') {
    if (data.APP_MODE !== 'pilot' || data.ALLOW_DEMO_SEED) {
      throw new Error('Production membutuhkan APP_MODE=pilot dan ALLOW_DEMO_SEED=false.');
    }
    if (new URL(data.APP_ORIGIN).protocol !== 'https:') {
      throw new Error('APP_ORIGIN production harus menggunakan HTTPS.');
    }
    if (/\/(tenangin_demo)(?:\?|$)/i.test(data.DATABASE_URL)) {
      throw new Error('Production tidak boleh terhubung ke database demo.');
    }
  }
  if (data.APP_MODE === 'pilot' && data.ALLOW_DEMO_SEED) {
    throw new Error('Konfigurasi ditolak: ALLOW_DEMO_SEED tidak boleh true saat APP_MODE=pilot.');
  }
  if (
    /CHANGE_ME|REPLACE_WITH/i.test(data.SESSION_SECRET) ||
    /CHANGE_ME|REPLACE_WITH/i.test(data.ENCRYPTION_KEY)
  ) {
    throw new Error('Konfigurasi ditolak: secret atau kunci enkripsi masih memakai placeholder.');
  }

  const keyRing = buildKeyRing(
    data.ENCRYPTION_KEY_ID,
    data.ENCRYPTION_KEY,
    data.ENCRYPTION_KEYRING
  );

  return {
    ...data,
    keyRing,
    isProd: data.NODE_ENV === 'production',
    isTest: data.NODE_ENV === 'test',
    isDemo: data.APP_MODE === 'demo',
  };
}
