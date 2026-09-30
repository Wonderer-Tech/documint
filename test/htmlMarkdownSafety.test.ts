import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isSafeMarkdownHref,
  isSafeMarkdownImageSrc,
  sanitizeRenderedMarkdownUrls,
} from "../src/services/htmlMarkdownSafety";

test("rendered Markdown link policy allows explicit safe navigation schemes", () => {
  for (const href of [
    "../src/file.ts#L10",
    "./guide.md",
    "#section",
    "?tab=api",
    "https://example.com/docs",
    "http://localhost:3000/docs",
    "mailto:docs@example.com",
  ]) {
    assert.equal(isSafeMarkdownHref(href), true, href);
  }

  for (const href of [
    "javascript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "vscode://file/tmp/example",
    "//evil.example/path",
    "\\\\evil.example\\share",
    "",
  ]) {
    assert.equal(isSafeMarkdownHref(href), false, href);
  }
});

test("rendered Markdown image policy blocks remote and active image sources", () => {
  for (const src of [
    "../assets/diagram.png",
    "./diagram.webp",
    "images/icon.svg",
    "data:image/png;base64,iVBORw0KGgo=",
    "data:image/jpeg;base64,/9j/4AAQ",
    "data:image/gif;base64,R0lGODlh",
    "data:image/webp;base64,UklGRg==",
  ]) {
    assert.equal(isSafeMarkdownImageSrc(src), true, src);
  }

  for (const src of [
    "https://evil.example/track.png",
    "http://evil.example/track.png",
    "//evil.example/track.png",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "data:text/html,<script>alert(1)</script>",
    "javascript:alert(1)",
    "",
  ]) {
    assert.equal(isSafeMarkdownImageSrc(src), false, src);
  }
});

test("rendered Markdown URL sanitizer neutralizes unsafe href and src values", () => {
  const html = [
    '<p><a href="https://example.com">safe</a></p>',
    '<p><a href="../src/file.ts#L3">source</a></p>',
    '<p><a href="javascript:alert(1)">bad</a></p>',
    '<p><a href="java&#x73;cript:alert(2)">entity bad</a></p>',
    '<p><a href="java&amp;#x73;cript:alert(3)">double entity bad</a></p>',
    '<p><a href="//evil.example/path">protocol relative</a></p>',
    '<p><img src="https://evil.example/track.png" alt="remote"></p>',
    '<p><img src="../assets/local.png" alt="local"></p>',
    '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="inline"></p>',
  ].join("");

  const sanitized = sanitizeRenderedMarkdownUrls(html);

  assert.match(sanitized, /href="https:\/\/example\.com"/);
  assert.match(sanitized, /href="\.\.\/src\/file\.ts#L3"/);
  assert.equal(
    (sanitized.match(/data-documint-blocked-url="true"/g) ?? []).length,
    5,
  );
  assert.doesNotMatch(sanitized, /href="javascript:/i);
  assert.doesNotMatch(sanitized, /href="java&#x73;cript:/i);
  assert.doesNotMatch(sanitized, /src="https:\/\/evil\.example/i);
  assert.match(sanitized, /src="\.\.\/assets\/local\.png"/);
  assert.match(sanitized, /src="data:image\/png;base64,iVBORw0KGgo="/);
});

test("URL sanitizer does not rewrite href-like text inside rendered code", () => {
  const html =
    '<pre><code>&lt;a href="javascript:alert(1)"&gt;sample&lt;/a&gt;</code></pre>';

  assert.equal(sanitizeRenderedMarkdownUrls(html), html);
});

test("Local and AI Markdown renderers both apply the rendered-URL sanitizer", () => {
  const local = readFileSync(
    "src/services/localDocumentationDocument.ts",
    "utf8",
  );
  const ai = readFileSync(
    "src/services/docGeneratorBase.ts",
    "utf8",
  );

  assert.match(
    local,
    /sanitizeRenderedMarkdownUrls\([\s\S]*marked\.parse\(/,
  );
  assert.match(
    ai,
    /sanitizeRenderedMarkdownUrls\([\s\S]*marked\.parse\(normalisedMarkdown\)/,
  );
});
