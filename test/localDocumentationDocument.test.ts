import test from "node:test";
import assert from "node:assert/strict";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationDocument } from "../src/services/localDocumentationDocument";

const files = [
  {
    path: "src/main.ts",
    language: "typescript",
    content: [
      'import { formatValue } from "../lib/format";',
      "export function run(value: string) {",
      "  return formatValue(value);",
      "}",
    ].join("\n"),
  },
  {
    path: "lib/format.ts",
    language: "typescript",
    content: [
      "export function formatValue(value: string) {",
      "  return value.trim();",
      "}",
    ].join("\n"),
  },
];

test("complete Local document combines overview, architecture, and per-file facts", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.equal(document.fileCount, 2);
  assert.deepEqual(document.languages, ["typescript"]);
  assert.match(document.markdown, /# Example Project — Local Documentation/);
  assert.match(document.markdown, /## Architecture & Dependencies/);
  assert.match(document.markdown, /src\/main\.ts/);
  assert.match(document.markdown, /lib\/format\.ts/);
  assert.match(document.markdown, /No AI provider was used/);
  assert.match(document.html, /Example Project — Local Documentation/);
  assert.match(document.html, /href="#architecture-dependencies"/);
  assert.match(document.html, /language-mermaid/);
});

test("Local document assembly remains independent of provider/model inputs", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.doesNotMatch(document.markdown, /gpt-5|claude-|deepseek-|openrouter/i);
  assert.doesNotMatch(document.html, /api key configured/i);
});
