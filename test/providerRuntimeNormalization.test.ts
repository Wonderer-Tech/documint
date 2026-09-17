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

test("all retryable transport timeout codes retain timeout wording", () => {
  for (const code of [
    "ESOCKETTIMEDOUT",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
  ]) {
    const normalized = normalizeProviderRequestError(
      Object.assign(new Error(`transport failed: ${code}`), { code }),
      "OpenRouter",
    );
    assert.match(normalized.message, /request timed out after retrying/i, code);
  }
});

test("retryable HTTP timeout/too-early responses report exhausted retry context", () => {
  const timeout = normalizeProviderRequestError(
    { response: { status: 408, data: { message: "request timeout" } } },
    "Anthropic",
  );
  const tooEarly = normalizeProviderRequestError(
    { response: { status: 425, data: { message: "too early" } } },
    "OpenAI",
  );

  assert.match(timeout.message, /request timed out \(408\)/i);
  assert.match(timeout.message, /already retried/i);
  assert.match(tooEarly.message, /too early to process \(425\)/i);
  assert.match(tooEarly.message, /already retried/i);
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

test("Anthropic concrete provider uses canonical model capabilities", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/anthropicProvider.ts"),
    "utf8",
  );

  assert.equal(PROVIDER_DEFAULT_MODELS.anthropic, "claude-sonnet-5");
  assert.match(source, /getAnthropicModelCapabilities/);
  assert.match(source, /\.maxOutputTokens/);
  assert.match(source, /\.contextWindow/);
  assert.doesNotMatch(
    source,
    /m\.includes\("claude-sonnet-5"\)\s*\|\|\s*m\.includes\("claude-opus-5"\)/,
  );
});

test("DeepSeek concrete provider uses canonical model capabilities", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/deepseekProvider.ts"),
    "utf8",
  );

  assert.equal(PROVIDER_DEFAULT_MODELS.deepseek, "deepseek-flash");
  assert.match(source, /getDeepSeekModelCapabilities/);
  assert.match(source, /\.maxOutputTokens/);
  assert.match(source, /\.contextWindow/);
  assert.doesNotMatch(source, /return 32768;/);
});

test("custom provider keeps API keys optional for inherited raw-prompt generation", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/customProvider.ts"),
    "utf8",
  );

  assert.match(
    source,
    /protected async getApiKey\(\): Promise<string> \{\s*return \(await this\.secretManager\.getApiKey\(this\.name\)\) \|\| "";\s*\}/,
  );
  assert.match(source, /const apiKey = await this\.getApiKey\(\);/);
});

test("custom provider resolves endpoint locality from current settings", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/customProvider.ts"),
    "utf8",
  );

  assert.match(
    source,
    /get isLocal\(\): boolean \{\s*return this\.getEndpointPolicy\(\)\.isLocal;\s*\}/,
  );
  assert.doesNotMatch(source, /this\.isLocal\s*=/);
});
