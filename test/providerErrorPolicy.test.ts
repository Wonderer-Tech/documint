import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyProviderFailure,
  getProviderRetryDelayMs,
} from "../src/providers/providerErrorPolicy";

test("provider failure policy does not retry permanent client errors", () => {
  for (const status of [400, 401, 403, 404, 422]) {
    assert.deepEqual(classifyProviderFailure({ status }), {
      kind: "client",
      retryable: false,
    });
  }
});

test("provider failure policy retries throttling and transient server errors", () => {
  assert.deepEqual(classifyProviderFailure({ status: 429 }), {
    kind: "rate-limit",
    retryable: true,
  });

  for (const status of [408, 425, 500, 502, 503, 599]) {
    assert.equal(classifyProviderFailure({ status }).retryable, true);
  }
});

test("provider failure policy retries known transport failures but not cancellation", () => {
  assert.deepEqual(classifyProviderFailure({ code: "ETIMEDOUT" }), {
    kind: "network",
    retryable: true,
  });
  assert.deepEqual(classifyProviderFailure({ code: "ECONNRESET" }), {
    kind: "network",
    retryable: true,
  });
  assert.deepEqual(classifyProviderFailure({ name: "AbortError" }), {
    kind: "cancelled",
    retryable: false,
  });
  assert.deepEqual(classifyProviderFailure({ code: "ERR_CANCELED" }), {
    kind: "cancelled",
    retryable: false,
  });
});

test("provider retry delay uses bounded exponential backoff", () => {
  assert.equal(getProviderRetryDelayMs(0), 1000);
  assert.equal(getProviderRetryDelayMs(1), 2000);
  assert.equal(getProviderRetryDelayMs(4), 16000);
  assert.equal(getProviderRetryDelayMs(10), 30000);
  assert.equal(getProviderRetryDelayMs(2, 7500), 7500);
  assert.equal(getProviderRetryDelayMs(2, 90000), 30000);
});
