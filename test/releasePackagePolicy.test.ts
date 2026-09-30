import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
    "documint/**",
    "coverage/**",
    "release-artifacts/**",
    "tools/**",
    "audit/**",
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
  assert.match(readme, /`documint\/documentation\.md`/);
  assert.match(readme, /`documint\/documentation\.html`/);
  assert.doesNotMatch(readme, /`docs\/documentation\.(?:md|html)`/);
  assert.doesNotMatch(
    readme,
    /Very large demo media can make the VSIX larger than the extension code itself\./,
  );
  assert.equal(manifest.icon, "resources/icon.png");
  assert.equal(
    manifest.contributes.viewsContainers.activitybar[0].icon,
    "resources/sidebar-icon.svg",
  );
  assert.equal(ignored.has("resources/icon.png"), false);
  assert.equal(ignored.has("resources/sidebar-icon.svg"), false);
});

test("README scanner extensions stay aligned with C and C++ header support", () => {
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

  assert.match(readme, /C \(`\.c`, `\.h`\)/);
  assert.match(readme, /C\+\+ \(`\.cc`, `\.cpp`, `\.cxx`, `\.hh`, `\.hpp`, `\.hxx`\)/);
  assert.match(readme, /C# \(`\.cs`\)/);
});

test("README project structure documents public facades and implementation modules", () => {
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

  for (const required of [
    "sourceAnalyzer.ts",
    "sourceAnalyzerBase.ts",
    "extension.ts",
    "extensionBase.ts",
    "openAICapabilities.ts",
    "anthropicCapabilities.ts",
    "deepSeekCapabilities.ts",
    "docGenerator.ts",
    "docGeneratorBase.ts",
    "generationCacheIdentity.ts",
  ]) {
    assert.ok(readme.includes(required), `README project structure missing ${required}`);
  }

  assert.doesNotMatch(readme, /extensionPolicy\.ts/);
  assert.match(
    readme,
    /The `\*Base\.ts` modules are implementation details\./,
  );
  assert.match(
    readme,
    /Runtime AI code should import the public facade modules/,
  );
});


test("release workflow publishes VSIX reproducibly as a tag asset without mutating main", () => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/release.yml"),
    "utf8",
  );

  assert.match(workflow, /tags:\s*\n\s*- "v\*"/);
  assert.match(workflow, /test -f package-lock\.json/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.doesNotMatch(workflow, /npm install --no-audit --no-fund/);
  assert.match(workflow, /python -m playwright install --with-deps chromium/);
  assert.match(workflow, /npm run release:readiness/);
  assert.match(workflow, /documint-release-readiness/);
  assert.match(workflow, /release-artifacts\/readiness/);
  assert.match(workflow, /release-artifacts\/\*\.vsix/);
  assert.match(workflow, /gh release upload/);
  assert.match(workflow, /gh release create/);
  assert.doesNotMatch(workflow, /git\s+push/);
  assert.doesNotMatch(workflow, /git\s+add\s+-f/);
  assert.doesNotMatch(workflow, /HEAD:main/);
});


test("release readiness command runs strict verification and writes measurable evidence", () => {
  const readiness = readFileSync(
    join(process.cwd(), "tools/release-readiness.mjs"),
    "utf8",
  );

  assert.equal(
    manifest.scripts["release:readiness"],
    "node tools/release-readiness.mjs",
  );
  assert.match(readiness, /package-lock\.json is required/);
  assert.match(readiness, /\["run", "verify"\]/);
  assert.match(readiness, /\["run", "test:browser"\]/);
  assert.match(readiness, /node_modules/);
  assert.match(readiness, /\.bin/);
  assert.match(readiness, /vsceCommand/);
  assert.match(readiness, /Local @vscode\/vsce binary is missing/);
  assert.match(readiness, /tools\/run-python\.mjs/);
  assert.match(readiness, /Python Playwright\/Chromium is unavailable/);
  assert.match(readiness, /evidence\.checks\.browserRuntime/);
  assert.match(readiness, /readiness\.json/);
  assert.match(readiness, /DOCUMINT_SELF_AUDIT_OUTPUT/);
  assert.match(readiness, /createHash\("sha256"\)/);
  assert.match(readiness, /DOCUMINT_BASELINE_VSIX/);
  assert.match(readiness, /deltaPercent/);
  assert.match(readiness, /reader-results\.json/);
  assert.match(readiness, /results\.json/);
  assert.match(readiness, /VSIX does not have a ZIP signature/);
});


test("release readiness runner is valid Node ESM syntax", () => {
  execFileSync(
    process.execPath,
    ["--check", join(process.cwd(), "tools/release-readiness.mjs")],
    { stdio: "pipe" },
  );
});


test("Python launcher is valid Node ESM syntax", () => {
  execFileSync(
    process.execPath,
    ["--check", join(process.cwd(), "tools/run-python.mjs")],
    { stdio: "pipe" },
  );
});


test("CI prefers npm ci once a package lock exists and warns on the temporary fallback", () => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/ci.yml"),
    "utf8",
  );

  assert.match(workflow, /hashFiles\('package-lock\.json'\) != ''/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.match(workflow, /hashFiles\('package-lock\.json'\) == ''/);
  assert.match(workflow, /package-lock\.json is missing/);
});
