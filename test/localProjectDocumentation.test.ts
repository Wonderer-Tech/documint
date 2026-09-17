import test from "node:test";
import assert from "node:assert/strict";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { renderLocalProjectDocumentation } from "../src/services/localProjectDocumentation";
import type { WorkspaceFile } from "../src/types";

const files: WorkspaceFile[] = [
  {
    path: "src/index.ts",
    language: "typescript",
    content: [
      'import { helper } from "../lib/helper";',
      'import React from "react";',
      "export function start(): number { return helper(); }",
    ].join("\n"),
  },
  {
    path: "lib/helper.ts",
    language: "typescript",
    content: [
      "export function helper(): number { return 1; }",
      "// TODO: replace stub implementation",
    ].join("\n"),
  },
];

const analyzer = new SourceAnalyzer();
const project = analyzer.analyzeProject(files);

test("local project overview renders deterministic project facts", () => {
  const output = renderLocalProjectDocumentation({
    projectName: "Example Project",
    files,
    project,
  });

  assert.match(output, /^# Example Project — Local Documentation/m);
  assert.match(output, /No AI inference, model, API key, or external provider is used/);
  assert.match(output, /\*\*Files:\*\* 2/);
  assert.match(output, /\*\*Lines:\*\* 5/);
  assert.match(output, /\*\*Internal dependency links:\*\* 1/);
  assert.match(output, /\*\*External dependencies:\*\* 1/);
  assert.match(output, /\*\*TODO\/FIXME\/HACK comments:\*\* 1/);
  assert.match(output, /`react`/);
});

test("local project overview includes module facts and a stable source tree", () => {
  const output = renderLocalProjectDocumentation({
    projectName: "Example Project",
    files,
    project,
  });

  assert.match(output, /## Module Summary/);
  assert.match(output, /\| `lib` \| 1 \|/);
  assert.match(output, /\| `src` \| 1 \|/);
  assert.match(output, /## Structurally Connected Files/);
  assert.match(output, /`src\/index\.ts`/);
  assert.match(output, /`lib\/helper\.ts`/);
  assert.match(output, /Example Project\//);
  assert.match(output, /├── lib\//);
  assert.match(output, /└── src\//);
  assert.match(output, /helper\.ts/);
  assert.match(output, /index\.ts/);
});
