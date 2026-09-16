import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderName } from "../src/providers/providerNamePolicy";

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
