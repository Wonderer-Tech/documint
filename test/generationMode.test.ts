import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import manifest from "../package.json";
import { normalizeGenerationMode } from "../src/services/generationMode";

test("generation mode policy preserves local and defaults everything else to AI", () => {
  assert.equal(normalizeGenerationMode("local"), "local");
  assert.equal(normalizeGenerationMode(" LOCAL "), "local");
  assert.equal(normalizeGenerationMode("ai"), "ai");
  assert.equal(normalizeGenerationMode(""), "ai");
  assert.equal(normalizeGenerationMode("unknown"), "ai");
  assert.equal(normalizeGenerationMode(undefined), "ai");
});

test("manifest exposes AI and Local generation modes with AI as the compatibility default", () => {
  const property = manifest.contributes.configuration.properties[
    "aiDocGenerator.generationMode"
  ];

  assert.deepEqual(property.enum, ["ai", "local"]);
  assert.equal(property.default, "ai");
});

test("sidebar exposes Local mode while suppressing provider and authentication controls", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );

  assert.match(source, /Local Documentation — No AI/);
  assert.match(source, /id="authSection"/);
  assert.match(source, /id="providerSection"/);
  assert.match(source, /authSection\.classList\.toggle\('hidden', local\)/);
  assert.match(source, /providerSection\.classList\.toggle\('hidden', local\)/);
  assert.match(source, /generationMode:\s*generationModeSel\.value/);
  assert.match(source, /updates\.push\(\["generationMode", normalizeGenerationMode/);
});

test("Local mode is guarded before provider selection until its pipeline is connected", () => {
  const source = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );
  const localGuard = source.indexOf('if (generationMode === "local")');
  const providerSelection = source.indexOf(
    "const runSelection = resolveProviderSelection(",
  );

  assert.ok(localGuard >= 0, "missing Local generation guard");
  assert.ok(providerSelection >= 0, "missing provider-selection path");
  assert.ok(
    localGuard < providerSelection,
    "Local mode must stop before provider selection and external-provider flow",
  );
  assert.match(source, /No code was sent to an AI provider/);
});
