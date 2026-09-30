import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("browser acceptance workflow stays manual-only and runs the canonical verification gate", () => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/browser-acceptance.yml"),
    "utf8",
  );

  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /push:/);
  assert.match(workflow, /npm run verify/);
  assert.match(workflow, /npm run test:browser/);
  assert.match(workflow, /python -m playwright install --with-deps chromium/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /git\s+push/);
});

test("lockfile bootstrap workflow stays manual-only and never mutates the repository", () => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/lockfile-bootstrap.yml"),
    "utf8",
  );

  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /push:/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /npm install --package-lock-only --ignore-scripts --no-audit --no-fund/);
  assert.match(workflow, /npm run lockfile:validate/);
  assert.match(workflow, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(workflow, /npm ls --all/);
  assert.match(workflow, /package-lock\.sha256/);
  assert.match(workflow, /run_readiness:/);
  assert.match(workflow, /default: true/);
  assert.match(workflow, /npm run release:readiness/);
  assert.match(workflow, /documint-bootstrap-readiness/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /git\s+push/);
  assert.doesNotMatch(workflow, /git\s+commit/);
});


test("manual release-readiness workflow stays manual-only and uploads evidence", () => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/release-readiness.yml"),
    "utf8",
  );

  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /push:/);
  assert.match(workflow, /test -f package-lock\.json/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.match(workflow, /python -m playwright install --with-deps chromium/);
  assert.match(workflow, /npm run release:readiness/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /release-artifacts\/readiness/);
  assert.doesNotMatch(workflow, /git\s+push/);
});


test("browser acceptance uses a cross-platform Python 3 launcher", () => {
  const launcher = readFileSync(
    join(process.cwd(), "tools/run-python.mjs"),
    "utf8",
  );

  assert.match(launcher, /DOCUMINT_PYTHON/);
  assert.match(launcher, /python3/);
  assert.match(launcher, /python/);
  assert.match(launcher, /process\.platform === "win32"/);
  assert.match(launcher, /Python 3 was not found/);
});


test("browser acceptance scripts abort external HTTP requests", () => {
  const navigation = readFileSync(
    join(process.cwd(), "test/browser/navigationAcceptance.py"),
    "utf8",
  );
  const reader = readFileSync(
    join(process.cwd(), "test/browser/readerAcceptance.py"),
    "utf8",
  );

  assert.match(navigation, /page\.route\("https:\/\/\*\*\/\*"/);
  assert.match(reader, /context\.route\('https:\/\/\*\*\/\*'/);
});


test("package scripts keep browser fixture and acceptance commands canonical", () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };

  assert.match(
    manifest.scripts["test:browser:fixtures"],
    /navigationFixtures\.ts/,
  );
  assert.equal(
    manifest.scripts["test:browser:navigation"],
    "node tools/run-python.mjs test/browser/navigationAcceptance.py",
  );
  assert.equal(
    manifest.scripts["test:browser:reader"],
    "node tools/run-python.mjs test/browser/readerAcceptance.py",
  );
  assert.equal(
    manifest.scripts["test:browser"],
    "npm run test:browser:fixtures && npm run test:browser:navigation && npm run test:browser:reader",
  );
});
