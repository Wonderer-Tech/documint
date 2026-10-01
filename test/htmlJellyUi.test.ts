import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationDocument } from "../src/services/localDocumentationDocument";

test("HTML template carries the soft Jelly UI shell and accessibility states", () => {
  const templateSource = readFileSync(
    join(process.cwd(), "src/services/htmlTemplate.ts"),
    "utf8",
  );
  const styleSource = readFileSync(
    join(process.cwd(), "src/services/htmlBaseStyles.ts"),
    "utf8",
  );

  assert.match(styleSource, /DOCUMINT JELLY UI/);
  assert.match(templateSource, /const bodyClassName = options\.localCodeMap/);
  assert.match(templateSource, /documint-jelly-ui documint-local-report/);
  assert.match(templateSource, /<body class="\$\{bodyClassName\}">/);
  assert.match(styleSource, /--jelly-surface:/);
  assert.match(styleSource, /backdrop-filter: blur\(18px\)/);
  assert.match(styleSource, /\.documint-jelly-ui \.topbar/);
  assert.match(styleSource, /Professional soft sidebar/);
  assert.match(
    styleSource,
    /\.documint-jelly-ui \.sidebar \{[^}]*left: 0;[^}]*border-right: 1px solid var\(--jelly-border\);[^}]*border-radius: 0;/,
  );
  assert.doesNotMatch(
    styleSource,
    /\.documint-jelly-ui \.sidebar \{[^}]*border-radius: 20px;/,
  );
  assert.match(styleSource, /\.documint-jelly-ui \.smart-toc-group\[open\]/);
  assert.match(styleSource, /inset 3px 0 0 var\(--accent\)/);
  assert.match(styleSource, /\.documint-jelly-ui \.main table/);
  assert.match(styleSource, /:focus-visible/);
  assert.match(styleSource, /prefers-reduced-motion: reduce/);
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

  assert.match(
    document.html,
    /class="documint-jelly-ui documint-local-report"/,
  );
  assert.match(document.html, /Jelly Example — Documentation/);
  assert.doesNotMatch(document.html, /Jelly Example — Local Documentation/);
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
    join(process.cwd(), "src/services/htmlBaseStyles.ts"),
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
