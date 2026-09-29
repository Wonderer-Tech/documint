import test from "node:test";
import assert from "node:assert/strict";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationModel } from "../src/services/localDocumentationModel";
import type { WorkspaceFile } from "../src/types";

const files: WorkspaceFile[] = [
  {
    path: "src/providers/factory.ts",
    language: "typescript",
    content: [
      "/** Creates provider instances from normalized provider names. */",
      "export class ProviderFactory {}",
    ].join("\n"),
  },
  {
    path: "src/services/run.ts",
    language: "typescript",
    content: [
      'import { ProviderFactory } from "../providers/factory";',
      "export function run() {",
      "  const temporary = new ProviderFactory();",
      "  return temporary;",
      "}",
    ].join("\n"),
  },
  {
    path: "src/extension.ts",
    language: "typescript",
    content: 'import { run } from "./services/run";\nexport { run };',
  },
];

test("canonical Local model centralizes modules, dependencies and trusted descriptions", () => {
  const project = new SourceAnalyzer().analyzeProject(files);
  const model = buildLocalDocumentationModel(
    "Example",
    files,
    project,
    {
      readme: [
        "```text",
        "src/",
        "|-- providers/",
        "|   `-- factory.ts # README provider description",
        "|-- services/",
        "|   `-- run.ts     # Runs documentation",
        "`-- extension.ts   # Activation entry point",
        "```",
      ].join("\n"),
    },
  );

  assert.deepEqual(
    model.modules.map((module) => module.name).sort(),
    ["src", "src/providers", "src/services"],
  );

  const factory = model.files.find(
    (file) => file.path === "src/providers/factory.ts",
  );
  const run = model.files.find((file) => file.path === "src/services/run.ts");
  assert.ok(factory);
  assert.ok(run);

  assert.deepEqual(factory.description, {
    text: "Creates provider instances from normalized provider names.",
    source: "declaration-comment",
    line: 1,
  });
  assert.equal(run.description?.source, "readme");
  assert.equal(run.description?.text, "Runs documentation");

  assert.deepEqual(run.uses, ["src/providers/factory.ts"]);
  assert.deepEqual(factory.usedBy, ["src/services/run.ts"]);
  assert.equal(
    run.symbols.some((symbol) => symbol.name === "temporary"),
    false,
    "function-local variables must not leak into the canonical model",
  );
});

test("canonical module edges aggregate resolved cross-module imports", () => {
  const project = new SourceAnalyzer().analyzeProject(files);
  const model = buildLocalDocumentationModel("Example", files, project);

  assert.deepEqual(
    model.moduleEdges.map((edge) => [edge.from, edge.to, edge.count]),
    [
      ["src", "src/services", 1],
      ["src/services", "src/providers", 1],
    ],
  );
});
