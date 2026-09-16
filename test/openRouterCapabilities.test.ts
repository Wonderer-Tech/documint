import test from "node:test";
import assert from "node:assert/strict";
import {
  getOpenRouterContextWindow,
  getOpenRouterMaxOutputTokens,
} from "../src/providers/openRouterCapabilities";

test("recognizes current Claude routed models", () => {
  assert.equal(
    getOpenRouterContextWindow("anthropic/claude-sonnet-5"),
    1000000,
  );
  assert.equal(
    getOpenRouterMaxOutputTokens("anthropic/claude-sonnet-5"),
    128000,
  );
});

test("uses shared context catalog for routed OpenAI models", () => {
  assert.equal(getOpenRouterContextWindow("openai/gpt-4o"), 128000);
  assert.equal(getOpenRouterContextWindow("openai/gpt-5.4"), 200000);
});

test("preserves conservative non-catalog fallbacks", () => {
  assert.equal(getOpenRouterContextWindow("google/gemini-2-pro"), 200000);
  assert.equal(getOpenRouterContextWindow("mistralai/mistral-large"), 32000);
  assert.equal(getOpenRouterContextWindow("meta-llama/llama-3"), 8192);
  assert.equal(getOpenRouterContextWindow("vendor/unknown-model"), 32000);
});

test("keeps output defaults bounded for unknown models", () => {
  assert.equal(getOpenRouterMaxOutputTokens("vendor/unknown-model"), 4096);
  assert.equal(getOpenRouterMaxOutputTokens("openai/gpt-4o"), 16384);
});
