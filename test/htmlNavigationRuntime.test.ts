import test from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationDocument } from "../src/services/localDocumentationDocument";

const files = [
  { path: "src/scanner/index.ts", language: "typescript", content: "export const scan = 1;\n" },
  { path: "src/app/(internal)/[slug]/page.tsx", language: "typescriptreact", content: "export const page = 1;\n" },
  { path: "src/components/hello world.ts", language: "typescript", content: "export const hello = 1;\n" },
  { path: "src/lib/d2.ts", language: "typescript", content: "export const diagram = 1;\n" },
];

function documentHtml(): string {
  return buildLocalDocumentationDocument("Navigation fixture", files, new SourceAnalyzer().analyzeProject(files)).html;
}

test("Local TOC emits the shared link and text classes before any browser script runs", () => {
  const html = documentHtml();
  const navigation = html.match(/<nav class="toc-nav" id="tocNav">([\s\S]*?)<\/nav>/)?.[1] ?? "";
  assert.ok(navigation.length > 0);
  const anchors = [...navigation.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.ok(anchors.length > files.length);
  for (const [, attributes, label] of anchors) {
    assert.match(attributes, /class="toc-link level-[1-6]"/);
    assert.match(label, /<span class="toc-text">/);
  }
});

test("Local headings carry exact file identities including spaced and route-group paths", () => {
  const html = documentHtml();
  for (const file of files) {
    assert.ok(html.includes(`data-documint-file-path="${file.path}"`), `missing file identity: ${file.path}`);
  }
  const fileHeadings = [...html.matchAll(/<h2\b[^>]*data-documint-file-path="([^"]+)"/g)];
  assert.deepEqual(fileHeadings.map((match) => match[1]).sort(), files.map((file) => file.path).sort());
});

test("generated inline scripts parse independently from optional CDN libraries", () => {
  const html = documentHtml();
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.ok(scripts.some((source) => source.includes("enhanceSidebarNavigation")));
  scripts.forEach((source, index) => assert.doesNotThrow(() => new Script(source, { filename: `generated-${index}.js` })));
});
