export function sendSuccess(res, data, statusCode = 200, meta = undefined) {
  const payload = meta ? { ok: true, data, meta } : { ok: true, data };
  return res.status(statusCode).json(payload);
}

export function sendError(res, err, requestId) {
  const statusCode = err?.statusCode || 500;
  const payload = {
    ok: false,
    error: {
      code: err?.code || 'INTERNAL_ERROR',
      message: statusCode >= 500 ? 'Terjadi gangguan sementara pada server.' : err.message,
      request_id: requestId || res.locals?.requestId || null,
    },
  };
  if (err?.fieldErrors) {
    payload.error.field_errors = err.fieldErrors;
  }
  if (err?.details && statusCode < 500) {
    payload.error.details = err.details;
  }
  return res.status(statusCode).json(payload);
}

export function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
