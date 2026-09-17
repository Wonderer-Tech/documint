import test from "node:test";
import assert from "node:assert/strict";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { renderLocalFileDocumentation } from "../src/services/localFileDocumentation";
import type { WorkspaceFile } from "../src/types";

const files: WorkspaceFile[] = [
  {
    path: "src/main.ts",
    language: "typescript",
    content: [
      'import { helper } from "./helper";',
      "export interface User { id: string }",
      "export function greet(name: string): string { return helper(name); }",
      "function internalOnly(): void {}",
      "// TODO: handle empty name",
    ].join("\n"),
  },
  {
    path: "src/helper.ts",
    language: "typescript",
    content: "export function helper(value: string): string { return value; }",
  },
  {
    path: "src/consumer.ts",
    language: "typescript",
    content: [
      'import { greet } from "./main";',
      'export const message = greet("DocuMint");',
    ].join("\n"),
  },
];

test("local renderer emits source-analysis facts without AI inference", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const analysis = project.files.find((file) => file.path === "src/main.ts");
  assert.ok(analysis);

  const markdown = renderLocalFileDocumentation({
    file: files[0],
    analysis,
    project,
    dependencyIndex: analyzer.buildDependencyIndex(project),
  });

  assert.match(markdown, /## `src\/main\.ts`/);
  assert.match(markdown, /static source analysis only\. No AI inference is used/);
  assert.match(markdown, /### Exported API/);
  assert.match(markdown, /`User`/);
  assert.match(markdown, /`greet`/);
  assert.match(markdown, /### Other Detected Symbols/);
  assert.match(markdown, /`internalOnly`/);
  assert.match(markdown, /`\.\/helper`/);
  assert.match(markdown, /`src\/helper\.ts`/);
  assert.match(markdown, /### Known Dependents[\s\S]*`src\/consumer\.ts`/);
  assert.match(markdown, /handle empty name/);
});

test("local renderer makes empty analyzer facts explicit instead of inventing prose", () => {
  const analyzer = new SourceAnalyzer();
  const file: WorkspaceFile = {
    path: "src/empty.ts",
    language: "typescript",
    content: "",
  };
  const project = analyzer.analyzeProject([file]);
  const analysis = project.files[0];
  const markdown = renderLocalFileDocumentation({ file, analysis, project });

  assert.match(markdown, /No exported symbols detected\./);
  assert.match(markdown, /No additional symbols detected\./);
  assert.match(markdown, /No imports detected\./);
  assert.match(markdown, /No internal dependencies detected\./);
  assert.match(markdown, /No known project dependents detected\./);
  assert.match(markdown, /No TODO, FIXME, or HACK comments detected\./);
});
