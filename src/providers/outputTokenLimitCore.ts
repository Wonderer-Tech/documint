export function resolveOutputTokenLimit(
  requestedTokens: number,
  configuredTokens?: number,
): number {
  const requested = Number.isFinite(requestedTokens)
    ? Math.max(1, Math.floor(requestedTokens))
    : 1;

  if (!Number.isFinite(configuredTokens) || (configuredTokens ?? 0) <= 0) {
    return requested;
  }

  return Math.min(
    requested,
    Math.max(1, Math.floor(configuredTokens!)),
  );
}
