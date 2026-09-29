import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";
import { SIDEBAR_STYLES } from "../src/views/sidebarStyles";
import { SIDEBAR_CLIENT_SCRIPT } from "../src/views/sidebarClientScript";

test("extracted sidebar styles preserve Local/AI visibility states", () => {
  assert.ok(SIDEBAR_STYLES.length > 8_000);
  assert.match(SIDEBAR_STYLES, /\.auth-status\.optional/);
  assert.match(SIDEBAR_STYLES, /\.hidden\s*\{/);
  assert.match(SIDEBAR_STYLES, /\.progress-section/);
  assert.doesNotMatch(SIDEBAR_STYLES, /\$\{/);
});

test("extracted sidebar client script remains syntactically valid", () => {
  assert.ok(SIDEBAR_CLIENT_SCRIPT.length > 12_000);
  assert.doesNotThrow(() => new Script(SIDEBAR_CLIENT_SCRIPT));
  assert.match(SIDEBAR_CLIENT_SCRIPT, /syncGenerationModeUi/);
  assert.match(SIDEBAR_CLIENT_SCRIPT, /Generate Local Documentation/);
  assert.match(SIDEBAR_CLIENT_SCRIPT, /setApiKeyStatus/);
});

test("SidebarProvider delegates static assets to extracted modules", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );

  assert.match(source, /from "\.\/sidebarStyles"/);
  assert.match(source, /from "\.\/sidebarClientScript"/);
  assert.match(source, /\$\{SIDEBAR_STYLES\}/);
  assert.match(source, /\$\{SIDEBAR_CLIENT_SCRIPT\}/);
  assert.doesNotMatch(source, /\.auth-status\.optional/);
  assert.doesNotMatch(source, /function syncGenerationModeUi/);
});
