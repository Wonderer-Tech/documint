import test from "node:test";
import assert from "node:assert/strict";
import {
  renderLocalCodeMapFragments,
} from "../src/services/htmlLocalCodeMap";
import type { LocalCodeMapData } from "../src/services/localCodeMapData";

const data: LocalCodeMapData = {
  projectName: "Example",
  files: [
    {
      path: "src/extension.ts",
      module: "src",
      language: "typescript",
      lines: 12,
      description: "Extension entry point",
      descriptionSource: "readme",
      exports: [{ name: "activate", kind: "function", line: 3 }],
      uses: ["src/services/run.ts"],
      usedBy: [],
      entryPoint: true,
    },
    {
      path: "src/services/run.ts",
      module: "src/services",
      language: "typescript",
      lines: 80,
      description: "Runs the Local pipeline",
      descriptionSource: "declaration-comment",
      exports: [{ name: "run", kind: "function", line: 10 }],
      uses: [],
      usedBy: ["src/extension.ts"],
      entryPoint: false,
    },
  ],
  modules: [
    { name: "src", files: 1, lines: 12 },
    { name: "src/services", files: 1, lines: 80 },
  ],
  edges: [{ from: "src", to: "src/services", count: 1 }],
  readingPath: [
    { path: "src/extension.ts", reason: "Detected project entry point." },
    {
      path: "src/services/run.ts",
      reason: "Imported by src/extension.ts.",
    },
  ],
};

test("Local code map exposes question-first interactive surfaces without external assets", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /Big picture/);
  assert.match(fragments.markup, /How do the parts fit together\?/);
  assert.match(fragments.markup, /What's inside/);
  assert.match(fragments.markup, /Start here/);
  assert.match(fragments.markup, /Dependency reach/);
  assert.match(fragments.markup, /Look up a file/);
  assert.match(fragments.styles, /local-map-treemap/);
  assert.match(fragments.script, /src\\u002fextension|src\/extension\.ts/);
  assert.doesNotMatch(
    fragments.styles + fragments.markup + fragments.script,
    /https?:\/\//i,
  );
});

test("Local code map browser script compiles as standalone JavaScript", () => {
  const fragments = renderLocalCodeMapFragments(data);
  const source = fragments.script
    .replace(/^\s*<script>\s*/, "")
    .replace(/\s*<\/script>\s*$/, "");

  assert.doesNotThrow(() => new Function(source));
});

test("Local code map stays absent when no Local model is supplied", () => {
  assert.deepEqual(renderLocalCodeMapFragments(undefined), {
    styles: "",
    markup: "",
    script: "",
  });
});
