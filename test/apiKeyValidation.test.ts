import test from "node:test";
import assert from "node:assert/strict";
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

test("API key validation rejects obvious invalid values", () => {
  assert.equal(validateApiKeyValue("").valid, false);
  assert.equal(validateApiKeyValue("short").valid, false);
  assert.equal(validateApiKeyValue("your-api-key").valid, false);
  assert.equal(validateApiKeyValue("sk-...").valid, false);
  assert.equal(validateApiKeyValue("abc def ghi jkl").valid, false);
  assert.equal(validateApiKeyValue("************").valid, false);
});
