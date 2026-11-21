import crypto from 'node:crypto';

export async function recordActivityMetadata(dbOrTrx, { user, activityType, activityLabel, statusLabel, durationSeconds = null, localDate }) {
  await dbOrTrx('activity_metadata_events').insert({
    id: crypto.randomUUID(),
    school_id: user.schoolId,
    user_id: user.id,
    grade_group: user.gradeGroup || 'Umum',
    activity_type: activityType,
    activity_label: activityLabel,
    status_label: statusLabel,
    duration_seconds: durationSeconds,
    local_date: localDate,
    occurred_at: new Date(),
  });
}
