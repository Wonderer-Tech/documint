export function resolveRequestContextWindow(
  explicitContextWindow: number | undefined,
  providerContextWindow: number,
): number {
  if (
    Number.isFinite(explicitContextWindow) &&
    (explicitContextWindow ?? 0) > 0
  ) {
    return Math.floor(explicitContextWindow!);
  }

  if (Number.isFinite(providerContextWindow) && providerContextWindow > 0) {
    return Math.floor(providerContextWindow);
  }

  return 8192;
}

export function hasExplicitContextWindow(
  contextWindow: number | undefined,
): boolean {
  return Number.isFinite(contextWindow) && (contextWindow ?? 0) > 0;
}
