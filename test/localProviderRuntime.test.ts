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


test("sidebar discovers local models through the fixed local-provider bridge", () => {
  const host = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );
  const template = readFileSync(
    join(process.cwd(), "src/views/sidebarTemplate.ts"),
    "utf8",
  );
  const client = readFileSync(
    join(process.cwd(), "src/views/sidebarClientScript.ts"),
    "utf8",
  );

  assert.match(host, /case "discover-local-models":/);
  assert.match(host, /discoverLocalProviderModels\(provider\)/);
  assert.match(host, /type: "local-models"/);

  assert.match(template, /list="localModelSuggestions"/);
  assert.match(template, /id="localModelSuggestions"/);
  assert.match(template, /id="localModelStatus"/);

  assert.match(client, /function requestLocalProviderModels\(/);
  assert.match(client, /type: 'discover-local-models'/);
  assert.match(client, /case 'local-models':/);
  assert.match(client, /function applyLocalProviderModels\(/);
  assert.match(client, /models\.length === 1 && !modelInput\.value\.trim\(\)/);
  assert.match(client, /You can still enter a model ID manually/);
});


test("local provider and model discovery never follow redirects away from loopback", () => {
  const runtime = readFileSync(
    join(process.cwd(), "src/providers/localOpenAICompatibleProvider.ts"),
    "utf8",
  );
  const discovery = readFileSync(
    join(process.cwd(), "src/providers/localProviderDiscovery.ts"),
    "utf8",
  );

  assert.match(runtime, /maxRedirects:\s*0/);
  assert.match(runtime, /proxy:\s*false/);
  assert.match(discovery, /maxRedirects:\s*0/);
  assert.match(discovery, /proxy:\s*false/);
  assert.match(discovery, /maxContentLength:\s*1_000_000/);
});
