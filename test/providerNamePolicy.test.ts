import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProviderName,
  resolveProviderNameWithFallback,
} from "../src/providers/providerNamePolicy";

test("provider name policy preserves supported providers", () => {
  assert.equal(normalizeProviderName("openai"), "openai");
  assert.equal(normalizeProviderName(" Anthropic "), "anthropic");
  assert.equal(normalizeProviderName("OPENROUTER"), "openrouter");
  assert.equal(normalizeProviderName("deepseek"), "deepseek");
  assert.equal(normalizeProviderName("custom"), "custom");
});

test("provider name policy falls back before consent and factory use", () => {
  assert.equal(normalizeProviderName(undefined), "openai");
  assert.equal(normalizeProviderName(""), "openai");
  assert.equal(normalizeProviderName("unknown-provider"), "openai");
});

test("blank per-run provider overrides preserve the configured provider", () => {
  assert.equal(
    resolveProviderNameWithFallback("   ", "anthropic"),
    "anthropic",
  );
  assert.equal(
    resolveProviderNameWithFallback("\t", "deepseek"),
    "deepseek",
  );
  assert.equal(
    resolveProviderNameWithFallback(undefined, "openrouter"),
    "openrouter",
  );
  assert.equal(
    resolveProviderNameWithFallback(" custom ", "anthropic"),
    "custom",
  );
});
