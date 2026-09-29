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
  assert.ok(manifest.keywords.includes("local documentation"));
  assert.ok(manifest.keywords.includes("offline documentation"));
  assert.match(manifest.description, /locally with no AI/i);
  assert.equal(manifest.categories.includes("Formatters"), false);
});

test("manifest distinguishes shared settings from AI-only controls", () => {
  const properties = manifest.contributes.configuration.properties;

  assert.match(properties["documint.aiProvider"].description, /AI mode only/i);
  assert.match(properties["documint.model"].description, /AI mode only/i);
  assert.match(
    properties["documint.documentationDepth"].description,
    /AI mode only/i,
  );
  assert.match(properties["documint.outputFormat"].description, /both AI and Local/i);
  assert.match(properties["documint.targetLanguages"].description, /both AI and Local/i);
});

test("manifest relies on automatic command/view activation for the current VS Code engine", () => {
  const activationEvents = (manifest as { activationEvents?: string[] }).activationEvents;

  assert.equal(activationEvents, undefined);
  assert.equal(manifest.engines.vscode, "^1.110.0");
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

  for (const command of contributed) {
    assert.ok(registered.has(command), `contributed command is not registered: ${command}`);
  }

  for (const command of [
    "aiDocGenerator.pickAndGenerateFile",
    "aiDocGenerator.pickAndGenerateFolder",
  ]) {
    assert.ok(registered.has(command), `internal scope command is not registered: ${command}`);
    assert.equal(
      contributed.has(command),
      false,
      `internal scope command must stay out of the Command Palette: ${command}`,
    );
  }
});

test("manifest prevents negative provider request spacing", () => {
  const property = manifest.contributes.configuration.properties[
    "documint.rateLimitDelay"
  ];
  assert.equal(property.minimum, 0);
  assert.equal(property.default, 1000);
});

test("default target language list includes the scanner's broad source types", () => {
  const languages = new Set(
    manifest.contributes.configuration.properties[
      "documint.targetLanguages"
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


test("manifest uses a provider-friendly default AI concurrency", () => {
  const property = manifest.contributes.configuration.properties[
    "documint.concurrentRequests"
  ];

  assert.equal(property.default, 5);
  assert.equal(property.minimum, 1);
  assert.equal(property.maximum, 15);
});


test("AI generator runtime fallback matches the manifest concurrency default", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/docGeneratorBase.ts"),
    "utf8",
  );

  assert.match(
    source,
    /configuration\.get<number>\("concurrentRequests"\)\s*\?\?\s*5/,
  );
  assert.match(
    source,
    /Number\.isFinite\(parsed\) \? Math\.floor\(parsed\) : 5/,
  );
  assert.match(
    source,
    /Math\.min\(Math\.max\(bounded, 1\), Math\.min\(totalFiles, 15\)\)/,
  );
});


test("legacy aiDocGenerator settings remain deprecated compatibility aliases", () => {
  const properties = manifest.contributes.configuration.properties as Record<
    string,
    { deprecationMessage?: string }
  >;

  for (const key of [
    "generationMode",
    "aiProvider",
    "model",
    "documentationDepth",
    "outputFormat",
    "targetLanguages",
    "maxTokens",
    "temperature",
    "rateLimitDelay",
    "concurrentRequests",
    "excludePatterns",
    "customApiEndpoint",
  ]) {
    assert.ok(properties[`documint.${key}`], `missing documint.${key}`);
    assert.match(
      properties[`aiDocGenerator.${key}`].deprecationMessage ?? "",
      new RegExp(`Use documint\\.${key}`),
    );
  }
});


test("manifest exposes Ollama and LM Studio as explicit local provider presets", () => {
  const properties = manifest.contributes.configuration.properties;
  const provider = properties["documint.aiProvider"];

  assert.deepEqual(provider.enum, [
    "openai",
    "anthropic",
    "openrouter",
    "deepseek",
    "ollama",
    "lmstudio",
    "custom",
  ]);
  assert.match(provider.description, /Ollama and LM Studio are local loopback presets/i);
  assert.match(
    properties["aiDocGenerator.aiProvider"].deprecationMessage,
    /Use documint\.aiProvider/,
  );
});
