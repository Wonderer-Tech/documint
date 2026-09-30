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
  assert.match(
    manifest.scripts["test:browser:navigation"],
    /navigationAcceptance\.py/,
  );
  assert.match(
    manifest.scripts["test:browser:reader"],
    /readerAcceptance\.py/,
  );
  assert.equal(
    manifest.scripts["test:browser"],
    "npm run test:browser:fixtures && npm run test:browser:navigation && npm run test:browser:reader",
  );
});
