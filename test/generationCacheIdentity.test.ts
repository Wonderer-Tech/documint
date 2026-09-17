import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildGenerationCacheIdentity,
  GENERATION_CACHE_POLICY_VERSION,
  GENERATION_PROMPT_SCHEMA_VERSION,
} from "../src/services/generationCacheIdentity";

const baseSettings = {
  model: "gpt-5.4-nano",
  documentationDepth: "standard",
  maxTokens: 4000,
  temperature: 0.3,
  customApiEndpoint: "https://example.invalid/v1/chat/completions",
};

test("generation cache identity tracks content-affecting settings", () => {
  const base = buildGenerationCacheIdentity(baseSettings, {
    providerName: "openai",
  });
  const changed = buildGenerationCacheIdentity(
    { ...baseSettings, maxTokens: 8000, temperature: 0.1 },
    { providerName: "openai", contextWindow: 64000 },
  );

  assert.notDeepEqual(base, changed);
  assert.equal(changed.maxTokens, 8000);
  assert.equal(changed.temperature, 0.1);
  assert.equal(changed.contextWindow, 64000);
});

test("generation cache identity includes prompt schema version", () => {
  const identity = buildGenerationCacheIdentity(baseSettings, {
    providerName: "openai",
  });

  assert.equal(identity.version, GENERATION_CACHE_POLICY_VERSION);
  assert.equal(identity.promptSchemaVersion, GENERATION_PROMPT_SCHEMA_VERSION);
  assert.match(identity.promptSchemaVersion, /^documint-prompts-/);
});

test("generator per-entry cache binds to the canonical prompt schema", () => {
  const wrapper = readFileSync(
    join(process.cwd(), "src/services/docGenerator.ts"),
    "utf8",
  );
  const base = readFileSync(
    join(process.cwd(), "src/services/docGeneratorBase.ts"),
    "utf8",
  );

  assert.match(wrapper, /GENERATION_PROMPT_SCHEMA_VERSION/);
  assert.match(
    wrapper,
    /runtimeGenerator\.PROMPT_VERSION\s*=\s*GENERATION_PROMPT_SCHEMA_VERSION/,
  );
  assert.match(base, /promptVersion:\s*DocGeneratorService\.PROMPT_VERSION/);
  assert.doesNotMatch(wrapper, /lean-prompts-\d{4}-\d{2}-\d{2}/);
});

test("release cache epoch stays on v8 until generation semantics change again", () => {
  assert.equal(GENERATION_CACHE_POLICY_VERSION, "generation-cache-policy-v8");
});

test("non-custom providers ignore custom endpoint in cache identity", () => {
  const first = buildGenerationCacheIdentity(
    { ...baseSettings, customApiEndpoint: "https://one.invalid" },
    { providerName: "openai" },
  );
  const second = buildGenerationCacheIdentity(
    { ...baseSettings, customApiEndpoint: "https://two.invalid" },
    { providerName: "openai" },
  );

  assert.deepEqual(first, second);
  assert.equal(first.customApiEndpoint, "");
});

test("custom provider endpoint participates in cache identity", () => {
  const first = buildGenerationCacheIdentity(baseSettings, {
    providerName: "custom",
    customApiEndpoint: "http://localhost:11434/v1/chat/completions",
  });
  const second = buildGenerationCacheIdentity(baseSettings, {
    providerName: "custom",
    customApiEndpoint: "http://localhost:1234/v1/chat/completions",
  });

  assert.notDeepEqual(first, second);
});

test("cache identity normalizes invalid numeric settings", () => {
  const identity = buildGenerationCacheIdentity(
    {
      model: "model-x",
      documentationDepth: "standard",
      maxTokens: Number.NaN,
      temperature: Number.NaN,
    },
    { providerName: " OPENAI ", contextWindow: -5 },
  );

  assert.equal(identity.provider, "openai");
  assert.equal(identity.maxTokens, 4000);
  assert.equal(identity.temperature, 0.3);
  assert.equal(identity.contextWindow, null);
});
