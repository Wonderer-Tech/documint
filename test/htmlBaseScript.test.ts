import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";
import { buildHtmlBaseScript } from "../src/services/htmlBaseScript";

test("extracted generated HTML runtime script remains syntactically valid", () => {
  const source = buildHtmlBaseScript({
    highlightThemeDark: "",
    highlightThemeLight: "",
  });

  assert.ok(source.length > 80_000);
  assert.doesNotThrow(() => new Script(source));
  assert.match(source, /enhanceSidebarNavigation/);
  assert.match(source, /initializeReaderNavigation/);
  assert.match(source, /buildIndex/);
  assert.match(source, /Diagram syntax error — showing source/);
});

test("HTML template delegates its runtime script to htmlBaseScript", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/htmlTemplate.ts"),
    "utf8",
  );

  assert.match(source, /import \{ buildHtmlBaseScript \} from "\.\/htmlBaseScript"/);
  assert.match(
    source,
    /\$\{buildHtmlBaseScript\(\{ highlightThemeDark, highlightThemeLight \}\)\}/,
  );
  assert.doesNotMatch(source, /function mermaidConfig\(/);
  assert.doesNotMatch(source, /function enhanceSidebarNavigation\(/);
});
