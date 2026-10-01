import test from "node:test";
import assert from "node:assert/strict";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { extractLocalFailureFacts } from "../src/services/localFailureFacts";
import type { WorkspaceFile } from "../src/types";

function file(path: string, language: string, content: string): WorkspaceFile {
  return { path, language, content };
}

test("failure facts detect static throws, error reports and recovery-related symbols", () => {
  const files: WorkspaceFile[] = [
    file(
      "src/run.ts",
      "typescript",
      [
        "export function retryRequest() {",
        '  throw new Error("Provider unavailable");',
        "}",
        "export function fallbackToLocal() {",
        "  vscode.window.showErrorMessage('Using local fallback');",
        "}",
      ].join("\n"),
    ),
  ];
  const project = new SourceAnalyzer().analyzeProject(files);
  const facts = extractLocalFailureFacts(files, project);

  assert.ok(facts);
  assert.deepEqual(
    facts?.failures.map((item) => ({
      kind: item.kind,
      line: item.line,
      message: item.message,
    })),
    [
      { kind: "throw", line: 2, message: "Provider unavailable" },
      { kind: "error-report", line: 5, message: "Using local fallback" },
    ],
  );
  assert.deepEqual(
    facts?.recoveryHelpers.map((item) => item.name),
    ["fallbackToLocal", "retryRequest"],
  );
});

test("failure facts keep static multiline literals but skip interpolated templates", () => {
  const files: WorkspaceFile[] = [
    file(
      "src/errors.ts",
      "typescript",
      [
        "export function fail(value: string) {",
        "  throw new Error(",
        '    "Static multiline failure",',
        "  );",
        "}",
        "export function dynamic(value: string) {",
        "  throw new Error(`Dynamic ${value}`);",
        "}",
      ].join("\n"),
    ),
  ];
  const project = new SourceAnalyzer().analyzeProject(files);
  const facts = extractLocalFailureFacts(files, project);

  assert.ok(facts);
  assert.deepEqual(
    facts?.failures.map((item) => item.message),
    ["Static multiline failure"],
  );
});

test("failure facts ignore comment-only examples and unrelated symbols", () => {
  const files: WorkspaceFile[] = [
    file(
      "src/plain.ts",
      "typescript",
      [
        '// throw new Error("Example only");',
        "// function retryLater() {}",
        "export function run() { return 1; }",
      ].join("\n"),
    ),
  ];
  const project = new SourceAnalyzer().analyzeProject(files);

  assert.equal(extractLocalFailureFacts(files, project), undefined);
});
