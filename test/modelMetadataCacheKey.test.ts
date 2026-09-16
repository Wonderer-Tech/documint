import test from "node:test";
import assert from "node:assert/strict";
import { buildModelMetadataLookupIdentity } from "../src/services/modelMetadataCacheKey";

test("metadata cache identity normalizes provider and model", () => {
  assert.deepEqual(
    buildModelMetadataLookupIdentity(" OpenAI ", " GPT-5-X ", 2.9),
    {
      provider: "openai",
      model: "gpt-5-x",
      credentialRevision: 2,
      cacheKey: "openai:2:gpt-5-x",
    },
  );
});

test("credential revision changes metadata cache identity", () => {
  const first = buildModelMetadataLookupIdentity("openrouter", "vendor/model", 0);
  const second = buildModelMetadataLookupIdentity("openrouter", "vendor/model", 1);

  assert.notEqual(first.cacheKey, second.cacheKey);
});

test("invalid credential revision falls back to zero", () => {
  assert.equal(
    buildModelMetadataLookupIdentity("anthropic", "future-model", Number.NaN)
      .cacheKey,
    "anthropic:0:future-model",
  );
});
