// Share initialization across concurrent requests; a failed cold start may be retried.
export function createServerlessHandler(
  initialize,
  logError = (diagnostic) => console.error(JSON.stringify(diagnostic))
) {
  let initialization;
  return async function handler(req, res) {
    let app;
    try {
      initialization ??= Promise.resolve()
        .then(initialize)
        .catch((error) => {
          initialization = undefined;
          logError(describeStartupError(error));
          throw error;
        });
      ({ app } = await initialization);
    } catch {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'private, no-store');
      res.end(
        JSON.stringify({
          ok: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Layanan belum siap. Periksa konfigurasi deployment dan database.',
          },
        })
      );
      return;
    }
    return app(req, res);
  };
}
import { describeStartupError } from './startup-error.js';
