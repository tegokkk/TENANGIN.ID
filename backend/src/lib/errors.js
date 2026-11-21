export class AppError extends Error {
  constructor({
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    message = 'Terjadi kesalahan pada server.',
    fieldErrors = null,
    details = null,
  }) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }
}

export function badRequest(message = 'Input tidak valid.', fieldErrors = null, code = 'VALIDATION_ERROR') {
  return new AppError({ statusCode: 400, code, message, fieldErrors });
}

export function unauthorized(message = 'Sesi belum tersedia atau telah berakhir.', code = 'UNAUTHENTICATED') {
  return new AppError({ statusCode: 401, code, message });
}

export function forbidden(message = 'Kamu tidak memiliki izin untuk mengakses fitur ini.', code = 'FORBIDDEN') {
  return new AppError({ statusCode: 403, code, message });
}

export function consentRequired(message = 'Persetujuan penggunaan data diperlukan untuk melanjutkan.') {
  return new AppError({ statusCode: 403, code: 'CONSENT_REQUIRED', message });
}

export function mfaRequired(message = 'Verifikasi dua langkah (MFA) diperlukan sebelum membuka ruang staf.') {
  return new AppError({ statusCode: 403, code: 'MFA_REQUIRED', message });
}

export function notFound(message = 'Data yang diminta tidak ditemukan.', code = 'NOT_FOUND') {
  return new AppError({ statusCode: 404, code, message });
}

export function conflict(message = 'Data telah diubah oleh sesi lain. Muat ulang untuk meninjau.', code = 'CONFLICT') {
  return new AppError({ statusCode: 409, code, message });
}

export function serviceUnavailable(
  message = 'Layanan belum tersedia saat ini.',
  code = 'INSTRUMENT_UNAVAILABLE'
) {
  return new AppError({ statusCode: 503, code, message });
}
