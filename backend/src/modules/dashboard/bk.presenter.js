/**
 * Allowlist presenter khusus Guru BK (read-only metadata).
 * Melarang keras pengiriman isi jurnal, jawaban refleksi, skor skrining,
 * nilai mood, judul tugas, atau pesan/kontak permintaan bantuan.
 */
export function presentBkActivityMetadata(row) {
  return {
    id: row.id,
    studentCode: row.account_code,
    gradeGroup: row.grade_group,
    activityType: row.activity_type,
    activityLabel: row.activity_label,
    statusLabel: row.status_label,
    durationSeconds: row.duration_seconds !== null ? Number(row.duration_seconds) : null,
    localDate: row.local_date,
    occurredAt: row.occurred_at,
  };
}
