import test from "node:test";
import assert from "node:assert/strict";
import { getDeepSeekModelCapabilities } from "../src/providers/deepSeekCapabilities";
import { getOpenAIModelCapabilities } from "../src/providers/openAICapabilities";
import {
  estimateModelContextWindow,
  getKnownModelContext,
} from "../src/services/modelContextCatalog";

test("model context catalog separates current and legacy exact IDs", () => {
  assert.deepEqual(getKnownModelContext("claude-sonnet-5"), {
    contextWindow: 1000000,
    lifecycle: "current",
  });
  assert.deepEqual(getKnownModelContext("claude-3-5-sonnet-20241022"), {
    contextWindow: 200000,
    lifecycle: "legacy",
  });
});

test("GPT-4.1 family uses one canonical 1M capability source", () => {
  for (const model of ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"]) {
    assert.deepEqual(getOpenAIModelCapabilities(model), {
      contextWindow: 1047576,
      maxOutputTokens: 32768,
      lifecycle: "current",
    });
    assert.deepEqual(getKnownModelContext(model), {
      contextWindow: 1047576,
      lifecycle: "current",
    });
    assert.equal(estimateModelContextWindow(model), 1047576);
  }

  assert.equal(estimateModelContextWindow("gpt-4.1-preview"), 1047576);
  assert.equal(estimateModelContextWindow("gpt-4-1-preview"), 1047576);
});

test("GPT-5 and GPT-5.4 capability limits match provider budgeting", () => {
  for (const model of ["gpt-5", "gpt-5-mini", "gpt-5-nano"]) {
    assert.deepEqual(getOpenAIModelCapabilities(model), {
      contextWindow: 400000,
      maxOutputTokens: 128000,
      lifecycle: "current",
    });
    assert.equal(estimateModelContextWindow(model), 400000);
  }

  assert.deepEqual(getOpenAIModelCapabilities("gpt-5.4"), {
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  });
  for (const model of ["gpt-5.4-mini", "gpt-5.4-nano"]) {
    assert.deepEqual(getOpenAIModelCapabilities(model), {
      contextWindow: 400000,
      maxOutputTokens: 128000,
      lifecycle: "current",
    });
  }
});

test("DeepSeek current and compatibility IDs use one capability source", () => {
  for (const model of ["deepseek-flash", "deepseek-v4-pro"]) {
    assert.deepEqual(getDeepSeekModelCapabilities(model), {
      contextWindow: 1000000,
      maxOutputTokens: 384000,
      lifecycle: "current",
    });
    assert.deepEqual(getKnownModelContext(model), {
      contextWindow: 1000000,
      lifecycle: "current",
    });
    assert.equal(estimateModelContextWindow(model), 1000000);
  }

  for (const model of ["deepseek-v4-flash", "deepseek-v4-flash-vision-exp"]) {
    assert.deepEqual(getDeepSeekModelCapabilities(model), {
      contextWindow: 1000000,
      maxOutputTokens: 384000,
      lifecycle: "legacy",
    });
    assert.deepEqual(getKnownModelContext(model), {
      contextWindow: 1000000,
      lifecycle: "legacy",
    });
  }
});

test("model context catalog keeps inference conservative", () => {
  assert.equal(estimateModelContextWindow("deepseek-flash-preview"), 1000000);
  assert.equal(estimateModelContextWindow("claude-sonnet-5-preview"), 1000000);
  assert.equal(estimateModelContextWindow("unknown-provider-model"), 8192);
});
