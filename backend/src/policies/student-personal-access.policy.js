/** Account activation and explicit consent are separate access modes. Never fabricate consent. */
export async function getStudentPersonalAccess(db, user, school = null) {
  const settings =
    school ||
    (await db('schools')
      .select('personal_access_mode', 'guardian_consent_required')
      .where({ id: user.schoolId })
      .first());
  const account = await db('users')
    .select('personal_access_paused_at')
    .where({ id: user.id })
    .first();
  const accessMode = settings?.personal_access_mode || 'consent';
  const policy = await db('consent_policies')
    .where({ school_id: user.schoolId, is_active: true })
    .first();
  const consent = policy
    ? await db('consents').where({ user_id: user.id, policy_id: policy.id }).first()
    : null;
  const accepted = Boolean(
    consent?.status === 'accepted' &&
    !consent.withdrawn_at &&
    consent.scope?.personal_activities === true
  );
  const guardianVerified =
    !settings?.guardian_consent_required || Boolean(consent?.guardian_verified);
  const hasActiveConsent = accepted && guardianVerified;
  const paused = Boolean(account?.personal_access_paused_at);
  const canUsePersonalFeatures = !paused && (accessMode === 'account_approval' || hasActiveConsent);
  return {
    status: {
      accessMode,
      required: accessMode === 'consent',
      canUsePersonalFeatures,
      paused,
      hasActiveConsent,
      guardianVerified,
      activePolicyVersion: policy?.version || null,
      status: paused
        ? 'paused'
        : consent?.status || (accessMode === 'account_approval' ? 'account_active' : 'pending'),
    },
    policy,
    consent,
  };
}
