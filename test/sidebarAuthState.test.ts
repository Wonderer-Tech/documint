import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const providerSource = readFileSync(
  join(process.cwd(), "src/views/sidebarProvider.ts"),
  "utf8",
);
const styleSource = readFileSync(
  join(process.cwd(), "src/views/sidebarStyles.ts"),
  "utf8",
);
const clientSource = readFileSync(
  join(process.cwd(), "src/views/sidebarClientScript.ts"),
  "utf8",
);

test("custom provider renders a neutral optional API-key state", () => {
  assert.match(styleSource, /\.auth-status\.optional/);
  assert.match(clientSource, /selectedProvider === 'custom'/);
  assert.match(clientSource, /authText\.textContent = 'API Key optional'/);
  assert.match(
    clientSource,
    /setApiKeyStatus\(s\.apiKeyConfigured, s\.settings && s\.settings\.provider\)/,
  );
  assert.match(clientSource, /setApiKeyStatus\(msg\.configured, msg\.provider\)/);
});

test("provider switches refresh Secret Storage status for the selected provider", () => {
  assert.match(
    providerSource,
    /if \(typeof payload\.provider === "string"\) \{\s*await this\._refreshSelectedProviderApiKeyStatus\(\);/,
  );
  assert.match(
    providerSource,
    /const key = await this\._secretManager\.getApiKey\(provider\);/,
  );
  assert.match(providerSource, /this\.updateApiKeyStatus\(!!key, provider\)/);
});

test("extension API-key refresh carries provider identity to the sidebar", () => {
  const source = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );

  assert.match(source, /sidebarProvider\.updateApiKeyStatus\(!!apiKey, provider\)/);
});
