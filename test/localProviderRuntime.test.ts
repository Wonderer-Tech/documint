import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("provider factory constructs the shared local OpenAI-compatible runtime", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/providerFactory.ts"),
    "utf8",
  );

  assert.match(source, /case "ollama":/);
  assert.match(source, /case "lmstudio":/);
  assert.match(source, /new LocalOpenAICompatibleProvider\(/);
});

test("local provider runtime is keyless and uses loopback preset policy", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/localOpenAICompatibleProvider.ts"),
    "utf8",
  );

  assert.match(source, /public readonly isLocal = true/);
  assert.match(source, /getLocalPresetDefinition\(this\.name\)/);
  assert.match(source, /LOCAL_PROVIDER_REQUEST_TIMEOUT_MS/);
  assert.doesNotMatch(source, /Authorization:/);
  assert.match(source, /localPresetModelRequiredMessage\(this\.name\)/);
});

test("extension keeps Ollama and LM Studio outside cloud-consent and API-key flows", () => {
  const source = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );

  assert.match(
    source,
    /provider === "ollama" \|\| provider === "lmstudio"\) \{\s*return false;/,
  );
  assert.match(
    source,
    /providerName === "ollama" \|\| providerName === "lmstudio"\)[\s\S]*!modelName/,
  );
  assert.match(source, /localPresetModelRequiredMessage\(providerName\)/);
  assert.match(
    source,
    /targetProvider === "ollama"[\s\S]*targetProvider === "lmstudio"[\s\S]*does not require an API key/,
  );
});

test("sidebar exposes local presets and requires a local model without showing auth", () => {
  const template = readFileSync(
    join(process.cwd(), "src/views/sidebarTemplate.ts"),
    "utf8",
  );
  const client = readFileSync(
    join(process.cwd(), "src/views/sidebarClientScript.ts"),
    "utf8",
  );

  assert.match(template, /value="ollama">Ollama — Local/);
  assert.match(template, /value="lmstudio">LM Studio — Local/);
  assert.match(client, /function isLocalProvider\(/);
  assert.match(client, /authSection\.classList\.toggle\('hidden', local \|\| localProvider\)/);
  assert.match(client, /function validateLocalProviderModelForRun\(/);
  assert.match(client, /e\.g\. qwen3:8b/);
  assert.match(client, /Enter model ID served by LM Studio/);
});
