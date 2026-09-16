import test from "node:test";
import assert from "node:assert/strict";
import {
  PROVIDER_DEFAULT_MODELS,
  resolveProviderSelectionModel,
} from "../src/providers/providerDefaults";

test("provider defaults stay aligned with current runtime choices", () => {
  assert.equal(PROVIDER_DEFAULT_MODELS.openai, "gpt-5.4-nano");
  assert.equal(PROVIDER_DEFAULT_MODELS.anthropic, "claude-sonnet-5");
  assert.equal(PROVIDER_DEFAULT_MODELS.deepseek, "deepseek-flash");
  assert.equal(PROVIDER_DEFAULT_MODELS.openrouter, "openai/gpt-4o");
});

test("provider selection replaces clearly foreign stale models", () => {
  assert.equal(
    resolveProviderSelectionModel("anthropic", "gpt-5.4-nano"),
    "claude-sonnet-5",
  );
  assert.equal(
    resolveProviderSelectionModel("deepseek", "claude-sonnet-5"),
    "deepseek-flash",
  );
  assert.equal(
    resolveProviderSelectionModel("openrouter", "gpt-5.4-nano"),
    "openai/gpt-4o",
  );
});

test("provider selection preserves native or routed model ids", () => {
  assert.equal(
    resolveProviderSelectionModel("openai", "gpt-5.4-mini"),
    "gpt-5.4-mini",
  );
  assert.equal(
    resolveProviderSelectionModel("anthropic", "claude-opus-5"),
    "claude-opus-5",
  );
  assert.equal(
    resolveProviderSelectionModel("openrouter", "anthropic/claude-sonnet-5"),
    "anthropic/claude-sonnet-5",
  );
});
