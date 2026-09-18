import test from "node:test";
import assert from "node:assert/strict";
import { Script, runInNewContext } from "node:vm";
import { generateHtmlTemplate } from "../src/services/htmlTemplate";
import { READER_NAVIGATION_SCRIPT } from "../src/services/htmlReaderNavigation";
import { READER_SEARCH_SCRIPT } from "../src/services/htmlReaderSearch";
import { READER_STYLES } from "../src/services/htmlReaderStyles";

const content = '<h1 id="overview">Overview</h1><h2 id="source">src/index.ts</h2><p>Exact supplied source facts.</p>';
function report() {
  return generateHtmlTemplate({
    title: "Reader fixture", projectName: "Reader fixture", fileCount: 1,
    generationDate: "2026-09-18T00:00:00.000Z",
    tocHtml: '<ul><li><a class="toc-link level-1" href="#source"><span class="toc-text">src/index.ts</span></a></li></ul>',
    contentHtml: content,
  });
}

test("reader modules and generated inline scripts are syntactically valid", () => {
  assert.doesNotThrow(() => new Script(READER_NAVIGATION_SCRIPT + READER_SEARCH_SCRIPT));
  for (const match of report().matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => new Script(match[1]));
  }
});

test("reader template preserves source content and bootstraps controls before indexing", () => {
  const html = report();
  assert.ok(html.includes(content));
  assert.ok(html.includes(READER_STYLES));
  const sidebar = html.indexOf("safelyEnhance('Sidebar navigation', enhanceSidebarNavigation)");
  const reader = html.indexOf("safelyEnhance('Reader controls', initializeReaderNavigation)");
  const index = html.indexOf("safelyEnhance('Search index', buildIndex)");
  assert.ok(sidebar >= 0 && reader > sidebar && index > reader);
  assert.doesNotMatch(html, /safelyEnhance\('Active navigation', initTocTracking\)/);
});

function rank(item: { text: string; file: string; fileHeading: boolean; heading: boolean }, query: string): number {
  const context = { document: { getElementById: () => null, addEventListener: () => {} }, item, query };
  return runInNewContext(READER_SEARCH_SCRIPT + "\nsearchRank(item, query, query.split(/\\s+/));", context) as number;
}

test("exact filenames rank above headings and body mentions", () => {
  const query = "index.ts";
  const file = rank({ text: "src/index.ts", file: "src/index.ts", fileHeading: true, heading: true }, query);
  const heading = rank({ text: "Using index.ts", file: "src/other.ts", fileHeading: false, heading: true }, query);
  const paragraph = rank({ text: "See index.ts for details", file: "src/other.ts", fileHeading: false, heading: false }, query);
  assert.ok(file > heading && heading > paragraph);
});

test("search accepts combined path and section terms without accepting partial token matches", () => {
  const item = { text: "Imports", file: "src/scanner/index.ts", fileHeading: false, heading: true };
  assert.ok(rank(item, "scanner imports") >= 0);
  assert.equal(rank(item, "scanner missing"), -1);
});

test("reader styling and runtime retain keyboard, mobile, and storage boundaries", () => {
  assert.match(READER_NAVIGATION_SCRIPT, /location\.pathname \+ ':' \+ document\.title/);
  assert.match(READER_NAVIGATION_SCRIPT, /readStoredValue\(storageKey/);
  assert.match(READER_NAVIGATION_SCRIPT, /writeStoredValue\(storageKey/);
  assert.match(READER_NAVIGATION_SCRIPT, /aria-modal/);
  assert.match(READER_NAVIGATION_SCRIPT, /restoreBackground/);
  assert.match(READER_SEARCH_SCRIPT, /aria-activedescendant/);
  assert.doesNotMatch(READER_SEARCH_SCRIPT, /\.innerHTML\s*=/);
  assert.match(READER_STYLES, /reader-drawer-open/);
  assert.match(READER_STYLES, /@media print/);
});
