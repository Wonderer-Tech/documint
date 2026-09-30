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

test("manifest exposes AI and Local generation modes with Local as the new-install default", () => {
  const properties = manifest.contributes.configuration.properties;
  const property = properties["documint.generationMode"];
  const legacy = properties["aiDocGenerator.generationMode"];

  assert.deepEqual(property.enum, ["ai", "local"]);
  assert.equal(property.default, "local");
  assert.match(legacy.deprecationMessage, /Use documint\.generationMode/);
});

test("sidebar keeps Local mode focused on controls that affect Local output", () => {
  const providerSource = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );
  const templateSource = readFileSync(
    join(process.cwd(), "src/views/sidebarTemplate.ts"),
    "utf8",
  );
  const clientSource = readFileSync(
    join(process.cwd(), "src/views/sidebarClientScript.ts"),
    "utf8",
  );
  const source =
    providerSource + "\n" + templateSource + "\n" + clientSource;

  assert.match(source, /Local Documentation — No AI/);
  assert.match(source, /id="authSection"/);
  assert.match(source, /id="providerSection"/);
  assert.match(source, /id="depthField"/);
  assert.match(source, /id="generateBtnText"/);
  assert.match(
    clientSource,
    /authSection\.classList\.toggle\('hidden', local \|\| localProvider\)/,
  );
  assert.match(
    clientSource,
    /providerSection\.classList\.toggle\('hidden', local\)/,
  );
  assert.match(
    clientSource,
    /depthField\.classList\.toggle\('hidden', local\)/,
  );
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


test("sidebar initial state matches the Local-first manifest default", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarProvider.ts"),
    "utf8",
  );

  assert.match(source, /generationMode:\s*"local"/);
});


test("sidebar first paint matches the Local-first default", () => {
  const source = readFileSync(
    join(process.cwd(), "src/views/sidebarTemplate.ts"),
    "utf8",
  );

  assert.match(
    source,
    /<option value="local" selected>Local Documentation — No AI<\/option>/,
  );
  assert.match(source, /class="section hidden" id="authSection"/);
  assert.match(source, /class="section hidden" id="providerSection"/);
  assert.match(source, /class="field hidden" id="depthField"/);
  assert.match(source, /id="localModeHelp">Runs entirely on this machine/);
  assert.match(
    source,
    /<span id="generateBtnText">Generate Local Documentation<\/span>/,
  );
});
