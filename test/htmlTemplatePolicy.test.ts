import test from "node:test";
import assert from "node:assert/strict";
import {
  formatGeneratedTimestamp,
  resolveHtmlContentSecurityPolicy,
  resolveHtmlExternalAssets,
  resolveHtmlLocalSurfaceChrome,
} from "../src/services/htmlTemplatePolicy";

test("HTML external-asset policy can fully disable CDN URLs", () => {
  const disabled = resolveHtmlExternalAssets(false);

  assert.deepEqual(disabled, {
    highlightThemeLink: "",
    externalScriptTags: "",
    highlightThemeDark: "",
    highlightThemeLight: "",
  });

  const enabled = resolveHtmlExternalAssets(true);
  assert.match(enabled.highlightThemeLink, /cdnjs\.cloudflare\.com/);
  assert.match(enabled.externalScriptTags, /highlight\.min\.js/);
  assert.match(enabled.externalScriptTags, /mermaid\.min\.js/);
  assert.match(enabled.highlightThemeDark, /github-dark\.min\.css/);
  assert.match(enabled.highlightThemeLight, /github\.min\.css/);
});

test("Local HTML chrome distinguishes project-file search from docs search", () => {
  const local = resolveHtmlLocalSurfaceChrome(true);
  assert.match(local.tocHtml, /#documint-local-code-map/);
  assert.match(local.keyboardHints, /Ctrl\/⌘ K/);
  assert.match(local.keyboardHints, /Files/);
  assert.match(local.keyboardHints, /Docs/);

  const shared = resolveHtmlLocalSurfaceChrome(false);
  assert.equal(shared.tocHtml, "");
  assert.match(shared.keyboardHints, /Search/);
  assert.doesNotMatch(shared.keyboardHints, /Ctrl\/⌘ K/);
});

test("generated timestamp formatting is deterministic for valid and legacy values", () => {
  assert.deepEqual(
    formatGeneratedTimestamp("2026-09-30T00:00:00"),
    {
      month: "SEP",
      day: "30",
      year: "2026",
      time: "12:00:00 AM",
    },
  );

  assert.deepEqual(formatGeneratedTimestamp("Sep 30, 01:02:03 AM"), {
    month: "DATE",
    day: "Sep 30",
    year: "",
    time: "01:02:03 AM",
  });
});


test("Local HTML CSP blocks network-capable resource types", () => {
  const local = resolveHtmlContentSecurityPolicy(false, "testNonce123");

  assert.match(local, /Content-Security-Policy/);
  assert.match(local, /default-src 'none'/);
  assert.match(local, /connect-src 'none'/);
  assert.match(local, /object-src 'none'/);
  assert.match(local, /worker-src 'none'/);
  assert.match(local, /base-uri 'none'/);
  assert.match(local, /form-action 'none'/);
  assert.match(local, /script-src 'nonce-testNonce123'/);
  assert.doesNotMatch(local, /script-src 'unsafe-inline'/);
  assert.match(local, /style-src 'unsafe-inline'/);

  assert.equal(resolveHtmlContentSecurityPolicy(true), "");
});

test("Local HTML CSP falls back to blocking all scripts without a nonce", () => {
  const local = resolveHtmlContentSecurityPolicy(false);
  assert.match(local, /script-src 'none'/);
});
