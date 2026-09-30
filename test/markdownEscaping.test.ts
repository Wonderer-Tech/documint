import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeMarkdownPlainText,
  escapeMarkdownTableText,
  escapeRawHtmlOutsideMarkdownCode,
} from "../src/services/markdownEscaping";
import { marked } from "marked";
import { readFileSync } from "node:fs";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationDocument } from "../src/services/localDocumentationDocument";
import type { WorkspaceFile } from "../src/types";

test("source-derived prose stays plain text instead of executable Markdown or HTML", () => {
  const escaped = escapeMarkdownPlainText(
    '<script>alert(1)</script> ![demo](https://evil.example/image.png)',
  );

  assert.doesNotMatch(escaped, /<script>/i);
  assert.match(escaped, /&lt;script&gt;/);
  assert.match(escaped, /\\!\\\[demo\\\]\\\(https:\/\/evil\.example\/image\\\.png\\\)/);
});

test("table escaping handles separators exactly once", () => {
  assert.equal(escapeMarkdownTableText("A|B"), "A\\|B");
  assert.equal(
    escapeMarkdownTableText("<b>x</b>|value"),
    "&lt;b&gt;x&lt;/b&gt;\\|value",
  );
});

test("Local document rendering does not execute source-comment HTML or Markdown images", () => {
  const files: WorkspaceFile[] = [
    {
      path: "src/example.ts",
      language: "typescript",
      content: [
        "/**",
        " * <script>window.__pwned = true</script>",
        " * ![remote](https://evil.example/image.png)",
        " */",
        "export class Example {}",
        "// TODO: <img src=x onerror=alert(1)>",
      ].join("\n"),
    },
  ];

  const project = new SourceAnalyzer().analyzeProject(files);
  const document = buildLocalDocumentationDocument(
    "Unsafe <img src=x onerror=alert(2)>",
    files,
    project,
  );

  assert.doesNotMatch(
    document.html,
    /<script[^>]*>[\s\S]*window\.__pwned/i,
  );
  assert.doesNotMatch(document.html, /<img[^>]+evil\.example/i);
  assert.doesNotMatch(document.html, /<img[^>]+onerror=/i);
  assert.doesNotMatch(document.html, /<script>window\.__pwned/i);
  assert.match(document.html, /&lt;script&gt;/);
  assert.match(document.html, /evil\.example\/image\.png/);
});


test("raw HTML neutralizer blocks multiline tag starts but preserves code spans and fences", () => {
  const input = [
    "before <script",
    " src=x>window.bad = true</script>",
    "inline `<b>code</b>`",
    "```html",
    "<script>code sample</script>",
    "```",
  ].join("\n");

  const escaped = escapeRawHtmlOutsideMarkdownCode(input);
  assert.match(escaped, /before &lt;script/);
  assert.match(escaped, /window\.bad = true&lt;\/script>/);
  assert.match(escaped, /inline `<b>code<\/b>`/);
  assert.match(
    escaped,
    /```html\n<script>code sample<\/script>\n```/,
  );

  const html = marked.parse(escaped) as string;
  assert.doesNotMatch(html, /<script[^>]*>window\.bad/);
  assert.match(html, /<code>&lt;b&gt;code&lt;\/b&gt;<\/code>/);
  assert.match(html, /&lt;script&gt;code sample&lt;\/script&gt;/);
});

test("AI Markdown conversion uses the shared raw HTML safety boundary", () => {
  const source = readFileSync(
    "src/services/docGeneratorBase.ts",
    "utf8",
  );

  assert.match(
    source,
    /escapeRawHtmlOutsideMarkdownCode\(markdown\)/,
  );
  assert.doesNotMatch(
    source,
    /private escapeRawHtmlOutsideCodeFences/,
  );
});
