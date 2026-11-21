import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(2, 'Masukkan kode akun atau email.').max(200),
  password: z.string().min(1, 'Masukkan kata sandi.').max(200),
});

export const studentRegistrationSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(120),
    nisn: z
      .string()
      .trim()
      .regex(/^\d{10}$/, 'NISN harus terdiri dari 10 digit.'),
    gradeGroup: z.string().trim().min(1, 'Isi kelas.').max(64),
    password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(128),
    schoolCode: z.string().trim().min(3).max(64).optional(),
  })
  .strict();

export const recoverSchema = z.object({
  accountCode: z.string().trim().min(2, 'Masukkan kode akun.').max(64),
  token: z.string().trim().min(6, 'Masukkan token pemulihan yang valid.').max(128),
  newPassword: z
    .string()
    .min(8, 'Kata sandi baru minimal 8 karakter.')
    .max(128, 'Kata sandi maksimal 128 karakter.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Masukkan kata sandi saat ini.').max(200),
  newPassword: z
    .string()
    .min(8, 'Kata sandi baru minimal 8 karakter.')
    .max(128, 'Kata sandi maksimal 128 karakter.'),
});

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Kode verifikasi MFA harus 6 digit angka.'),
});

export const mfaRecoverSchema = z.object({
  recoveryCode: z.string().trim().min(6, 'Masukkan kode pemulihan MFA.').max(64),
});
