import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateApiKeyValue } from "../src/config/apiKeyValidation";

test("API key validation accepts future provider formats", () => {
  assert.equal(
    validateApiKeyValue("future_provider_key_ABC123456789").valid,
    true,
  );
  assert.equal(
    validateApiKeyValue("sk-ant-example-format-that-is-long-enough").valid,
    true,
  );
});

test("API key validation treats surrounding paste whitespace as noise", () => {
  assert.equal(
    validateApiKeyValue("  future_provider_key_ABC123456789\n").valid,
    true,
  );

  const source = readFileSync(
    join(process.cwd(), "src/config/secretStorage.ts"),
    "utf8",
  );
  assert.match(
    source,
    /secretStorage\.store\(`\$\{provider\}-api-key`, apiKey\.trim\(\)\)/,
  );
});

test("API key validation rejects obvious invalid values", () => {
  assert.equal(validateApiKeyValue("").valid, false);
  assert.equal(validateApiKeyValue("short").valid, false);
  assert.equal(validateApiKeyValue("your-api-key").valid, false);
  assert.equal(validateApiKeyValue("sk-...").valid, false);
  assert.equal(validateApiKeyValue("abc def ghi jkl").valid, false);
  assert.equal(validateApiKeyValue("************").valid, false);
});
