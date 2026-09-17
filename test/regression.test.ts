import test from "node:test";
import assert from "node:assert/strict";
import type { FileAnalysis } from "../src/analyzer/sourceAnalyzer";
import { normalizeProviderModel } from "../src/providers/providerModelGuard";
import { DocumentationValidator } from "../src/services/documentationValidator";

test("provider model guard replaces clearly foreign stale models", () => {
  assert.equal(
    normalizeProviderModel("anthropic", "gpt-5.4-nano", "claude-sonnet-5"),
    "claude-sonnet-5",
  );
  assert.equal(
    normalizeProviderModel("deepseek", "gpt-4o", "deepseek-flash"),
    "deepseek-flash",
  );
  assert.equal(
    normalizeProviderModel("openai", "deepseek-flash", "gpt-5.4-nano"),
    "gpt-5.4-nano",
  );
});

test("provider model guard treats all OpenAI o-series as foreign outside OpenAI", () => {
  for (const model of ["o1", "o3-mini", "o4-mini", "o4-mini-deep-research"]) {
    assert.equal(
      normalizeProviderModel("anthropic", model, "claude-sonnet-5"),
      "claude-sonnet-5",
      model,
    );
    assert.equal(
      normalizeProviderModel("openrouter", model, "openai/gpt-4o"),
      "openai/gpt-4o",
      model,
    );
  }

  assert.equal(
    normalizeProviderModel("openai", "o4-mini", "gpt-5.4-nano"),
    "o4-mini",
  );
});

test("provider model guard replaces retired DeepSeek aliases", () => {
  assert.equal(
    normalizeProviderModel("deepseek", "deepseek-chat", "deepseek-flash"),
    "deepseek-flash",
  );
  assert.equal(
    normalizeProviderModel("deepseek", "deepseek-reasoner", "deepseek-flash"),
    "deepseek-flash",
  );
});

test("provider model guard replaces retired OpenAI model ids", () => {
  for (const model of [
    "gpt-3.5-turbo-0301",
    "gpt-3.5-turbo-0613",
    "gpt-3.5-turbo-16k-0613",
    "gpt-4-0314",
    "gpt-4-0125-preview",
    "gpt-4-turbo-preview",
    "gpt-4-turbo-preview-completions",
    "gpt-4.5-preview",
    "gpt-4-32k",
    "gpt-4-32k-0314",
    "gpt-4-32k-0613",
    "gpt-4-vision-preview",
    "gpt-4-1106-vision-preview",
  ]) {
    assert.equal(
      normalizeProviderModel("openai", model, "gpt-5.4-nano"),
      "gpt-5.4-nano",
      model,
    );
  }
});

test("provider model guard replaces retired Anthropic model ids", () => {
  for (const model of [
    "claude-opus-4-1-20250805",
    "claude-opus-4-20250514",
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
    "claude-2.1",
    "claude-2.0",
  ]) {
    assert.equal(
      normalizeProviderModel("anthropic", model, "claude-sonnet-5"),
      "claude-sonnet-5",
      model,
    );
  }
});

test("provider model guard preserves provider-native model choices", () => {
  assert.equal(
    normalizeProviderModel(
      "anthropic",
      "claude-sonnet-5",
      "claude-default",
    ),
    "claude-sonnet-5",
  );
  assert.equal(
    normalizeProviderModel("anthropic", "claude-opus-4-8", "claude-default"),
    "claude-opus-4-8",
  );
  assert.equal(
    normalizeProviderModel("openai", "gpt-4-0613", "gpt-5.4-nano"),
    "gpt-4-0613",
  );
  assert.equal(
    normalizeProviderModel("deepseek", "deepseek-flash", "fallback"),
    "deepseek-flash",
  );
  assert.equal(
    normalizeProviderModel("deepseek", "deepseek-v4-pro", "fallback"),
    "deepseek-v4-pro",
  );
  assert.equal(
    normalizeProviderModel("openrouter", "anthropic/claude-sonnet", "fallback"),
    "anthropic/claude-sonnet",
  );
});

const analysis: FileAnalysis = {
  path: "src/example.ts",
  language: "typescript",
  imports: [],
  todos: [],
  symbols: [
    {
      name: "realFn",
      kind: "function",
      line: 1,
      exported: true,
      signature: "realFn(value: string): string",
    },
  ],
};

test("validator flags invented API reference headings", () => {
  const validator = new DocumentationValidator();
  const result = validator.validateFileDocumentation(
    [
      "## API Reference",
      "### `realFn(value: string): string`",
      "Documents the real function.",
      "### `inventedFn()`",
      "This symbol does not exist.",
    ].join("\n"),
    analysis,
  );

  assert.deepEqual(result.missingExportedSymbols, []);
  assert.deepEqual(result.unexpectedApiSymbols, ["inventedFn"]);
  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("symbols not detected in source"),
    ),
  );
});

test("validator ignores symbol-like prose outside API Reference", () => {
  const validator = new DocumentationValidator();
  const result = validator.validateFileDocumentation(
    [
      "## Overview",
      "The module exports realFn.",
      "### inventedFn()",
      "This is ordinary explanatory prose outside the API reference.",
    ].join("\n"),
    analysis,
  );

  assert.deepEqual(result.unexpectedApiSymbols, []);
  assert.deepEqual(result.missingExportedSymbols, []);
});
