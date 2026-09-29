import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "src/views/sidebarProvider.ts"),
  "utf8",
);

test("sidebar webview uses a per-render nonce Content Security Policy", () => {
  assert.match(source, /import \{ randomBytes \} from "crypto"/);
  assert.match(
    source,
    /private _buildHtml\(webview: vscode\.Webview\): string \{[\s\S]*randomBytes\(16\)\.toString\("base64"\)/,
  );
  assert.match(source, /Content-Security-Policy/);
  assert.match(source, /default-src 'none'/);
  assert.match(source, /img-src \$\{webview\.cspSource\} data:/);
  assert.match(source, /style-src 'nonce-\$\{nonce\}'/);
  assert.match(source, /script-src 'nonce-\$\{nonce\}'/);
  assert.match(source, /<style nonce="\$\{nonce\}">/);
  assert.match(source, /<script nonce="\$\{nonce\}">/);
});

test("sidebar webview does not depend on unsafe inline style attributes", () => {
  assert.doesNotMatch(source, /style="/);
  assert.match(source, /class="status-text"/);
  assert.match(source, /class="generation-actions"/);
  assert.match(source, /id="logSection" hidden/);
  assert.match(source, /logSection\.hidden = false/);
  assert.match(source, /logSection\.hidden = true/);
});

test("sidebar HTML builder receives the active webview for its CSP source", () => {
  assert.match(
    source,
    /webviewView\.webview\.html = this\._buildHtml\(webviewView\.webview\)/,
  );
});
