import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderRequestError } from "../src/providers/providerHttpError";

test("normalizes provider authentication and permission errors", () => {
  assert.match(
    normalizeProviderRequestError(
      { response: { status: 401, data: { error: { message: "bad key" } } } },
      "Example",
    ).message,
    /authentication failed.*bad key/i,
  );

  assert.match(
    normalizeProviderRequestError(
      { response: { status: 403, data: { message: "no access" } } },
      "Example",
    ).message,
    /access denied.*no access/i,
  );
});

test("normalizes exhausted rate-limit and server failures", () => {
  assert.match(
    normalizeProviderRequestError(
      { response: { status: 429, data: { detail: "slow down" } } },
      "Example",
    ).message,
    /rate limit exceeded.*retried/i,
  );

  assert.match(
    normalizeProviderRequestError(
      { response: { status: 503, data: { error: "temporarily unavailable" } } },
      "Example",
    ).message,
    /server error.*temporarily unavailable.*retried/i,
  );
});

test("normalizes network timeout failures but preserves ordinary errors", () => {
  assert.match(
    normalizeProviderRequestError(
      { code: "ETIMEDOUT", message: "socket timeout" },
      "Example",
    ).message,
    /timed out after retrying/i,
  );

  const original = new Error("parser failed");
  assert.equal(normalizeProviderRequestError(original, "Example"), original);
});

test("preserves cancellation identity", () => {
  const cancelled = new Error("cancelled");
  cancelled.name = "AbortError";
  assert.equal(normalizeProviderRequestError(cancelled, "Example"), cancelled);
});
