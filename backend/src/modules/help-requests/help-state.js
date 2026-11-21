export const HELP_STATUS_LABELS = {
  submitted: 'Terkirim (Tersimpan)',
  acknowledged: 'Diterima Pengelola',
  follow_up: 'Sedang Ditindaklanjuti',
  closed: 'Selesai',
  cancelled: 'Dibatalkan Siswa',
};

const SUPERADMIN_TRANSITIONS = {
  submitted: new Set(['acknowledged', 'follow_up', 'closed']),
  acknowledged: new Set(['follow_up', 'closed']),
  follow_up: new Set(['closed']),
  closed: new Set(),
  cancelled: new Set(),
};

const STUDENT_CANCELLABLE = new Set(['submitted', 'acknowledged', 'follow_up']);

export function canTransitionHelpStatus(actorRole, currentStatus, nextStatus) {
  if (actorRole === 'student') {
    return nextStatus === 'cancelled' && STUDENT_CANCELLABLE.has(currentStatus);
  }
  if (actorRole === 'superadmin') {
    const allowed = SUPERADMIN_TRANSITIONS[currentStatus];
    return Boolean(allowed && allowed.has(nextStatus));
  }
  return false;
}
