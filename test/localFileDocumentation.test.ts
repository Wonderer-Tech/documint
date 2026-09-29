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
  assert.doesNotMatch(markdown, /static source analysis only\. No AI inference is used/);
  assert.match(markdown, /### Exported API/);
  assert.match(markdown, /`User`/);
  assert.match(markdown, /`greet`/);
  assert.match(markdown, /### Internal API/);
  assert.match(markdown, /`internalOnly`/);
  assert.match(markdown, /### Imports/);
  assert.match(markdown, /`\.\/helper`/);
  assert.match(markdown, /\*\*Uses:\*\*[\s\S]*`src\/helper\.ts`/);
  assert.match(markdown, /\*\*Used by:\*\*[\s\S]*`src\/consumer\.ts`/);
  assert.match(markdown, /handle empty name/);
});

test("local renderer omits empty fact sections instead of repeating placeholders", () => {
  const analyzer = new SourceAnalyzer();
  const file: WorkspaceFile = {
    path: "src/empty.ts",
    language: "typescript",
    content: "",
  };
  const project = analyzer.analyzeProject([file]);
  const analysis = project.files[0];
  const markdown = renderLocalFileDocumentation({ file, analysis, project });

  assert.match(markdown, /No module-level description found/);
  assert.doesNotMatch(markdown, /### Exported API/);
  assert.doesNotMatch(markdown, /### Internal API/);
  assert.doesNotMatch(markdown, /### Imports/);
  assert.doesNotMatch(markdown, /\*\*Uses:\*\*/);
  assert.doesNotMatch(markdown, /\*\*Used by:\*\*/);
  assert.doesNotMatch(markdown, /### TODO \/ FIXME \/ HACK/);
  assert.doesNotMatch(markdown, /No .* detected\./);
});
