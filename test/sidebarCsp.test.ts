import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const providerSource = readFileSync(
  join(process.cwd(), "src/views/sidebarProvider.ts"),
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
  assert.match(providerSource, /Content-Security-Policy/);
  assert.match(providerSource, /default-src 'none'/);
  assert.match(providerSource, /img-src \$\{webview\.cspSource\} data:/);
  assert.match(providerSource, /style-src 'nonce-\$\{nonce\}'/);
  assert.match(providerSource, /script-src 'nonce-\$\{nonce\}'/);
  assert.match(providerSource, /<style nonce="\$\{nonce\}">/);
  assert.match(providerSource, /<script nonce="\$\{nonce\}">/);
  assert.match(providerSource, /\$\{SIDEBAR_STYLES\}/);
  assert.match(providerSource, /\$\{SIDEBAR_CLIENT_SCRIPT\}/);
});

test("sidebar webview does not depend on unsafe inline style attributes", () => {
  assert.doesNotMatch(providerSource, /style="/);
  assert.match(providerSource, /class="status-text"/);
  assert.match(providerSource, /class="generation-actions"/);
  assert.match(providerSource, /id="logSection" hidden/);
  assert.match(clientSource, /logSection\.hidden = false/);
  assert.match(clientSource, /logSection\.hidden = true/);
});

test("sidebar HTML builder receives the active webview for its CSP source", () => {
  assert.match(
    providerSource,
    /webviewView\.webview\.html = this\._buildHtml\(webviewView\.webview\)/,
  );
});
