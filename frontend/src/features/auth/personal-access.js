export function hasPersonalAccess(status) {
  return Boolean(status?.canUsePersonalFeatures ?? status?.hasActiveConsent);
}
