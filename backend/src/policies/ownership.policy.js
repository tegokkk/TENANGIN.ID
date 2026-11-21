import { forbidden, notFound } from '../lib/errors.js';

export function assertOwnership(record, userId, notFoundMessage = 'Data tidak ditemukan.') {
  if (!record) {
    throw notFound(notFoundMessage);
  }
  if (record.user_id !== userId) {
    // Kembalikan 404 konsisten agar tidak membocorkan keberadaan resource milik siswa lain
    throw notFound(notFoundMessage);
  }
  return record;
}

export function assertStudentOwned(record, userId, field = 'student_user_id') {
  if (!record) {
    throw notFound('Permintaan tidak ditemukan.');
  }
  if (record[field] !== userId) {
    throw notFound('Permintaan tidak ditemukan.');
  }
  return record;
}

export function assertRole(user, allowedRoles) {
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!user || !allowed.includes(user.role)) {
    throw forbidden();
  }
}
