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
  gettingStarted: {
    extensionEntry: "./dist/extension.js",
    scripts: [
      {
        name: "compile",
        run: "npm run compile",
        command: "tsc --noEmit",
      },
      {
        name: "test",
        run: "npm run test",
        command: "node --test",
      },
    ],
  },
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


test("Local code map data stays source-factual and relation-driven", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /file\.usedBy\.length/);
  assert.match(fragments.script, /file\.description/);
  assert.match(fragments.script, /file\.exports/);
  assert.match(fragments.script, /setModuleFilter/);
  assert.match(fragments.script, /renderTreemap/);
  assert.match(fragments.script, /renderScatter/);
  assert.doesNotMatch(fragments.script, /good to split|will break|only place that calls/i);
});


test("Local code map connects module focus and file-card navigation", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.styles, /local-map-module-canvas\.focused/);
  assert.match(fragments.script, /focusModule/);
  assert.match(fragments.script, /data-from/);
  assert.match(fragments.script, /data-to/);
  assert.match(fragments.script, /openFileAndReveal/);
  assert.match(fragments.script, /revealFullDocumentation/);
  assert.match(fragments.script, /Open full file documentation/);
  assert.match(fragments.script, /data-documint-file-path/);
});


test("Local code map surfaces detected run commands and owns Ctrl/Cmd+K file search", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /localMapRun/);
  assert.match(fragments.markup, /Ctrl\/⌘ K/);
  assert.match(fragments.script, /npm run compile/);
  assert.match(fragments.script, /npm run test/);
  assert.match(fragments.script, /event\.stopImmediatePropagation\(\)/);
  assert.match(fragments.script, /event\.key\.toLowerCase\(\) === 'k'/);
  assert.match(fragments.script, /input\.focus\(\)/);
});
