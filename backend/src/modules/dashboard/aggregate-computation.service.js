import crypto from 'node:crypto';
import { getWeekBounds, getLocalDateString, getLastCompletedWeekStart } from '../../lib/time.js';
import { badRequest } from '../../lib/errors.js';
import { eligibleStudentIds } from '../../policies/consent-eligibility.policy.js';
import { localDateSchema } from '../../lib/validation.js';
import {
  applySecondarySuppression,
  applySuppression,
  MIN_K_THRESHOLD,
} from '../../policies/aggregate-privacy.policy.js';

export const FORMULA_VERSION = 'v1';

/**
 * Menghitung ulang snapshot mingguan (Senin-Minggu) per kelompok untuk minggu tertentu.
 * Hanya menyertakan akun siswa dengan persetujuan aktif (status='accepted' dan withdrawn_at IS NULL).
 * Mengikuti PRD Bagian 13: tidak pernah menghitung halaman baca/login sebagai aktivitas inti;
 * nilai kosong tidak diganti nol; ambang minimum k = 5.
 */
export async function computeWeeklySnapshots(
  db,
  schoolId,
  weekStartDateStr,
  timeZone = 'Asia/Jakarta'
) {
  if (!localDateSchema.safeParse(weekStartDateStr).success)
    throw badRequest('Tanggal minggu tidak valid.');
  const { weekStart, weekEnd } = getWeekBounds(weekStartDateStr, timeZone);
  if (weekStartDateStr !== weekStart || weekEnd >= getLocalDateString(new Date(), timeZone)) {
    throw badRequest(
      'Snapshot hanya dapat dihitung untuk hari Senin pada minggu yang sudah selesai.'
    );
  }
  const students = await db('users')
    .select('id', 'grade_group')
    .whereIn('id', eligibleStudentIds(db, schoolId));
  const studentGroupMap = new Map(students.map((s) => [s.id, s.grade_group || 'Umum']));
  const groups = Array.from(
    new Set(['Semua Siswa', ...students.map((s) => s.grade_group || 'Umum')])
  );

  const coreEvents = await db('activity_metadata_events')
    .where({ school_id: schoolId })
    .whereBetween('local_date', [weekStart, weekEnd])
    .whereIn('activity_type', ['mood', 'screening', 'journal', 'exercise', 'planner', 'reflection'])
    .select('user_id', 'activity_type');

  const moodRows = await db('mood_entries')
    .where({ school_id: schoolId, skipped: false })
    .whereBetween('local_date', [weekStart, weekEnd])
    .select('user_id', 'mood_score');

  const completedExercises = await db('exercise_sessions')
    .where({ school_id: schoolId, status: 'completed' })
    .whereBetween('local_date', [weekStart, weekEnd])
    .select('user_id');

  const reflectionRows = await db('weekly_reflections')
    .where({ school_id: schoolId, week_start: weekStart })
    .select('user_id', 'strategy_tags');

  const snapshotsToUpsert = [];

  for (const scopeGroup of groups) {
    const inGroup = (userId) => {
      const g = studentGroupMap.get(userId);
      if (!g) return false;
      return scopeGroup === 'Semua Siswa' ? true : g === scopeGroup;
    };

    const activeUsers = new Set(
      coreEvents
        .filter((e) => inGroup(e.user_id) && e.activity_type !== 'exercise')
        .map((e) => e.user_id)
    );
    for (const row of completedExercises) {
      if (inGroup(row.user_id)) activeUsers.add(row.user_id);
    }

    // Rerata mood: rerata per siswa pada minggu itu, lalu rerata antar siswa
    const moodByStudent = new Map();
    for (const row of moodRows) {
      if (!inGroup(row.user_id)) continue;
      if (!moodByStudent.has(row.user_id)) moodByStudent.set(row.user_id, []);
      moodByStudent.get(row.user_id).push(Number(row.mood_score));
    }
    const studentMoodAvgs = Array.from(moodByStudent.values()).map(
      (scores) => scores.reduce((a, b) => a + b, 0) / scores.length
    );
    const groupMoodAvg =
      studentMoodAvgs.length > 0
        ? Number((studentMoodAvgs.reduce((a, b) => a + b, 0) / studentMoodAvgs.length).toFixed(2))
        : null;

    const exerciseUsers = new Set(
      completedExercises.filter((r) => inGroup(r.user_id)).map((r) => r.user_id)
    );
    const reflectionUsers = new Set(
      reflectionRows.filter((r) => inGroup(r.user_id)).map((r) => r.user_id)
    );

    // Tren strategi terkurasi opsional (hanya tag terpilih, tunduk supresi k=5)
    const tagUserSets = new Map();
    for (const r of reflectionRows) {
      if (!inGroup(r.user_id)) continue;
      const tags = Array.isArray(r.strategy_tags) ? r.strategy_tags : [];
      for (const tag of tags) {
        if (!tagUserSets.has(tag)) tagUserSets.set(tag, new Set());
        tagUserSets.get(tag).add(r.user_id);
      }
    }
    const topStrategies = Array.from(tagUserSets.entries())
      .map(([tag, set]) => ({
        tag,
        userCount: set.size,
        proportion:
          reflectionUsers.size > 0 ? Number((set.size / reflectionUsers.size).toFixed(2)) : 0,
      }))
      .filter((item) => item.userCount >= MIN_K_THRESHOLD)
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 5);

    const metrics = [
      {
        metricKey: 'weekly_active_students',
        metricLabel: 'Siswa Aktif Mingguan',
        contributorCount: activeUsers.size,
        metricValue: activeUsers.size >= MIN_K_THRESHOLD ? activeUsers.size : null,
        metricPayload: null,
      },
      {
        metricKey: 'weekly_mood_average',
        metricLabel: 'Rerata Suasana Hati Kelompok (Skala 1-5)',
        contributorCount: studentMoodAvgs.length,
        metricValue: studentMoodAvgs.length >= MIN_K_THRESHOLD ? groupMoodAvg : null,
        metricPayload: null,
      },
      {
        metricKey: 'weekly_exercise_participants',
        metricLabel: 'Siswa Menyelesaikan Latihan Tenang',
        contributorCount: exerciseUsers.size,
        metricValue: exerciseUsers.size >= MIN_K_THRESHOLD ? exerciseUsers.size : null,
        metricPayload: null,
      },
      {
        metricKey: 'weekly_reflections',
        metricLabel: 'Siswa Menyimpan Refleksi Mingguan',
        contributorCount: reflectionUsers.size,
        metricValue: reflectionUsers.size >= MIN_K_THRESHOLD ? reflectionUsers.size : null,
        metricPayload: reflectionUsers.size >= MIN_K_THRESHOLD ? { topStrategies } : null,
      },
    ];

    for (const m of metrics) {
      const isSuppressed = m.contributorCount < MIN_K_THRESHOLD || m.metricValue === null;
      snapshotsToUpsert.push({
        id: crypto.randomUUID(),
        school_id: schoolId,
        scope_group: scopeGroup,
        week_start: weekStart,
        week_end: weekEnd,
        metric_key: m.metricKey,
        metric_label: m.metricLabel,
        formula_version: FORMULA_VERSION,
        instrument_version: null,
        contributor_count: m.contributorCount,
        metric_value: isSuppressed ? null : m.metricValue,
        metric_payload: isSuppressed
          ? null
          : m.metricPayload
            ? JSON.stringify(m.metricPayload)
            : null,
        is_suppressed: isSuppressed,
        invalidated: false,
        computed_at: new Date(),
      });
    }
  }

  // Groups that lost their final eligible contributor must not retain an older visible snapshot.
  await db('aggregate_snapshots')
    .where({ school_id: schoolId, week_start: weekStart })
    .update({ invalidated: true });
  for (const snap of snapshotsToUpsert) {
    await db('aggregate_snapshots')
      .insert(snap)
      .onConflict(['school_id', 'scope_group', 'week_start', 'metric_key', 'formula_version'])
      .merge({
        week_end: snap.week_end,
        metric_label: snap.metric_label,
        contributor_count: snap.contributor_count,
        metric_value: snap.metric_value,
        metric_payload: snap.metric_payload,
        is_suppressed: snap.is_suppressed,
        invalidated: false,
        computed_at: snap.computed_at,
      });
  }

  return snapshotsToUpsert;
}

