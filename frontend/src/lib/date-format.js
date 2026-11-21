export function formatIndonesianDate(value, timeZone = 'Asia/Jakarta') {
  if (!value) return '-';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);

  return new Intl.DateTimeFormat('id-ID', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatIndonesianDateTime(value, timeZone = 'Asia/Jakarta') {
  if (!value) return '-';
  const date = new Date(value);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatSecondsMMSS(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
