import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

test("manifest commands stay aligned with runtime registration and internal scope commands", () => {
  const source = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );
  const registered = new Set(
    [...source.matchAll(/vscode\.commands\.registerCommand\(\s*["']([^"']+)["']/g)].map(
      (match) => match[1],
    ),
  );
  const contributed = new Set(
    manifest.contributes.commands.map((entry) => entry.command),
  );
  const activationEvents = new Set(manifest.activationEvents);

  for (const command of contributed) {
    assert.ok(registered.has(command), `contributed command is not registered: ${command}`);
    assert.ok(
      activationEvents.has(`onCommand:${command}`),
      `contributed command has no activation event: ${command}`,
    );
  }

  for (const command of [
    "aiDocGenerator.pickAndGenerateFile",
    "aiDocGenerator.pickAndGenerateFolder",
  ]) {
    assert.ok(registered.has(command), `internal scope command is not registered: ${command}`);
    assert.ok(
      activationEvents.has(`onCommand:${command}`),
      `internal scope command has no activation event: ${command}`,
    );
    assert.equal(
      contributed.has(command),
      false,
      `internal scope command must stay out of the Command Palette: ${command}`,
    );
  }
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
