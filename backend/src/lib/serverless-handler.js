// Share initialization across concurrent requests; a failed cold start may be retried.
export function createServerlessHandler(
  initialize,
  logError = () => console.error('vercel_api_initialization_failed')
) {
  let initialization;
  return async function handler(req, res) {
    let app;
    try {
      initialization ??= Promise.resolve()
        .then(initialize)
        .catch((error) => {
          initialization = undefined;
          throw error;
        });
      ({ app } = await initialization);
    } catch {
      logError();
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
