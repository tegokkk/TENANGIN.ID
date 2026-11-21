import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { authenticator } from 'otplib';
import { loadEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { hashPassword } from '../src/lib/password.js';
import { encryptSensitiveText } from '../src/lib/encryption.js';
import { hashToken, generateOpaqueToken } from '../src/lib/idempotency.js';
import { timezoneSchema } from '../src/lib/validation.js';
import { buildGovernanceSeedRows } from '../src/modules/superadmin/governance-defaults.js';
import { installProductGuides } from '../src/modules/library/product-guides.service.js';

const settingsSchema = z.object({
  schoolCode: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Z0-9-]+$/),
  schoolName: z.string().trim().min(3).max(200),
  timezone: timezoneSchema.default('Asia/Jakarta'),
  adminCode: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .default('Superadmin-01'),
  adminEmail: z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((email) => email.toLowerCase()),
  adminPassword: z.string().min(12),
  enableMfa: z.boolean().default(false),
});

export async function provisionFirstAdmin({ db, env, settings }) {
  const parsed = settingsSchema.safeParse(settings);
  if (!parsed.success)
    throw new Error(
      'Identitas sekolah, zona waktu, email, dan sandi admin (minimal 12 karakter) wajib valid.'
    );
  const value = parsed.data;
  const totpSecret = value.enableMfa ? authenticator.generateSecret() : null;
  const recoveryCode = value.enableMfa ? `REC-${generateOpaqueToken(8)}` : null;
  const passwordHash = await hashPassword(value.adminPassword, env.isTest);
  return db.transaction(async (trx) => {
    let school = await trx('schools').where({ code: value.schoolCode }).first();
    if (!school) {
      [school] = await trx('schools')
        .insert({
          id: crypto.randomUUID(),
          code: value.schoolCode,
          name: value.schoolName,
          timezone: value.timezone,
          service_hours: '',
          verified_contacts: JSON.stringify([]),
          guardian_consent_required: false,
          personal_access_mode: 'account_approval',
          active_handler_configured: true,
        })
        .returning('*');
    }
    if (await trx('users').where({ school_id: school.id, role: 'superadmin' }).first()) {
      throw new Error('Superadmin sekolah sudah tersedia; tidak ada akun atau sandi yang diubah.');
    }
    const adminId = crypto.randomUUID();
    await trx('users').insert({
      id: adminId,
      school_id: school.id,
      account_code: value.adminCode,
      login_email: value.adminEmail,
      display_name: 'Superadmin Sekolah',
      role: 'superadmin',
      status: 'active',
      password_hash: passwordHash,
      password_changed_at: new Date(),
      mfa_enabled: value.enableMfa,
      mfa_secret_encrypted: totpSecret ? encryptSensitiveText(totpSecret, env.keyRing) : null,
      mfa_recovery_hashes: recoveryCode ? JSON.stringify([hashToken(recoveryCode)]) : null,
    });
    if (!(await trx('governance_reviews').where({ school_id: school.id }).first())) {
      await trx('governance_reviews').insert(buildGovernanceSeedRows(crypto, school.id));
    }
    await installProductGuides(trx, school.id);
    return { schoolId: school.id, adminId, accountCode: value.adminCode, totpSecret, recoveryCode };
  });
}

export async function main() {
  const env = loadEnv();
  const db = createDatabase(env.DATABASE_ADMIN_URL || env.DATABASE_URL);
  try {
    const result = await provisionFirstAdmin({
      db,
      env,
      settings: {
        schoolCode: process.env.BOOTSTRAP_SCHOOL_CODE,
        schoolName: process.env.BOOTSTRAP_SCHOOL_NAME,
        timezone: process.env.BOOTSTRAP_TIMEZONE,
        adminCode: process.env.BOOTSTRAP_ADMIN_CODE,
        adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL,
        adminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD,
        enableMfa: process.env.BOOTSTRAP_ENABLE_MFA === 'true',
      },
    });
    console.log(
      'Superadmin resmi dibuat. Login standar menggunakan email dan kata sandi. Lengkapi kebijakan, kontak, petugas, dan review sekolah sebelum membuka layanan siswa.'
    );
    console.log('Kode akun:', result.accountCode);
    if (result.totpSecret) {
      console.log('TOTP secret (simpan di authenticator):', result.totpSecret);
      console.log('Kode pemulihan sekali pakai:', result.recoveryCode);
    }
  } finally {
    await db.destroy();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('Bootstrap admin gagal:', error.message);
    process.exitCode = 1;
  });
}
