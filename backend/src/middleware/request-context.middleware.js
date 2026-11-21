import crypto from 'node:crypto';

export function requestContextMiddleware(logger) {
  return (req, res, next) => {
    const requestId = crypto.randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();
    res.on('finish', () => {
      if (logger) {
        logger.info('http_request', {
          request_id: requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration_ms: Date.now() - start,
        });
      }
    });

    next();
  };
}
