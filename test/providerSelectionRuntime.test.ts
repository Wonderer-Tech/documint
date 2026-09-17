import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveProviderSelection } from "../src/providers/providerSelection";

test("provider selection replaces stale cross-provider model ids", () => {
  assert.deepEqual(resolveProviderSelection("anthropic", "gpt-5.4-nano"), {
    provider: "anthropic",
    model: "claude-sonnet-5",
  });
  assert.deepEqual(resolveProviderSelection("deepseek", "claude-sonnet-5"), {
    provider: "deepseek",
    model: "deepseek-flash",
  });
  assert.deepEqual(resolveProviderSelection("openrouter", "gpt-5.4-nano"), {
    provider: "openrouter",
    model: "openai/gpt-4o",
  });
  assert.deepEqual(resolveProviderSelection("openai", "claude-opus-5"), {
    provider: "openai",
    model: "gpt-5.4-nano",
  });
});

test("provider selection preserves routed and custom model ids", () => {
  assert.deepEqual(
    resolveProviderSelection("openrouter", "anthropic/claude-sonnet-5"),
    {
      provider: "openrouter",
      model: "anthropic/claude-sonnet-5",
    },
  );
  assert.deepEqual(resolveProviderSelection("custom", "local-model"), {
    provider: "custom",
    model: "local-model",
  });
  assert.deepEqual(resolveProviderSelection("custom", ""), {
    provider: "custom",
    model: "default",
  });
});

test("invalid provider values canonicalize before model selection", () => {
  assert.deepEqual(resolveProviderSelection(" UNKNOWN ", "claude-sonnet-5"), {
    provider: "openai",
    model: "gpt-5.4-nano",
  });
});

test("extension uses canonical model for both cache identity and generation", () => {
  const source = readFileSync(join(process.cwd(), "src/extension.ts"), "utf8");

  assert.match(source, /const runSelection = resolveProviderSelection\(/);
  assert.match(source, /model: modelName,[\s\S]*prepareGenerationCacheCompatibility/);
  assert.match(
    source,
    /docGenerator\.generateDocumentation\([\s\S]*provider: providerName,[\s\S]*model: modelName/,
  );
});

test("sidebar delegates provider-switch model correction to the shared host policy", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );

  assert.match(source, /resolveProviderSelection\(/);
  assert.match(source, /type: "settings-normalized"/);
  assert.match(source, /case 'settings-normalized':/);
  assert.doesNotMatch(source, /var providerDefaults = \{\s*deepseek:/);
  assert.match(source, /claude-sonnet-5/);
});
