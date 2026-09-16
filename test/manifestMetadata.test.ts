import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../package.json";

test("marketplace metadata advertises implemented documentation capabilities", () => {
  const searchable = [
    manifest.description,
    ...manifest.keywords,
  ].join(" ").toLowerCase();

  assert.doesNotMatch(searchable, /\bdocstring\b/);
  assert.doesNotMatch(searchable, /\bjsdoc\b/);
  assert.doesNotMatch(searchable, /\buml\b/);
  assert.ok(manifest.keywords.includes("architecture documentation"));
  assert.ok(manifest.keywords.includes("dependency graph"));
  assert.equal(manifest.categories.includes("Formatters"), false);
});

test("command activation events cover contributed command-palette entry points", () => {
  const activationEvents = new Set(manifest.activationEvents);
  assert.ok(activationEvents.has("onCommand:aiDocGenerator.generateDocumentation"));
  assert.ok(activationEvents.has("onCommand:aiDocGenerator.configureApiKey"));
  assert.ok(activationEvents.has("onCommand:aiDocGenerator.clearCache"));
  assert.ok(activationEvents.has("onCommand:aiDocGenerator.cancelGeneration"));
});

test("manifest prevents negative provider request spacing", () => {
  const property = manifest.contributes.configuration.properties[
    "aiDocGenerator.rateLimitDelay"
  ];
  assert.equal(property.minimum, 0);
  assert.equal(property.default, 1000);
});

test("default target language list includes the scanner's broad source types", () => {
  const languages = new Set(
    manifest.contributes.configuration.properties[
      "aiDocGenerator.targetLanguages"
    ].default,
  );

  for (const language of [
    "typescript",
    "javascript",
    "python",
    "java",
    "c",
    "cpp",
    "csharp",
    "go",
    "rust",
    "php",
    "ruby",
    "swift",
    "kotlin",
    "scala",
    "shell",
    "yaml",
    "json",
    "xml",
    "html",
    "css",
    "scss",
    "sql",
  ]) {
    assert.ok(languages.has(language), `missing default language: ${language}`);
  }
});
