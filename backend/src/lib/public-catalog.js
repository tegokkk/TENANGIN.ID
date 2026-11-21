import { notFound } from './errors.js';

export function isRequestAuthenticated(req) {
  return Boolean(req.isAuthenticated && req.isAuthenticated() && req.user?.id);
}

export function applyPublicCatalogCache(req, res) {
  // Data katalog publik hanya boleh diberi header cache publik saat permintaan bebas cookie sesi (atau SW fetch credentials:'omit').
  if (isRequestAuthenticated(req)) {
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.removeHeader('Pragma');
  res.removeHeader('Expires');
}

export async function resolveTargetSchool(db, req) {
  const schoolCode = String(req.query?.schoolCode || '').trim();
  if (schoolCode) {
    const requested = await db('schools')
      .whereRaw('LOWER(code) = ?', [schoolCode.toLowerCase()])
      .andWhere({ is_active: true })
      .first();
    if (!requested) {
      throw notFound('Sekolah tidak ditemukan atau tidak aktif.');
    }
    return requested;
  }

  if (req.currentUser?.schoolId) {
    const userSchool = await db('schools')
      .where({ id: req.currentUser.schoolId, is_active: true })
      .first();
    if (userSchool) return userSchool;
  }

  if (isRequestAuthenticated(req)) {
    const user = await db('users').select('school_id').where({ id: req.user.id }).first();
    if (user?.school_id) {
      const userSchool = await db('schools').where({ id: user.school_id, is_active: true }).first();
      if (userSchool) return userSchool;
    }
  }

  const primary = await db('schools').where({ is_active: true }).orderBy('created_at', 'asc').first();
  return primary || null;
}
