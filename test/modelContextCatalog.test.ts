import test from "node:test";
import assert from "node:assert/strict";
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

test("GPT-4.1 family keeps the provider runtime context window", () => {
  for (const model of ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"]) {
    assert.deepEqual(getKnownModelContext(model), {
      contextWindow: 1000000,
      lifecycle: "current",
    });
    assert.equal(estimateModelContextWindow(model), 1000000);
  }

  assert.equal(estimateModelContextWindow("gpt-4.1-preview"), 1000000);
  assert.equal(estimateModelContextWindow("gpt-4-1-preview"), 1000000);
});

test("model context catalog keeps inference conservative", () => {
  assert.equal(estimateModelContextWindow("deepseek-flash-preview"), 1000000);
  assert.equal(estimateModelContextWindow("claude-sonnet-5-preview"), 1000000);
  assert.equal(estimateModelContextWindow("unknown-provider-model"), 8192);
});
