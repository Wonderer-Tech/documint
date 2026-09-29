import test from "node:test";
import assert from "node:assert/strict";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { renderLocalArchitectureDocumentation } from "../src/services/localArchitectureDocumentation";
import type { WorkspaceFile } from "../src/types";

const files: WorkspaceFile[] = [
  {
    path: "src/index.ts",
    language: "typescript",
    content: [
      'import { helper } from "../lib/helper";',
      "export function start(): number { return helper(); }",
    ].join("\n"),
  },
  {
    path: "lib/helper.ts",
    language: "typescript",
    content: "export function helper(): number { return 1; }",
  },
];

const analyzer = new SourceAnalyzer();
const project = analyzer.analyzeProject(files);

test("local architecture renderer derives cross-module relationships from resolved imports", () => {
  const output = renderLocalArchitectureDocumentation({
    projectName: "Example Project",
    files,
    project,
  });

  assert.match(output, /no AI interpretation is used/i);
  assert.match(output, /### Module Relationships/);
  assert.match(output, /\| `src` \| `lib` \| 1 \|/);
});

test("local Markdown architecture keeps one compact module Mermaid graph", () => {
  const output = renderLocalArchitectureDocumentation(
    {
      projectName: "Example Project",
      files,
      project,
    },
    { surface: "markdown" },
  );

  assert.match(output, /### Module Architecture/);
  assert.match(output, /```mermaid/);
  assert.match(output, /m0\["lib \(1 file\)"\]/);
  assert.match(output, /m1\["src \(1 file\)"\]/);
  assert.match(output, /m1 -->\|"1 link"\| m0/);

  assert.doesNotMatch(output, /architecture-blueprint/);
  assert.doesNotMatch(output, /excalidraw-blueprint/);
  assert.doesNotMatch(output, /dependency-graph/);
  assert.doesNotMatch(output, /File Dependency Graph/);
  assert.doesNotMatch(output, /Module Architecture — D2/);
});

test("summary architecture surface contains facts only and no diagram payload", () => {
  const output = renderLocalArchitectureDocumentation(
    {
      projectName: "Example Project",
      files,
      project,
    },
    { surface: "summary" },
  );

  assert.match(output, /### Module Relationships/);
  assert.match(output, /\| `src` \| `lib` \| 1 \|/);
  assert.doesNotMatch(output, /```mermaid/);
  assert.doesNotMatch(output, /architecture-blueprint/);
  assert.doesNotMatch(output, /excalidraw-blueprint/);
  assert.doesNotMatch(output, /dependency-graph/);
});
