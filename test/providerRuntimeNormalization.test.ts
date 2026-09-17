import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeProviderRequestError } from "../src/providers/providerHttpError";
import { PROVIDER_DEFAULT_MODELS } from "../src/providers/providerDefaults";

test("Axios-style cancellation with request metadata stays cancelled", () => {
  const cancelled = Object.assign(new Error("canceled"), {
    name: "CanceledError",
    code: "ERR_CANCELED",
    request: { readyState: 4 },
  });

  const normalized = normalizeProviderRequestError(cancelled, "OpenAI");
  assert.equal(normalized, cancelled);
  assert.equal(normalized.name, "CanceledError");
});

test("Axios-style timeout with request metadata is reported as timeout", () => {
  const timeout = Object.assign(new Error("timeout of 300000ms exceeded"), {
    code: "ECONNABORTED",
    request: { readyState: 4 },
  });

  const normalized = normalizeProviderRequestError(timeout, "DeepSeek");
  assert.match(normalized.message, /DeepSeek request timed out after retrying/i);
});

test("OpenAI and DeepSeek provider call paths use the shared error normalizer", () => {
  for (const filename of ["openaiProvider.ts", "deepseekProvider.ts"]) {
    const source = readFileSync(
      join(process.cwd(), "src/providers", filename),
      "utf8",
    );

    assert.match(source, /normalizeProviderRequestError/);
    assert.doesNotMatch(source, /import axios, \{ AxiosError \}/);
    assert.doesNotMatch(source, /if \(axErr\.request\)/);
  }
});

test("OpenAI concrete provider uses the shared default model source", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/openaiProvider.ts"),
    "utf8",
  );

  assert.equal(PROVIDER_DEFAULT_MODELS.openai, "gpt-5.4-nano");
  assert.match(
    source,
    /protected defaultModel\(\): string \{\s*return PROVIDER_DEFAULT_MODELS\.openai;\s*\}/,
  );
});
