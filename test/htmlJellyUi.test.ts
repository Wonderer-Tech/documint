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
  assert.match(source, /\.documint-jelly-ui \.sidebar/);
  assert.match(source, /\.documint-jelly-ui \.main table/);
  assert.match(source, /:focus-visible/);
  assert.match(source, /prefers-reduced-motion: reduce/);
});

test("Local generated HTML receives the Jelly UI without changing documentation content", () => {
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
});
