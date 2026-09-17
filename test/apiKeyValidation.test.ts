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
    /secretStorage\.store\(\s*SecretStorageManager\.secretKey\(provider\),\s*apiKey\.trim\(\),?\s*\)/,
  );
});

test("secret storage normalizes provider names for every key operation", () => {
  const source = readFileSync(
    join(process.cwd(), "src/config/secretStorage.ts"),
    "utf8",
  );

  assert.match(
    source,
    /private static secretKey\(provider: string\): string \{\s*return `\$\{this\.normalizeProvider\(provider\)\}-api-key`;\s*\}/,
  );
  assert.match(
    source,
    /secretStorage\.get\(\s*SecretStorageManager\.secretKey\(provider\),?\s*\)/,
  );
  assert.match(
    source,
    /secretStorage\.delete\(SecretStorageManager\.secretKey\(provider\)\)/,
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
