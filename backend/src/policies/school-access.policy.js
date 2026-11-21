import { notFound } from '../lib/errors.js';

export function assertSameSchool(record, schoolId, message = 'Data tidak ditemukan.') {
  if (!record || record.school_id !== schoolId) {
    throw notFound(message);
  }
  return record;
}
