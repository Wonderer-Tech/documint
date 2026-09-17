import test from "node:test";
import assert from "node:assert/strict";
import {
  getOpenRouterContextWindow,
  getOpenRouterMaxOutputTokens,
} from "../src/providers/openRouterCapabilities";

test("recognizes current Claude routed models", () => {
  for (const model of [
    "anthropic/claude-fable-5",
    "anthropic/claude-mythos-5",
    "anthropic/claude-opus-5",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-opus-4-8",
    "anthropic/claude-opus-4-7",
    "anthropic/claude-opus-4-6",
    "anthropic/claude-sonnet-4-6",
  ]) {
    assert.equal(getOpenRouterContextWindow(model), 1000000, model);
    assert.equal(getOpenRouterMaxOutputTokens(model), 128000, model);
  }

  assert.equal(
    getOpenRouterContextWindow("anthropic/claude-haiku-4-5-20251001"),
    200000,
  );
  assert.equal(
    getOpenRouterMaxOutputTokens("anthropic/claude-haiku-4-5-20251001"),
    64000,
  );
});

test("uses shared OpenAI capabilities for routed OpenAI models", () => {
  assert.equal(getOpenRouterContextWindow("openai/gpt-4o"), 128000);
  assert.equal(getOpenRouterMaxOutputTokens("openai/gpt-4o"), 16384);

  assert.equal(getOpenRouterContextWindow("openai/gpt-4.1-mini"), 1047576);
  assert.equal(getOpenRouterMaxOutputTokens("openai/gpt-4.1-mini"), 32768);

  assert.equal(getOpenRouterContextWindow("openai/gpt-5.4"), 1050000);
  assert.equal(getOpenRouterMaxOutputTokens("openai/gpt-5.4"), 128000);

  assert.equal(getOpenRouterContextWindow("openai/o4-mini"), 200000);
  assert.equal(getOpenRouterMaxOutputTokens("openai/o4-mini"), 100000);

  assert.equal(
    getOpenRouterContextWindow("openai/o4-mini-2025-04-16"),
    200000,
  );
  assert.equal(
    getOpenRouterMaxOutputTokens("openai/o4-mini-2025-04-16"),
    100000,
  );

  for (const model of [
    "openai/gpt-5.6",
    "openai/gpt-5.6-sol",
    "openai/gpt-5.6-terra",
    "openai/gpt-5.6-luna",
  ]) {
    assert.equal(getOpenRouterContextWindow(model), 1050000, model);
    assert.equal(getOpenRouterMaxOutputTokens(model), 128000, model);
  }
});

test("uses shared DeepSeek capabilities for routed DeepSeek models", () => {
  assert.equal(getOpenRouterContextWindow("deepseek/deepseek-flash"), 1000000);
  assert.equal(getOpenRouterMaxOutputTokens("deepseek/deepseek-flash"), 384000);

  assert.equal(getOpenRouterContextWindow("deepseek/deepseek-v4-pro"), 1000000);
  assert.equal(getOpenRouterMaxOutputTokens("deepseek/deepseek-v4-pro"), 384000);
});

test("OpenRouter routing variants retain base-model capabilities", () => {
  assert.equal(getOpenRouterContextWindow("openai/gpt-5.6-sol:nitro"), 1050000);
  assert.equal(getOpenRouterMaxOutputTokens("openai/gpt-5.6-sol:nitro"), 128000);

  assert.equal(getOpenRouterContextWindow("openai/gpt-5.4:nitro"), 1050000);
  assert.equal(getOpenRouterMaxOutputTokens("openai/gpt-5.4:nitro"), 128000);

  assert.equal(getOpenRouterContextWindow("openai/gpt-4.1-mini:online"), 1047576);
  assert.equal(getOpenRouterMaxOutputTokens("openai/gpt-4.1-mini:online"), 32768);

  assert.equal(getOpenRouterContextWindow("openai/o4-mini:nitro"), 200000);
  assert.equal(getOpenRouterMaxOutputTokens("openai/o4-mini:nitro"), 100000);

  assert.equal(
    getOpenRouterContextWindow("anthropic/claude-fable-5:floor"),
    1000000,
  );
  assert.equal(
    getOpenRouterMaxOutputTokens("anthropic/claude-fable-5:floor"),
    128000,
  );

  assert.equal(
    getOpenRouterContextWindow("deepseek/deepseek-flash:online"),
    1000000,
  );
  assert.equal(
    getOpenRouterMaxOutputTokens("deepseek/deepseek-flash:online"),
    384000,
  );
});

test("preserves conservative non-catalog fallbacks", () => {
  assert.equal(getOpenRouterContextWindow("google/gemini-2-pro"), 200000);
  assert.equal(getOpenRouterContextWindow("mistralai/mistral-large"), 32000);
  assert.equal(getOpenRouterContextWindow("meta-llama/llama-3"), 8192);
  assert.equal(getOpenRouterContextWindow("vendor/unknown-model"), 32000);
});

test("keeps output defaults bounded for unknown models", () => {
  assert.equal(getOpenRouterMaxOutputTokens("vendor/unknown-model"), 4096);
});