export async function invalidateSnapshotsForDate(
  dbOrTrx,
  schoolId,
  localDateStr,
  timeZone = 'Asia/Jakarta'
) {
  const { weekStart } = getWeekBounds(localDateStr, timeZone);
  await dbOrTrx('aggregate_snapshots')
    .where({ school_id: schoolId, week_start: weekStart })
    .update({ invalidated: true });
}

export async function invalidateAllStudentWeekSnapshots(dbOrTrx, schoolId) {
  await dbOrTrx('aggregate_snapshots').where({ school_id: schoolId }).update({ invalidated: true });
}

export async function getSuppressedSnapshotsForSchool(
  db,
  { schoolId, timezone = 'Asia/Jakarta', assignedGroups = null }
) {
  const query = db('aggregate_snapshots')
    .where({ school_id: schoolId, invalidated: false })
    .where('week_start', '<=', getLastCompletedWeekStart(new Date(), timezone))
    .orderBy('week_start', 'desc')
    .limit(80);

  if (Array.isArray(assignedGroups)) {
    if (assignedGroups.length === 0) {
      return { weekStart: null, weekEnd: null, snapshots: [], snapshotsByGroup: {} };
    }
    if (!assignedGroups.includes('Semua Siswa')) {
      query.whereIn('scope_group', assignedGroups);
    }
  }

  const rawSnapshots = await query;
  const latestWeekStart = rawSnapshots[0]?.week_start || null;
  const latestRows = latestWeekStart
    ? rawSnapshots.filter((r) => r.week_start === latestWeekStart)
    : [];

  const presented = latestRows.map((row) => applySuppression(row, MIN_K_THRESHOLD));
  const byMetric = new Map();
  for (const item of presented) {
    if (!byMetric.has(item.metricKey)) byMetric.set(item.metricKey, []);
    byMetric.get(item.metricKey).push(item);
  }
  const finalized = [];
  for (const groupItems of byMetric.values()) {
    finalized.push(...applySecondarySuppression(groupItems));
  }

  const snapshotsByGroup = {};
  for (const item of finalized) {
    if (!snapshotsByGroup[item.scopeGroup]) snapshotsByGroup[item.scopeGroup] = [];
    snapshotsByGroup[item.scopeGroup].push(item);
  }

  return {
    weekStart: latestWeekStart,
    weekEnd: latestRows[0]?.week_end || null,
    snapshots: finalized,
    snapshotsByGroup,
  };
}
