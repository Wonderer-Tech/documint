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

test("local architecture renderer derives module and file edges from source imports", () => {
  const output = renderLocalArchitectureDocumentation({
    projectName: "Example Project",
    files,
    project,
  });

  assert.match(output, /no AI interpretation is used/i);
  assert.match(output, /\| `src` \| `lib` \| 1 \|/);
  assert.match(output, /\| `src\/index\.ts` \| `lib\/helper\.ts` \| `\.\.\/lib\/helper` \|/);
});

test("local architecture renderer emits consistent Mermaid and D2 diagrams", () => {
  const output = renderLocalArchitectureDocumentation({
    projectName: "Example Project",
    files,
    project,
  });

  assert.match(output, /### Module Architecture — Mermaid/);
  assert.match(output, /m0\["lib \(1 file\)"\]/);
  assert.match(output, /m1\["src \(1 file\)"\]/);
  assert.match(output, /m1 -->\|"1 link"\| m0/);

  assert.match(output, /### File Dependency Graph — Mermaid/);
  assert.match(output, /f0\["lib\/helper\.ts"\]/);
  assert.match(output, /f1\["src\/index\.ts"\]/);
  assert.match(output, /f1 --> f0/);

  assert.match(output, /### Module Architecture — D2/);
  assert.match(output, /m1 -> m0: "1 link"/);
});
