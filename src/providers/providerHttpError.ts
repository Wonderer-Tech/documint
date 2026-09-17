import { classifyProviderFailure } from "./providerErrorPolicy";
import { extractProviderHttpStatus } from "./providerHttpStatus";

const TIMEOUT_CODES = new Set([
  "ECONNABORTED",
  "ESOCKETTIMEDOUT",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

export function normalizeProviderRequestError(
  error: unknown,
  providerLabel: string,
): Error {
  const record = getRecord(error);
  const response = getRecord(record?.response);
  const status = extractProviderHttpStatus(error);
  const code = typeof record?.code === "string" ? record.code : undefined;
  const name = typeof record?.name === "string" ? record.name : undefined;
  const originalMessage =
    extractProviderMessage(response?.data) ||
    (typeof record?.message === "string" ? record.message : undefined) ||
    "Request failed";
  const classification = classifyProviderFailure({
    status,
    code,
    name,
    message: originalMessage,
  });

  if (classification.kind === "cancelled") {
    if (error instanceof Error) {
      return error;
    }
    const cancelled = new Error(`${providerLabel} request cancelled.`);
    cancelled.name = "AbortError";
    return cancelled;
  }

  if (status === 401) {
    return new Error(
      `${providerLabel} authentication failed (401): ${originalMessage}. ` +
        `Update the configured API key and try again.`,
    );
  }

  if (status === 403) {
    return new Error(
      `${providerLabel} access denied (403): ${originalMessage}. ` +
        `Check model access, account permissions, and billing.`,
    );
  }

  if (status === 429) {
    return new Error(
      `${providerLabel} rate limit exceeded (429): ${originalMessage}. ` +
        `DocuMint already retried the transient request within its retry limit.`,
    );
  }

  if (status === 408) {
    return new Error(
      `${providerLabel} request timed out (408): ${originalMessage}. ` +
        `DocuMint already retried the transient request within its retry limit.`,
    );
  }

  if (status === 425) {
    return new Error(
      `${providerLabel} request remained too early to process (425): ${originalMessage}. ` +
        `DocuMint already retried the transient request within its retry limit.`,
    );
  }

  if (status !== undefined && status >= 500) {
    return new Error(
      `${providerLabel} server error (${status}): ${originalMessage}. ` +
        `DocuMint already retried the transient request within its retry limit.`,
    );
  }

  if (status !== undefined && status >= 400) {
    return new Error(`${providerLabel} request rejected (${status}): ${originalMessage}`);
  }

  if (classification.kind === "network") {
    const timedOut = isTimeoutCode(code);
    return new Error(
      timedOut
        ? `${providerLabel} request timed out after retrying: ${originalMessage}`
        : `${providerLabel} network request failed after retrying: ${originalMessage}`,
    );
  }

  return error instanceof Error
    ? error
    : new Error(`${providerLabel} request failed: ${originalMessage}`);
}

function isTimeoutCode(code: string | undefined): boolean {
  return code ? TIMEOUT_CODES.has(code.trim().toUpperCase()) : false;
}

function extractProviderMessage(value: unknown): string | undefined {
  const root = getRecord(value);
  const nestedError = getRecord(root?.error);
  for (const candidate of [
    nestedError?.message,
    root?.message,
    root?.detail,
    root?.error,
  ]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
