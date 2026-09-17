import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GenerationRunContextScope } from "../src/services/generationRunContext";

test("generation run context isolates overlapping explicit context windows", async () => {
  const scope = new GenerationRunContextScope();

  const first = scope.run(64000, async () => {
    assert.equal(scope.getContextWindow(), 64000);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(scope.getContextWindow(), 64000);
    return scope.getContextWindow();
  });

  const second = scope.run(32000, async () => {
    assert.equal(scope.getContextWindow(), 32000);
    await Promise.resolve();
    assert.equal(scope.getContextWindow(), 32000);
    return scope.getContextWindow();
  });

  assert.deepEqual(await Promise.all([first, second]), [64000, 32000]);
  assert.equal(scope.getContextWindow(), undefined);
});

test("generation run context ignores invalid overrides", async () => {
  const scope = new GenerationRunContextScope();

  await scope.run(Number.NaN, async () => {
    assert.equal(scope.getContextWindow(), undefined);
  });
  await scope.run(-1, async () => {
    assert.equal(scope.getContextWindow(), undefined);
  });
});

test("extension commits generation cache identity only after sanitized success", () => {
  const source = readFileSync("src/extension.ts", "utf-8");
  const prepareIndex = source.indexOf("prepareGenerationCacheCompatibility(");
  const generateIndex = source.indexOf("docGenerator.generateDocumentation(");
  const sanitizeIndex = source.indexOf("await sanitizeGeneratedOutputs(outputPaths);");
  const commitIndex = source.indexOf("await commitGenerationCacheCompatibility(");

  assert.ok(prepareIndex >= 0, "cache preparation must occur before generation");
  assert.ok(generateIndex > prepareIndex, "generation must follow cache preparation");
  assert.ok(sanitizeIndex > generateIndex, "output sanitization must follow generation");
  assert.ok(commitIndex > sanitizeIndex, "cache identity must commit only after sanitized success");
  assert.equal(source.includes("ensureGenerationCacheCompatibility("), false);
});

test("raw prompt metadata path consumes the outer generation run context", () => {
  const source = readFileSync(
    "src/providers/providerMetadataDecorator.ts",
    "utf-8",
  );

  assert.match(source, /generationRunContext\.getContextWindow\(\)/);
  assert.match(
    source,
    /provider\.generateMarkdownFromPrompt[\s\S]*requestContextWindow\.run/,
  );
});
