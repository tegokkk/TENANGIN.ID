export const MIN_K_THRESHOLD = 5;

export function applySuppression(snapshotRow, minK = MIN_K_THRESHOLD) {
  const distinctCount = Number(snapshotRow.contributor_count || 0);
  const suppressed = Boolean(snapshotRow.is_suppressed) || distinctCount < minK;

  if (suppressed) {
    return {
      metricKey: snapshotRow.metric_key,
      metricLabel: snapshotRow.metric_label,
      scopeGroup: snapshotRow.scope_group,
      weekStart: snapshotRow.week_start,
      weekEnd: snapshotRow.week_end,
      formulaVersion: snapshotRow.formula_version,
      isSuppressed: true,
      suppressionReason: 'Data belum cukup untuk ditampilkan',
      value: null,
      contributorCount: null,
      payload: null,
      computedAt: snapshotRow.computed_at,
    };
  }

  return {
    metricKey: snapshotRow.metric_key,
    metricLabel: snapshotRow.metric_label,
    scopeGroup: snapshotRow.scope_group,
    weekStart: snapshotRow.week_start,
    weekEnd: snapshotRow.week_end,
    formulaVersion: snapshotRow.formula_version,
    isSuppressed: false,
    suppressionReason: null,
    value: snapshotRow.metric_value !== null ? Number(snapshotRow.metric_value) : null,
    contributorCount: distinctCount,
    payload: snapshotRow.metric_payload || null,
    computedAt: snapshotRow.computed_at,
  };
}

/**
 * Supresi tambahan (secondary suppression):
 * Jika dalam satu periode & metrik hanya satu kelompok yang tersupresi sementara total atau kelompok lain tampil,
 * selisih total bisa membocorkan kelompok tersupresi. Fungsi ini memastikan jika ada tepat 1 kelompok tersupresi
 * dari >= 2 kelompok dan total tersedia, kelompok kedua terkecil ikut disupresi.
 */
export function applySecondarySuppression(presentations) {
  const suppressed = presentations.filter((p) => p.isSuppressed);
  const visible = presentations.filter((p) => !p.isSuppressed);
  if (
    suppressed.length === 1 &&
    visible.length >= 1 &&
    presentations.some((p) => p.scopeGroup === 'Semua Siswa')
  ) {
    const nonTotalVisible = visible.filter((p) => p.scopeGroup !== 'Semua Siswa');
    if (nonTotalVisible.length >= 1) {
      const secondary = nonTotalVisible.sort((a, b) => a.contributorCount - b.contributorCount)[0];
      secondary.isSuppressed = true;
      secondary.suppressionReason = 'Data belum cukup untuk ditampilkan';
      secondary.value = null;
      secondary.contributorCount = null;
      secondary.payload = null;
    }
  }
  return presentations;
}
