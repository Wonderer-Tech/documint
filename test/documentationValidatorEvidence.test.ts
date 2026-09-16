import test from "node:test";
import assert from "node:assert/strict";
import type { FileAnalysis } from "../src/analyzer/sourceAnalyzer";
import { DocumentationValidator } from "../src/services/documentationValidator";

const analysis: FileAnalysis = {
  path: "src/example.ts",
  language: "typescript",
  imports: [
    {
      source: "axios",
      line: 1,
      symbols: ["AxiosError"],
    },
    {
      source: "./local",
      line: 2,
      symbols: ["localFn"],
      resolvedPath: "src/local.ts",
    },
  ],
  symbols: [],
  todos: [],
};

test("dependency validator accepts detected imports and imported symbols", () => {
  const result = new DocumentationValidator().validateFileDocumentation(
    [
      "## Dependencies",
      "- `axios` provides HTTP calls.",
      "- `AxiosError` is imported from axios.",
      "- `./local` is an internal dependency.",
      "- `local.ts` is the resolved local module.",
    ].join("\n"),
    analysis,
  );

  assert.deepEqual(result.unexpectedDependencyClaims, []);
});

test("dependency validator flags concrete packages not detected in source", () => {
  const result = new DocumentationValidator().validateFileDocumentation(
    [
      "## Dependencies and Data Flow",
      "- `axios` is detected.",
      "- `invented-package` is not imported.",
    ].join("\n"),
    analysis,
  );

  assert.deepEqual(result.unexpectedDependencyClaims, ["invented-package"]);
  assert.ok(result.warnings.some((warning) => warning.includes("not detected in source")));
});

test("dependency validator ignores non-identifier code spans", () => {
  const result = new DocumentationValidator().validateFileDocumentation(
    [
      "## Dependencies",
      "Calls `client.request()` after validation.",
      "Uses `new URL(value)` for parsing.",
    ].join("\n"),
    analysis,
  );

  assert.deepEqual(result.unexpectedDependencyClaims, []);
});
