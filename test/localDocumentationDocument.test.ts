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
      "function normalizeValue(value: string) {",
      "  return value.trim();",
      "}",
      "// TODO: add command smoke test",
      "export function run(value: string) {",
      "  return formatValue(normalizeValue(value));",
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
  assert.doesNotMatch(document.html, /language-mermaid/);
  assert.match(document.html, /data-documint-local-code-map/);
  assert.match(document.html, /How do the parts fit together\?/);
  assert.match(document.html, /Which files are used by the most project files\?/);
});

test("Local HTML preserves internal symbols and TODO evidence in the file card", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.match(document.html, /internalSymbols/);
  assert.match(document.html, /normalizeValue/);
  assert.match(document.html, /Internal symbols/);
  assert.match(document.html, /Source notes/);
  assert.match(document.html, /TODO: add command smoke test/);
});


test("Local document assembly remains independent of provider/model inputs", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.doesNotMatch(document.markdown, /gpt-5|claude-|deepseek-|openrouter/i);
  assert.doesNotMatch(document.html, /api key configured/i);
});


test("Markdown stays compact and Local HTML uses the code map instead of legacy visual payloads", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.doesNotMatch(document.markdown, /```architecture-blueprint/);
  assert.doesNotMatch(document.markdown, /```excalidraw-blueprint/);
  assert.doesNotMatch(document.markdown, /```dependency-graph/);
  assert.doesNotMatch(document.markdown, /### File Dependency Graph/);
  assert.doesNotMatch(document.markdown, /### Module Architecture — D2/);
  assert.match(document.markdown, /### Module Architecture/);

  assert.match(document.html, /data-documint-local-code-map/);
  assert.match(document.html, /Find your way through the code/);
  assert.doesNotMatch(document.html, /language-architecture-blueprint/);
  assert.doesNotMatch(document.html, /language-excalidraw-blueprint/);
  assert.doesNotMatch(document.html, /language-dependency-graph/);
  assert.doesNotMatch(document.html, /File Dependency Graph — Mermaid/);
  assert.doesNotMatch(document.html, /Module Architecture — D2/);
});


test("Local HTML code map owns onboarding facts without duplicating Markdown onboarding headings", () => {
  const onboardingFiles = [
    {
      path: "src/main.ts",
      language: "typescript",
      content: [
        "export const token = process.env.API_TOKEN;",
        "export function run() { return token; }",
      ].join("\n"),
    },
    {
      path: "package.json",
      language: "json",
      content: JSON.stringify({
        main: "./dist/extension.js",
        scripts: {
          compile: "tsc --noEmit",
          test: "node --test",
        },
        contributes: {
          commands: [
            { command: "documint.generate", title: "Generate Documentation" },
          ],
          configuration: {
            properties: {
              "documint.generationMode": { default: "local" },
            },
          },
        },
      }),
    },
  ];
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(onboardingFiles);
  const document = buildLocalDocumentationDocument(
    "Onboarding",
    onboardingFiles,
    project,
    {
      makefile: "verify:\n\tnpm test\n",
      dockerfile: [
        "FROM node:22-alpine AS runtime",
        "EXPOSE 3000",
        'CMD ["node", "dist/server.js"]',
      ].join("\n"),
    },
  );

  assert.match(document.markdown, /## How to run/);
  assert.match(document.markdown, /## Referenced environment variables/);
  assert.match(document.html, /<h3 id="localMapRunTitle">How to run<\/h3>/);
  assert.match(document.html, /npm run compile/);
  assert.match(document.html, /documint\.generate/);
  assert.match(document.html, /documint\.generationMode/);
  assert.match(document.html, /make verify/);
  assert.match(document.html, /node:22-alpine/);
  assert.match(document.html, /API_TOKEN/);
  assert.doesNotMatch(document.html, /<h2[^>]*>How to run<\/h2>/);
  assert.doesNotMatch(
    document.html,
    /<h2[^>]*>Referenced environment variables<\/h2>/,
  );
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


test("Local Markdown keeps orientation sections while HTML avoids duplicating code-map answers", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.match(document.markdown, /## Where is what/);
  assert.match(document.markdown, /## Suggested reading path/);
  assert.match(document.markdown, /## Core files/);

  assert.doesNotMatch(document.html, /<h2[^>]*>Where is what<\/h2>/);
  assert.doesNotMatch(document.html, /<h2[^>]*>Suggested reading path<\/h2>/);
  assert.doesNotMatch(document.html, /<h2[^>]*>Core files<\/h2>/);
  assert.match(document.html, /data-documint-local-code-map/);
});


test("Local HTML exposes Project map navigation and distinct file/docs search hints", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.match(
    document.html,
    /href="#documint-local-code-map"[^>]*>[sS]*Project map/,
  );
  assert.match(document.html, /Ctrl/⌘ K</kbd> Files/);
  assert.match(document.html, /<kbd>/</kbd> Docs/);
});


test("README module descriptions appear in Where is what without inference", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument(
    "Example Project",
    files,
    project,
    {
      readme: [
        "```text",
        "src/",
        "`-- main.ts",
        "lib/",
        "`-- format.ts",
        "```",
        "",
        "src/ — Application source",
        "lib/ — Shared formatting helpers",
      ].join("\n"),
    },
  );

  assert.match(document.markdown, /\| Module \| What's inside \| Files \| Lines \| Start with \|/);
  assert.match(document.markdown, /\| `src` \| Application source \|/);
  assert.match(document.markdown, /\| `lib` \| Shared formatting helpers \|/);
});


test("Local generated HTML embeds a no-network Content Security Policy", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  assert.match(
    document.html,
    /Content-Security-Policy[^>]+default-src 'none'[^>]+connect-src 'none'/,
  );
  assert.doesNotMatch(document.html, /cdnjs\.cloudflare\.com/i);
});

test("Local generated HTML uses a CSP nonce instead of unsafe inline scripts", () => {
  const analyzer = new SourceAnalyzer();
  const project = analyzer.analyzeProject(files);
  const document = buildLocalDocumentationDocument("Example Project", files, project);

  const nonce = document.html.match(/script-src 'nonce-([^']+)'/)?.[1];
  assert.ok(nonce);

  const executableTag = `<script nonce="${nonce}">`;
  assert.ok(document.html.split(executableTag).length - 1 >= 2);
  assert.ok(
    document.html.includes(
      `<script nonce="${nonce}" type="application/json" id="documintLocalCodeMapData">`,
    ),
  );
  assert.doesNotMatch(document.html, /onclick=/i);
  assert.doesNotMatch(document.html, /script-src 'unsafe-inline'/);
});
