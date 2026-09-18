import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hardenGeneratedHtmlForOffline } from "../src/services/htmlOfflineHardening";

const htmlFixture = [
  "<!doctype html>",
  '<script src="https://cdnjs.cloudflare.com/highlight.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/mermaid.js"></script>',
  "  <script>",
  "  (function () {",
  "    window.__documintStarted = true;",
  "  })();",
  "  </script>",
].join("\n");

test("offline hardening installs safe library fallbacks before the app bootstrap", () => {
  const hardened = hardenGeneratedHtmlForOffline(htmlFixture);

  const fallbackIndex = hardened.indexOf("data-documint-offline-fallback");
  const appIndex = hardened.indexOf("window.__documintStarted = true");
  assert.ok(fallbackIndex >= 0);
  assert.ok(appIndex > fallbackIndex);
  assert.match(hardened, /typeof window\.hljs === 'undefined'/);
  assert.match(hardened, /highlightElement: function \(\) \{\}/);
  assert.match(hardened, /typeof window\.mermaid === 'undefined'/);
  assert.match(hardened, /render: function \(\) \{/);
  assert.match(hardened, /Promise\.reject/);
  assert.match(hardened, /Diagram source is preserved for offline viewing/);
});

test("offline hardening is idempotent and leaves unrelated HTML untouched", () => {
  const hardened = hardenGeneratedHtmlForOffline(htmlFixture);
  assert.equal(hardenGeneratedHtmlForOffline(hardened), hardened);
  assert.equal(hardenGeneratedHtmlForOffline("<html><body>plain</body></html>"), "<html><body>plain</body></html>");
});

test("HTML template already preserves Mermaid source when rendering fails", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/htmlTemplate.ts"),
    "utf8",
  );

  assert.match(source, /async function renderOneDiagram\(/);
  assert.match(source, /catch \(err\) \{[\s\S]*Diagram syntax error — showing source/);
  assert.match(source, /code\.textContent = src/);
  assert.match(source, /function applyHighlighting\(\)[\s\S]*typeof hljs === 'undefined'/);
});

test("output sanitizer hardens fresh HTML while legacy workflow cleanup stays cache-scoped", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/outputSanitizer.ts"),
    "utf8",
  );

  assert.match(
    source,
    /await sanitizeFile\([\s\S]*vscode\.Uri\.file\(paths\.html\),[\s\S]*hardenGeneratedHtmlForOffline/,
  );
  assert.match(source, /sanitizeMarkdown\(entry\.section\)/);
  assert.doesNotMatch(source, /sanitizeHtml\(content\)/);
});
