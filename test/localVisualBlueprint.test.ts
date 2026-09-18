import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import {
  buildLocalArchitectureVisualBlueprint,
  renderLocalArchitectureVisualSections,
} from "../src/services/localVisualBlueprint";
import type { WorkspaceFile } from "../src/types";

const files: WorkspaceFile[] = [
  {
    path: "apps/api/src/main.ts",
    language: "typescript",
    content: [
      'import { shared } from "../../../packages/shared/src/index";',
      "export const api = shared;",
    ].join("\n"),
  },
  {
    path: "apps/web/src/page.ts",
    language: "typescript",
    content: [
      'import { shared } from "../../../packages/shared/src/index";',
      "export const page = shared;",
    ].join("\n"),
  },
  {
    path: "packages/shared/src/index.ts",
    language: "typescript",
    content: "export const shared = 1;",
  },
];

const project = new SourceAnalyzer().analyzeProject(files);

test("Local visual blueprint is deterministic and source-factual", () => {
  const blueprint = buildLocalArchitectureVisualBlueprint({
    projectName: "Example",
    files,
    project,
  });

  assert.equal(blueprint.source, "local");
  assert.ok(blueprint.modules.length >= 2);
  assert.ok(blueprint.modules.every((module) => module.role === "Module"));
  assert.ok(
    blueprint.modules.some((module) => module.name === "apps/api"),
    "expected structural apps/api cluster",
  );
  assert.ok(
    blueprint.modules.some((module) => module.name === "packages/shared"),
    "expected structural packages/shared cluster",
  );
  assert.ok(blueprint.dependencyGraph.nodes.length > 0);
  assert.ok(
    blueprint.dependencyGraph.nodes.every((node) => node.path && node.language),
  );
});

test("Local visual sections emit every HTML enhancer payload", () => {
  const output = renderLocalArchitectureVisualSections({
    projectName: "Example",
    files,
    project,
  });

  assert.match(output, /```architecture-blueprint/);
  assert.match(output, /```excalidraw-blueprint/);
  assert.match(output, /```dependency-graph/);
  assert.match(output, /"source": "local"/);
});

test("HTML architecture enhancer labels Local payloads without AI role semantics", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/htmlTemplate.ts"),
    "utf8",
  );

  assert.match(source, /data\.source === 'local'/);
  assert.match(source, /Local Architecture Blueprint/);
  assert.match(source, /Connected Modules/);
  assert.match(source, /source-derived/);
});
