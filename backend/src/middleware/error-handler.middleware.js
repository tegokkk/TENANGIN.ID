import { AppError, conflict, badRequest } from '../lib/errors.js';
import { sendError } from '../lib/response.js';

export function createErrorHandler(logger) {
  return (err, req, res, _next) => {
    if (err?.code === '23505')
      return sendError(
        res,
        conflict('Data dengan identitas, tanggal, atau periode tersebut sudah tersedia.'),
        res.locals?.requestId
      );
    if (err?.code === '23503')
      return sendError(
        res,
        badRequest('Referensi data tidak tersedia atau masih digunakan.'),
        res.locals?.requestId
      );
    if (err?.code === 'EBADCSRFTOKEN' || err?.message?.toLowerCase?.().includes('csrf')) {
      return sendError(
        res,
        new AppError({
          statusCode: 403,
          code: 'CSRF_INVALID',
          message: 'Token keamanan tidak valid atau kedaluwarsa. Muat ulang halaman dan coba lagi.',
        }),
        res.locals?.requestId
      );
    }

    if (err instanceof AppError) {
      if (err.statusCode >= 500 && logger) {
        logger.error('app_error', {
          request_id: res.locals?.requestId,
          code: err.code,
          msg: err.message,
        });
      }
      return sendError(res, err, res.locals?.requestId);
    }

    if (logger) {
      logger.error('unhandled_error', {
        request_id: res.locals?.requestId,
        errorName: err?.name,
        code: err?.code,
        msg: err?.message,
      });
    }

    return sendError(
      res,
      new AppError({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Terjadi gangguan sementara pada server.',
      }),
      res.locals?.requestId
    );
  };
}
