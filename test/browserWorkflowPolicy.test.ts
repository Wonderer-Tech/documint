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
  assert.match(workflow, /navigationFixtures\.ts/);
  assert.match(workflow, /navigationAcceptance\.py/);
  assert.match(workflow, /readerAcceptance\.py/);
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
