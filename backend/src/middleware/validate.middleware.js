import { badRequest } from '../lib/errors.js';

export function validateRequest({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      const fieldErrors = {};

      if (params) {
        const res = params.safeParse(req.params);
        if (!res.success) {
          for (const issue of res.error.issues) {
            fieldErrors[`params.${issue.path.join('.') || 'root'}`] = issue.message;
          }
        } else {
          req.validatedParams = res.data;
        }
      }

      if (query) {
        const res = query.safeParse(req.query);
        if (!res.success) {
          for (const issue of res.error.issues) {
            fieldErrors[`query.${issue.path.join('.') || 'root'}`] = issue.message;
          }
        } else {
          req.validatedQuery = res.data;
        }
      }

      if (body) {
        const res = body.safeParse(req.body);
        if (!res.success) {
          for (const issue of res.error.issues) {
            fieldErrors[issue.path.join('.') || 'body'] = issue.message;
          }
        } else {
          req.validatedBody = res.data;
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        return next(badRequest('Periksa kembali isian yang dimasukkan.', fieldErrors));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
