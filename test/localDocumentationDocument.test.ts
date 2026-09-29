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
  assert.match(document.markdown, /No AI inference, model, API key, or external provider is used/);
  assert.match(document.html, /Example Project — Local Documentation/);
  assert.match(document.html, /href="#architecture-dependencies"/);
  assert.match(document.html, /language-mermaid/);
  assert.match(document.html, /data-documint-local-code-map/);
  assert.match(document.html, /How do the parts fit together\?/);
  assert.match(document.html, /Which files are used by the most project files\?/);
});

test("Local document assembly remains independent of provider/model inputs", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.doesNotMatch(document.markdown, /gpt-5|claude-|deepseek-|openrouter/i);
  assert.doesNotMatch(document.html, /api key configured/i);
});


test("Markdown stays compact while HTML retains rich Local visual payloads", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.doesNotMatch(document.markdown, /```architecture-blueprint/);
  assert.doesNotMatch(document.markdown, /```excalidraw-blueprint/);
  assert.doesNotMatch(document.markdown, /```dependency-graph/);
  assert.doesNotMatch(document.markdown, /### File Dependency Graph/);
  assert.doesNotMatch(document.markdown, /### Module Architecture — D2/);
  assert.match(document.markdown, /### Module Architecture/);

  assert.match(document.html, /architecture-blueprint/);
  assert.match(document.html, /excalidraw-blueprint/);
  assert.match(document.html, /dependency-graph/);
});


test("Local HTML omits external CDN assets while keeping the interactive code map", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.doesNotMatch(document.html, /cdnjs\.cloudflare\.com/i);
  assert.doesNotMatch(document.html, /<script[^>]+src=["']https?:\/\//i);
  assert.match(document.html, /data-documint-local-code-map/);
  assert.match(document.html, /Find your way through the code/);
});
