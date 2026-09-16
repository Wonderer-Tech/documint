export type ProviderFailureKind =
  | "cancelled"
  | "rate-limit"
  | "server"
  | "network"
  | "client"
  | "unknown";

export interface ProviderFailureInput {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
}

export interface ProviderFailureClassification {
  kind: ProviderFailureKind;
  retryable: boolean;
}

const CANCEL_CODES = new Set(["ERR_CANCELED", "ABORT_ERR"]);
const CANCEL_NAMES = new Set(["aborterror", "cancelederror", "cancellederror"]);

const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENETDOWN",
  "ENETUNREACH",
  "ENOTFOUND",
  "ESOCKETTIMEDOUT",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

/**
 * Classifies provider failures without depending on Axios or a specific SDK.
 * Permanent request/auth errors must not be retried automatically; transient
 * throttling, server, and transport failures may be retried by callers.
 */
export function classifyProviderFailure(
  failure: ProviderFailureInput,
): ProviderFailureClassification {
  const name = failure.name?.trim().toLowerCase();
  const code = failure.code?.trim().toUpperCase();

  if ((name && CANCEL_NAMES.has(name)) || (code && CANCEL_CODES.has(code))) {
    return { kind: "cancelled", retryable: false };
  }

  const status = failure.status;
  if (Number.isInteger(status)) {
    if (status === 429) {
      return { kind: "rate-limit", retryable: true };
    }

    if (status === 408 || status === 425 || (status! >= 500 && status! <= 599)) {
      return { kind: "server", retryable: true };
    }

    if (status! >= 400 && status! <= 499) {
      return { kind: "client", retryable: false };
    }
  }

  if (code && RETRYABLE_NETWORK_CODES.has(code)) {
    return { kind: "network", retryable: true };
  }

  return { kind: "unknown", retryable: false };
}

/**
 * Deterministic bounded exponential backoff. A provider Retry-After value wins
 * when it is a positive finite duration, while still respecting the max cap.
 */
export function getProviderRetryDelayMs(
  attempt: number,
  retryAfterMs?: number,
  baseDelayMs = 1000,
  maxDelayMs = 30000,
): number {
  const safeMax = normalizePositiveInteger(maxDelayMs, 30000);
  const explicitRetryAfter = normalizePositiveInteger(retryAfterMs, 0);
  if (explicitRetryAfter > 0) {
    return Math.min(explicitRetryAfter, safeMax);
  }

  const safeBase = normalizePositiveInteger(baseDelayMs, 1000);
  const safeAttempt = Number.isFinite(attempt)
    ? Math.max(0, Math.floor(attempt))
    : 0;
  return Math.min(safeBase * 2 ** safeAttempt, safeMax);
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.floor(value!)
    : fallback;
}
