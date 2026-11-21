export function roleHomePath(role) {
  if (role === 'bk') return '/bk';
  if (role === 'superadmin') return '/superadmin';
  return '/app';
}
