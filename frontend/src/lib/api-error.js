export class ApiError extends Error {
  constructor({
    status = 0,
    code = 'NETWORK_ERROR',
    message = 'Tidak dapat terhubung ke server. Periksa koneksimu lalu coba lagi.',
    fieldErrors = null,
    requestId = null,
    isNetworkError = false,
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
    this.isNetworkError = isNetworkError;
  }
}

export function normalizeApiError(status, payload) {
  const errObj = payload?.error;
  return new ApiError({
    status,
    code: errObj?.code || (status === 401 ? 'UNAUTHENTICATED' : 'REQUEST_FAILED'),
    message: errObj?.message || 'Permintaan gagal diproses.',
    fieldErrors: errObj?.field_errors || null,
    requestId: errObj?.request_id || null,
    isNetworkError: false,
  });
}
