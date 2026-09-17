import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import manifest from "../package.json";

function vscodeIgnoreLines(): Set<string> {
  return new Set(
    readFileSync(join(process.cwd(), ".vscodeignore"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")),
  );
}

test("VSIX excludes bundled dependencies and development-only content", () => {
  const ignored = vscodeIgnoreLines();

  for (const path of [
    "node_modules/**",
    "src/**",
    "test/**",
    ".github/**",
    "docs/**",
    "coverage/**",
    "*.vsix",
    "*.tgz",
  ]) {
    assert.ok(ignored.has(path), `missing VSIX exclusion: ${path}`);
  }

  assert.ok(ignored.has("dist/**"));
  assert.ok(ignored.has("!dist/extension.js"));
  assert.equal(manifest.main, "./dist/extension.js");
  assert.equal(manifest.scripts["vscode:prepublish"], "npm run compile");
});

test("README-only media stays out of VSIX while runtime icons remain packageable", () => {
  const ignored = vscodeIgnoreLines();
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

  for (const media of [
    "resources/demo.gif",
    "resources/screenshot1.png",
    "resources/s2.png",
    "resources/s3.png",
    "resources/s4.png",
  ]) {
    assert.ok(ignored.has(media), `README-only media should be excluded: ${media}`);
  }

  assert.match(readme, /raw\.githubusercontent\.com\/Wonderer-Tech\/documint\/main\/resources\/demo\.gif/);
  assert.match(readme, /raw\.githubusercontent\.com\/Wonderer-Tech\/documint\/main\/resources\/screenshot1\.png/);
  assert.equal(manifest.icon, "resources/icon.png");
  assert.equal(
    manifest.contributes.viewsContainers.activitybar[0].icon,
    "resources/sidebar-icon.svg",
  );
  assert.equal(ignored.has("resources/icon.png"), false);
  assert.equal(ignored.has("resources/sidebar-icon.svg"), false);
});
