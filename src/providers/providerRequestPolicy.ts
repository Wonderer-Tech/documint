export const CLOUD_PROVIDER_REQUEST_TIMEOUT_MS = 300_000;
export const CUSTOM_PROVIDER_REQUEST_TIMEOUT_MS = 120_000;

export function normalizeProviderTimeoutMs(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.floor(value!)
    : fallback;
}
