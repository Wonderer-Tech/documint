import test from "node:test";
import assert from "node:assert/strict";
import type { FileAnalysis } from "../src/analyzer/sourceAnalyzer";
import { normalizeProviderModel } from "../src/providers/providerModelGuard";
import { DocumentationValidator } from "../src/services/documentationValidator";

test("provider model guard replaces clearly foreign stale models", () => {
  assert.equal(
    normalizeProviderModel("anthropic", "gpt-5.4-nano", "claude-default"),
    "claude-default",
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

test("provider model guard preserves provider-native model choices", () => {
  assert.equal(
    normalizeProviderModel(
      "anthropic",
      "claude-3-5-sonnet-20241022",
      "claude-default",
    ),
    "claude-3-5-sonnet-20241022",
  );
  assert.equal(
    normalizeProviderModel("deepseek", "deepseek-flash", "fallback"),
    "deepseek-flash",
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
