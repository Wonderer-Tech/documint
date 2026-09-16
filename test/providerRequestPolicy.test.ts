import test from "node:test";
import assert from "node:assert/strict";
import {
  CLOUD_PROVIDER_REQUEST_TIMEOUT_MS,
  CUSTOM_PROVIDER_REQUEST_TIMEOUT_MS,
  normalizeProviderTimeoutMs,
} from "../src/providers/providerRequestPolicy";

test("provider request timeout defaults stay bounded", () => {
  assert.equal(CLOUD_PROVIDER_REQUEST_TIMEOUT_MS, 300_000);
  assert.equal(CUSTOM_PROVIDER_REQUEST_TIMEOUT_MS, 120_000);
});

test("provider request timeout normalization rejects invalid values", () => {
  assert.equal(normalizeProviderTimeoutMs(12_345.9, 1000), 12_345);
  assert.equal(normalizeProviderTimeoutMs(0, 1000), 1000);
  assert.equal(normalizeProviderTimeoutMs(-1, 1000), 1000);
  assert.equal(normalizeProviderTimeoutMs(Number.NaN, 1000), 1000);
});
