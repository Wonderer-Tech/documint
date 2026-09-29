import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const providerSource = readFileSync(
  join(process.cwd(), "src/views/sidebarProvider.ts"),
  "utf8",
);
const templateSource = readFileSync(
  join(process.cwd(), "src/views/sidebarTemplate.ts"),
  "utf8",
);
const clientSource = readFileSync(
  join(process.cwd(), "src/views/sidebarClientScript.ts"),
  "utf8",
);

test("sidebar webview uses a per-render nonce Content Security Policy", () => {
  assert.match(providerSource, /import \{ randomBytes \} from "crypto"/);
  assert.match(
    providerSource,
    /private _buildHtml\(webview: vscode\.Webview\): string \{[\s\S]*randomBytes\(16\)\.toString\("base64"\)/,
  );
  assert.match(providerSource, /buildSidebarHtml\(/);
  assert.match(providerSource, /cspSource: webview\.cspSource/);
  assert.match(providerSource, /nonce,/);

  assert.match(templateSource, /Content-Security-Policy/);
  assert.match(templateSource, /default-src 'none'/);
  assert.match(templateSource, /img-src \$\{options\.cspSource\} data:/);
  assert.match(templateSource, /style-src 'nonce-\$\{options\.nonce\}'/);
  assert.match(templateSource, /script-src 'nonce-\$\{options\.nonce\}'/);
  assert.match(templateSource, /<style nonce="\$\{options\.nonce\}">/);
  assert.match(templateSource, /<script nonce="\$\{options\.nonce\}">/);
  assert.match(templateSource, /\$\{SIDEBAR_STYLES\}/);
  assert.match(templateSource, /\$\{SIDEBAR_CLIENT_SCRIPT\}/);
});

test("sidebar webview does not depend on unsafe inline style attributes", () => {
  assert.doesNotMatch(templateSource, /style="/);
  assert.match(templateSource, /class="status-text"/);
  assert.match(templateSource, /class="generation-actions"/);
  assert.match(templateSource, /id="logSection" hidden/);
  assert.match(clientSource, /logSection\.hidden = false/);
  assert.match(clientSource, /logSection\.hidden = true/);
});

test("sidebar HTML builder receives the active webview for its CSP source", () => {
  assert.match(
    providerSource,
    /webviewView\.webview\.html = this\._buildHtml\(webviewView\.webview\)/,
  );
});
