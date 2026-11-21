import { z } from 'zod';

export const timezoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, 'Gunakan zona waktu IANA yang valid, misalnya Asia/Jakarta.');

export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Tanggal tidak valid.');

export const clockTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Gunakan waktu 00:00–23:59.');
