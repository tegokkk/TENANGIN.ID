import { createServerlessHandler } from '../backend/src/lib/serverless-handler.js';
import { startupError } from '../backend/src/lib/startup-error.js';

// Vercel builds only the frontend. Database initialization starts on the first API request.
export default createServerlessHandler(async () => {
  process.env.NODE_ENV = 'production';
  let createVercelRuntime;
  try {
    ({ createVercelRuntime } = await import('../backend/src/vercel-runtime.js'));
  } catch (error) {
    throw startupError('module_load', error);
  }
  return createVercelRuntime();
});
