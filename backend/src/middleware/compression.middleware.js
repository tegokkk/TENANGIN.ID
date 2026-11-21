import zlib from 'node:zlib';

const COMPRESSIBLE_RE = /^(application\/json|text\/|application\/javascript|image\/svg\+xml)/i;

export function createCompressionMiddleware(thresholdBytes = 1024) {
  return function compressionMiddleware(req, res, next) {
    if (req.method === 'HEAD') return next();
    const accept = String(req.headers['accept-encoding'] || '');
    if (!/\bgzip\b/i.test(accept)) return next();

    res.vary('Accept-Encoding');
    const origSend = res.send.bind(res);

    res.send = function compressedSend(body) {
      const cacheCtrl = String(res.getHeader('Cache-Control') || '');
      if (
        res.headersSent ||
        res.getHeader('Content-Encoding') ||
        /no-transform/i.test(cacheCtrl) ||
        body == null
      ) {
        return origSend(body);
      }

      const contentType = String(res.getHeader('Content-Type') || '');
      let buf = null;
      if (Buffer.isBuffer(body)) {
        if (!COMPRESSIBLE_RE.test(contentType)) return origSend(body);
        buf = body;
      } else if (typeof body === 'string') {
        if (!contentType) res.setHeader('Content-Type', 'text/html; charset=utf-8');
        else if (!COMPRESSIBLE_RE.test(contentType)) return origSend(body);
        buf = Buffer.from(body, 'utf8');
      } else {
        return origSend(body);
      }

      if (buf.length < thresholdBytes) {
        return origSend(body);
      }

      const zipped = zlib.gzipSync(buf, { level: zlib.constants.Z_BEST_SPEED });
      res.setHeader('Content-Encoding', 'gzip');
      res.removeHeader('Content-Length');
      return origSend(zipped);
    };

    next();
  };
}
