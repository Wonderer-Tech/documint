import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";
import { SIDEBAR_STYLES } from "../src/views/sidebarStyles";
import { SIDEBAR_CLIENT_SCRIPT } from "../src/views/sidebarClientScript";
import { buildSidebarHtml } from "../src/views/sidebarTemplate";

test("extracted sidebar styles preserve Local/AI visibility states", () => {
  assert.ok(SIDEBAR_STYLES.length > 8_000);
  assert.match(SIDEBAR_STYLES, /\.auth-status\.optional/);
  assert.match(SIDEBAR_STYLES, /\.hidden\s*\{/);
  assert.match(SIDEBAR_STYLES, /\.progress-section/);
  assert.match(SIDEBAR_STYLES, /\.review-card/);
  assert.match(SIDEBAR_STYLES, /\.review-star\.selected/);
  assert.match(SIDEBAR_STYLES, /\.review-feedback-input/);
  assert.doesNotMatch(SIDEBAR_STYLES, /\$\{/);
});

test("extracted sidebar client script remains syntactically valid", () => {
  assert.ok(SIDEBAR_CLIENT_SCRIPT.length > 12_000);
  assert.doesNotThrow(() => new Script(SIDEBAR_CLIENT_SCRIPT));
  assert.match(SIDEBAR_CLIENT_SCRIPT, /updateGenerationModeVisibility/);
  assert.match(SIDEBAR_CLIENT_SCRIPT, /Generate Local Documentation/);
  assert.match(SIDEBAR_CLIENT_SCRIPT, /setApiKeyStatus/);
  assert.match(SIDEBAR_CLIENT_SCRIPT, /setReviewPromptVisible/);
  assert.match(SIDEBAR_CLIENT_SCRIPT, /setReviewRating/);
  assert.match(SIDEBAR_CLIENT_SCRIPT, /review-feedback/);
  assert.match(SIDEBAR_CLIENT_SCRIPT, /review-marketplace/);
});

test("sidebar template composes extracted styles and client runtime", () => {
  const html = buildSidebarHtml({
    cspSource: "vscode-webview://documint",
    nonce: "test-nonce",
  });

  assert.match(html, /style-src 'nonce-test-nonce'/);
  assert.match(html, /script-src 'nonce-test-nonce'/);
  assert.match(html, /\.auth-status\.optional/);
  assert.match(html, /updateGenerationModeVisibility/);
  assert.match(html, /Local Documentation — No AI/);
  assert.match(html, /id="reviewCard"/);
  assert.match(html, /id="reviewStars"/);
  assert.match(html, /id="reviewFeedback"/);
  assert.match(html, /Open GitHub feedback issue/);
  assert.match(html, /Review on Marketplace/);
});

test("SidebarProvider delegates webview rendering to the extracted template", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );
  const templateSource = readFileSync(
    join(process.cwd(), "src/views/sidebarTemplate.ts"),
    "utf8",
  );

  assert.match(source, /from "\.\/sidebarTemplate"/);
  assert.match(source, /return buildSidebarHtml\(/);
  assert.doesNotMatch(source, /\.auth-status\.optional/);
  assert.doesNotMatch(source, /function updateGenerationModeVisibility/);

  assert.match(templateSource, /from "\.\/sidebarStyles"/);
  assert.match(templateSource, /from "\.\/sidebarClientScript"/);
  assert.match(templateSource, /\$\{SIDEBAR_STYLES\}/);
  assert.match(templateSource, /\$\{SIDEBAR_CLIENT_SCRIPT\}/);
});
