import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HTML_BASE_STYLES } from "../src/services/htmlBaseStyles";

test("generated HTML base styles preserve the reader shell and Jelly UI", () => {
  assert.ok(HTML_BASE_STYLES.length > 70_000);
  assert.match(HTML_BASE_STYLES, /:root\[data-theme="dark"\]/);
  assert.match(HTML_BASE_STYLES, /\.documint-jelly-ui \.sidebar/);
  assert.match(HTML_BASE_STYLES, /\.architecture-pie-panel/);
  assert.match(HTML_BASE_STYLES, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(HTML_BASE_STYLES, /\$\{/);
});

test("HTML template composes extracted base styles instead of duplicating them inline", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/htmlTemplate.ts"),
    "utf8",
  );

  assert.match(source, /import \{ HTML_BASE_STYLES \} from "\.\/htmlBaseStyles"/);
  assert.match(source, /<style>\s*\$\{HTML_BASE_STYLES\}/);
  assert.doesNotMatch(source, /:root\[data-theme="dark"\] \{/);
});
