import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeDocumentationDepth } from "../src/services/generationDepth";
import { buildGenerationCacheIdentity } from "../src/services/generationCacheIdentity";

test("documentation depth accepts only canonical supported values", () => {
  assert.equal(normalizeDocumentationDepth(" simple "), "simple");
  assert.equal(normalizeDocumentationDepth("BASIC"), "basic");
  assert.equal(normalizeDocumentationDepth("standard"), "standard");
  assert.equal(normalizeDocumentationDepth("comprehensive"), "comprehensive");
});

test("invalid or blank run depth falls back to configured depth then standard", () => {
  assert.equal(normalizeDocumentationDepth("   ", "comprehensive"), "comprehensive");
  assert.equal(normalizeDocumentationDepth("unsupported", " basic "), "basic");
  assert.equal(normalizeDocumentationDepth("unsupported", "invalid"), "standard");
  assert.equal(normalizeDocumentationDepth(undefined, undefined), "standard");
});

test("generation cache identity uses canonical documentation depth", () => {
  const settings = {
    model: "gpt-5.4-nano",
    documentationDepth: "comprehensive",
    maxTokens: 4000,
    temperature: 0.3,
  };

  assert.equal(
    buildGenerationCacheIdentity(settings, {
      providerName: "openai",
      depth: "   ",
    }).depth,
    "comprehensive",
  );
  assert.equal(
    buildGenerationCacheIdentity(settings, {
      providerName: "openai",
      depth: "not-a-depth",
    }).depth,
    "comprehensive",
  );
});

test("AI generation passes one normalized depth to cache and runtime", () => {
  const source = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );

  assert.match(source, /const normalizedDepth = normalizeDocumentationDepth\(/);
  assert.match(source, /depth:\s*normalizedDepth,\s*contextWindow:/);
  assert.match(source, /depth:\s*normalizedDepth,\s*outputFormat:/);
  assert.doesNotMatch(source, /depth:\s*payload\.depth as/);
});
