import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeMarkdownPlainText,
  escapeMarkdownTableText,
} from "../src/services/markdownEscaping";
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

  assert.doesNotMatch(document.html, /window\.__pwned/);
  assert.doesNotMatch(document.html, /<img[^>]+evil\.example/i);
  assert.doesNotMatch(document.html, /<img[^>]+onerror=/i);
  assert.doesNotMatch(document.html, /<script>window\.__pwned/i);
  assert.match(document.html, /&lt;script&gt;/);
  assert.match(document.html, /evil\.example\/image\.png/);
});
