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

test("sidebar keeps Local mode focused on controls that affect Local output", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );

  assert.match(source, /Local Documentation — No AI/);
  assert.match(source, /id="authSection"/);
  assert.match(source, /id="providerSection"/);
  assert.match(source, /id="depthField"/);
  assert.match(source, /id="generateBtnText"/);
  assert.match(source, /authSection\.classList\.toggle\('hidden', local\)/);
  assert.match(source, /providerSection\.classList\.toggle\('hidden', local\)/);
  assert.match(source, /depthField\.classList\.toggle\('hidden', local\)/);
  assert.match(source, /Generate Local Documentation/);
  assert.match(source, /generationMode:\s*generationModeSel\.value/);
  assert.match(source, /updates\.push\(\["generationMode", normalizeGenerationMode/);
  assert.doesNotMatch(source, /state\.isGenerating \|\| localPending/);
  assert.doesNotMatch(source, /if \(isLocalMode\(\)\) return;/);
});

test("Local mode executes its own generator before provider selection", () => {
  const source = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );
  const generatorSource = readFileSync(
    join(process.cwd(), "src/services/localDocumentationGenerator.ts"),
    "utf8",
  );
  const localBranch = source.indexOf('if (generationMode === "local")');
  const providerSelection = source.indexOf(
    "const runSelection = resolveProviderSelection(",
  );

  assert.ok(localBranch >= 0, "missing Local generation branch");
  assert.ok(providerSelection >= 0, "missing provider-selection path");
  assert.ok(
    localBranch < providerSelection,
    "Local mode must branch before provider selection and external-provider flow",
  );

  const localSource = source.slice(localBranch, providerSelection);
  assert.match(localSource, /localDocGenerator\.generateDocumentation/);
  assert.doesNotMatch(localSource, /resolveRunProvider\(/);
  assert.doesNotMatch(localSource, /ensureGenerationAllowed\(/);
  assert.doesNotMatch(localSource, /prepareGenerationCacheCompatibility\(/);
  assert.doesNotMatch(localSource, /sanitizeGeneratedOutputs\(outputPaths\)/);
  assert.match(generatorSource, /sanitizeGeneratedOutputs\(outputPaths\)/);
});

test("Local File and Folder scopes pass exact target paths to the scanner", () => {
  const generatorSource = readFileSync(
    join(process.cwd(), "src/services/localDocumentationGenerator.ts"),
    "utf8",
  );
  const extensionSource = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );

  assert.match(
    generatorSource,
    /scanWorkspace\(\s*workspaceFolder,\s*options\.targetPaths,\s*\)/,
  );
  assert.match(
    extensionSource,
    /scope: "current-file",\s*targetPaths: \[uris\[0\]\.fsPath\]/,
  );
  assert.match(
    extensionSource,
    /scope: "folder",\s*targetPaths: \[uris\[0\]\.fsPath\]/,
  );
});
