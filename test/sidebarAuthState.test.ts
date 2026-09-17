import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("custom provider renders a neutral optional API-key state", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );

  assert.match(source, /\.auth-status\.optional/);
  assert.match(source, /selectedProvider === 'custom'/);
  assert.match(source, /authText\.textContent = 'API Key optional'/);
  assert.match(source, /setApiKeyStatus\(s\.apiKeyConfigured, s\.settings && s\.settings\.provider\)/);
  assert.match(source, /setApiKeyStatus\(msg\.configured, msg\.provider\)/);
});

test("provider switches refresh Secret Storage status for the selected provider", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );

  assert.match(
    source,
    /if \(typeof payload\.provider === "string"\) \{\s*await this\._refreshSelectedProviderApiKeyStatus\(\);/,
  );
  assert.match(
    source,
    /const key = await this\._secretManager\.getApiKey\(provider\);/,
  );
  assert.match(source, /this\.updateApiKeyStatus\(!!key, provider\)/);
});

test("extension API-key refresh carries provider identity to the sidebar", () => {
  const source = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );

  assert.match(source, /sidebarProvider\.updateApiKeyStatus\(!!apiKey, provider\)/);
});
