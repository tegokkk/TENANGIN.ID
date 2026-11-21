import { createServerlessHandler } from '../backend/src/lib/serverless-handler.js';

// Vercel builds only the frontend. Database initialization starts on the first API request.
export default createServerlessHandler(async () => {
  process.env.NODE_ENV = 'production';
  const { createVercelRuntime } = await import('../backend/src/vercel-runtime.js');
  return createVercelRuntime();
});
