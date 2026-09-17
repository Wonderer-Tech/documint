import {
  classifyProviderFailure,
  getProviderRetryDelayMs,
} from "./providerErrorPolicy";
import { extractProviderHttpStatus } from "./providerHttpStatus";

export interface ProviderRetryOptions {
  /** Number of retries after the initial attempt. */
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  /** Test hook; runtime callers use the default abort-aware timer. */
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
}

/**
 * Runs one provider request with conservative bounded retries.
 * Only failures classified as transient (429, 408/425/5xx, known network
 * failures) are retried. Authentication, request/model errors, cancellation,
 * and unknown failures are returned immediately to the provider-specific
 * error formatter.
 */
export async function runProviderRequestWithRetry<T>(
  operation: () => Promise<T>,
  options: ProviderRetryOptions = {},
): Promise<T> {
  const maxRetries = normalizeNonNegativeInteger(options.maxRetries, 2);
  const sleep = options.sleep ?? sleepWithSignal;

  for (let attempt = 0; ; attempt++) {
    throwIfAborted(options.signal);

    try {
      return await operation();
    } catch (error) {
      const failure = getProviderFailureInput(error);
      const classification = classifyProviderFailure(failure);
      if (!classification.retryable || attempt >= maxRetries) {
        throw error;
      }

      const delayMs = getProviderRetryDelayMs(
        attempt,
        getRetryAfterMs(error),
        options.baseDelayMs,
        options.maxDelayMs,
      );
      await sleep(delayMs, options.signal);
    }
  }
}

export function getRetryAfterMs(error: unknown, now = Date.now()): number | undefined {
  const response = getRecord(error)?.response;
  const headers = getRecord(response)?.headers;

  const explicitMilliseconds = readHeader(headers, "retry-after-ms");
  const parsedMilliseconds = parseNonNegativeNumber(explicitMilliseconds);
  if (parsedMilliseconds !== undefined) {
    return Math.floor(parsedMilliseconds);
  }

  const raw = readHeader(headers, "retry-after");
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw * 1000);
  }

  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds * 1000);
  }

  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return Math.max(0, timestamp - now);
}

function getProviderFailureInput(error: unknown): {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
} {
  const record = getRecord(error);

  return {
    status: extractProviderHttpStatus(error),
    code: typeof record?.code === "string" ? record.code : undefined,
    name: typeof record?.name === "string" ? record.name : undefined,
    message: typeof record?.message === "string" ? record.message : undefined,
  };
}

function readHeader(headers: unknown, name: string): unknown {
  if (!headers) {
    return undefined;
  }

  const getter = getRecord(headers)?.get;
  if (typeof getter === "function") {
    try {
      const value = getter.call(headers, name);
      if (value !== undefined && value !== null) {
        return value;
      }
    } catch {
      // Fall through to plain-object lookup.
    }
  }

  const record = getRecord(headers);
  if (!record) {
    return undefined;
  }

  const exact = record[name] ?? record[toHeaderCase(name)];
  if (exact !== undefined) {
    return exact;
  }

  const normalizedName = name.toLowerCase();
  for (const [headerName, value] of Object.entries(record)) {
    if (headerName.toLowerCase() === normalizedName) {
      return value;
    }
  }

  return undefined;
}

function parseNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function toHeaderCase(name: string): string {
  return name
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join("-");
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

async function sleepWithSignal(delayMs: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, delayMs));

    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function createAbortError(): Error {
  const error = new Error("Provider request cancelled");
  error.name = "AbortError";
  return error;
}

function normalizeNonNegativeInteger(value: number | undefined, fallback: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.floor(value!))
    : fallback;
}
