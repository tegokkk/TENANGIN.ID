/** Shared eligibility for configured access mode, opt-out, aggregation, and BK metadata. */
export function eligibleStudentIds(db, schoolId) {
  return db('users as eligible_user')
    .select('eligible_user.id')
    .join('schools as eligible_school', 'eligible_school.id', 'eligible_user.school_id')
    .where({
      'eligible_user.school_id': schoolId,
      'eligible_user.role': 'student',
      'eligible_user.status': 'active',
    })
    .whereNull('eligible_user.personal_access_paused_at')
    .where(function () {
      this.whereNull('eligible_user.registration_status').orWhere(
        'eligible_user.registration_status',
        'approved'
      );
    })
    .where(function () {
      this.where('eligible_school.personal_access_mode', 'account_approval').orWhere(function () {
        this.where('eligible_school.personal_access_mode', 'consent').whereExists(function () {
          this.select(db.raw('1'))
            .from('consents as eligible_consent')
            .join(
              'consent_policies as eligible_policy',
              'eligible_policy.id',
              'eligible_consent.policy_id'
            )
            .whereRaw('eligible_consent.user_id = eligible_user.id')
            .whereRaw('eligible_consent.school_id = eligible_user.school_id')
            .whereRaw('eligible_policy.school_id = eligible_user.school_id')
            .where({ 'eligible_policy.is_active': true, 'eligible_consent.status': 'accepted' })
            .whereNull('eligible_consent.withdrawn_at')
            .whereRaw('eligible_consent.scope @> ?::jsonb', [
              JSON.stringify({ personal_activities: true, group_aggregate: true }),
            ])
            .where(function () {
              this.where('eligible_school.guardian_consent_required', false).orWhere(
                'eligible_consent.guardian_verified',
                true
              );
            });
        });
      });
    });
}
