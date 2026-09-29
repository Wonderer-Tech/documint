import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationDocument } from "../src/services/localDocumentationDocument";

test("HTML template carries the soft Jelly UI shell and accessibility states", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/htmlTemplate.ts"),
    "utf8",
  );

  assert.match(source, /DOCUMINT JELLY UI/);
  assert.match(source, /<body class="documint-jelly-ui">/);
  assert.match(source, /--jelly-surface:/);
  assert.match(source, /backdrop-filter: blur\(18px\)/);
  assert.match(source, /\.documint-jelly-ui \.topbar/);
  assert.match(source, /Professional soft sidebar/);
  assert.match(
    source,
    /\.documint-jelly-ui \.sidebar \{[^}]*left: 0;[^}]*border-right: 1px solid var\(--jelly-border\);[^}]*border-radius: 0;/,
  );
  assert.doesNotMatch(
    source,
    /\.documint-jelly-ui \.sidebar \{[^}]*border-radius: 20px;/,
  );
  assert.match(source, /\.documint-jelly-ui \.smart-toc-group\[open\]/);
  assert.match(source, /inset 3px 0 0 var\(--accent\)/);
  assert.match(source, /\.documint-jelly-ui \.main table/);
  assert.match(source, /:focus-visible/);
  assert.match(source, /prefers-reduced-motion: reduce/);
});

test("Local generated HTML receives the Jelly UI and question-first code map", () => {
  const files = [
    {
      path: "src/main.ts",
      language: "typescript",
      content: "export const answer = 42;\n",
    },
  ];
  const project = new SourceAnalyzer().analyzeProject(files);
  const document = buildLocalDocumentationDocument(
    "Jelly Example",
    files,
    project,
  );

  assert.match(document.html, /class="documint-jelly-ui"/);
  assert.match(document.html, /Jelly Example — Local Documentation/);
  assert.match(document.html, /src\/main\.ts/);
  assert.match(document.html, /data-documint-local-code-map/);
  assert.match(document.html, /Find your way through the code/);
  assert.doesNotMatch(
    document.html,
    /<code class="language-architecture-blueprint"/,
  );
  assert.doesNotMatch(
    document.html,
    /<code class="language-excalidraw-blueprint"/,
  );
});

test("soft HTML keeps the module scale pie chart visually prominent", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/htmlTemplate.ts"),
    "utf8",
  );

  assert.match(source, /Keep the 1\.0\.4 module-scale pie chart prominent/);
  assert.match(
    source,
    /\.documint-jelly-ui \.architecture-pie-panel \{[^}]*display: grid;[^}]*min-height: 250px;[^}]*border-radius: 16px;/,
  );
  assert.match(source, /\.architecture-pie-svg/);
  assert.match(source, /\.architecture-pie-segment/);
  assert.match(source, /\.architecture-pie-legend/);
});
