/**
 * Menghitung tanggal lokal (YYYY-MM-DD) dalam zona waktu IANA sekolah.
 * @param {Date} date
 * @param {string} timeZone
 * @returns {string}
 */
export function getLocalDateString(date = new Date(), timeZone = 'Asia/Jakarta') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Mengembalikan hari dalam seminggu (1 = Senin .. 7 = Minggu) dan waktu HH:mm lokal.
 * @param {Date} date
 * @param {string} timeZone
 */
export function getLocalTimeParts(date = new Date(), timeZone = 'Asia/Jakarta') {
  const localDate = getLocalDateString(date, timeZone);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = Number(map.hour === '24' ? '0' : map.hour);
  const minute = Number(map.minute);

  const [y, m, d] = localDate.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  const isoWeekday = utcDay === 0 ? 7 : utcDay;

  return {
    localDate,
    isoWeekday,
    timeHHMM: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    minutesFromMidnight: hour * 60 + minute,
  };
}

/**
 * Menghitung tanggal Senin (week_start) dan Minggu (week_end) untuk minggu lokal Senin-Minggu.
 * @param {string|Date} inputDateOrStr
 * @param {string} timeZone
 * @returns {{ weekStart: string, weekEnd: string }}
 */
export function getWeekBounds(inputDateOrStr = new Date(), timeZone = 'Asia/Jakarta') {
  const localDate =
    typeof inputDateOrStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(inputDateOrStr)
      ? inputDateOrStr
      : getLocalDateString(inputDateOrStr instanceof Date ? inputDateOrStr : new Date(inputDateOrStr), timeZone);

  const [y, m, d] = localDate.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = utcDate.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(utcDate);
  monday.setUTCDate(utcDate.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

/**
 * Mengembalikan week_start untuk minggu sebelumnya yang sudah selesai.
 */
export function getLastCompletedWeekStart(now = new Date(), timeZone = 'Asia/Jakarta') {
  const { weekStart } = getWeekBounds(now, timeZone);
  const [y, m, d] = weekStart.split('-').map(Number);
  const prevMonday = new Date(Date.UTC(y, m - 1, d - 7));
  return prevMonday.toISOString().slice(0, 10);
}

/**
 * Memeriksa apakah HH:mm berada dalam rentang jam tenang (mendukung lewat tengah malam, mis. 21:30 - 06:00).
 */
export function isWithinQuietHours(timeHHMM, quietStartHHMM, quietEndHHMM) {
  if (!quietStartHHMM || !quietEndHHMM) return false;
  const toMin = (str) => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };
  const nowMin = toMin(timeHHMM);
  const startMin = toMin(quietStartHHMM);
  const endMin = toMin(quietEndHHMM);

  if (startMin === endMin) return false;
  if (startMin < endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  return nowMin >= startMin || nowMin < endMin;
}
