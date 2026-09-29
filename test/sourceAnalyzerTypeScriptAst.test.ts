import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../src/types";

const analyzer = new SourceAnalyzer();

function file(
  path: string,
  language: string,
  content: string,
): WorkspaceFile {
  return { path, language, content };
}

test("TypeScript multiline imports preserve symbols and internal dependency resolution", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/main.ts",
      "typescript",
      [
        "import {",
        "  alpha,",
        "  beta as renamedBeta,",
        "} from \"./dependency\";",
        "",
        "export const ready = true;",
      ].join("\n"),
    ),
    file(
      "src/dependency.ts",
      "typescript",
      [
        "export const alpha = 1;",
        "export const beta = 2;",
      ].join("\n"),
    ),
  ]);

  const main = project.files.find((item) => item.path === "src/main.ts");
  assert.ok(main);
  assert.deepEqual(main.imports, [
    {
      source: "./dependency",
      line: 1,
      symbols: ["alpha", "beta"],
      resolvedPath: "src/dependency.ts",
    },
  ]);
  assert.deepEqual(project.internalDependencies, [
    {
      from: "src/main.ts",
      to: "src/dependency.ts",
      source: "./dependency",
    },
  ]);
});

test("TypeScript AST detects exported abstract classes and class methods", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "src/providers/aiProvider.ts",
      "typescript",
      [
        "export interface AIProvider {",
        "  generate(): Promise<void>;",
        "}",
        "",
        "export abstract class BaseAIProvider implements AIProvider {",
        "  public abstract getMaxContextWindow(",
        "    model?: string,",
        "  ): number;",
        "",
        "  public async generate(): Promise<void> {",
        "    const temporary = 1;",
        "    void temporary;",
        "  }",
        "}",
      ].join("\n"),
    ),
  );

  const base = analysis.symbols.find(
    (symbol) => symbol.name === "BaseAIProvider",
  );
  assert.deepEqual(
    base && {
      kind: base.kind,
      exported: base.exported,
      scope: base.scope,
      signature: base.signature,
      line: base.line,
    },
    {
      kind: "class",
      exported: true,
      scope: "module",
      signature: "export abstract class BaseAIProvider implements AIProvider",
      line: 5,
    },
  );

  assert.equal(
    analysis.symbols.some((symbol) => symbol.name === "temporary"),
    false,
  );
  assert.equal(
    analysis.symbols.some(
      (symbol) =>
        symbol.name === "generate" &&
        symbol.kind === "method" &&
        symbol.scope === "class",
    ),
    true,
  );
});

test("TypeScript AST detects multiline functions and excludes function-local variables", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "src/example.ts",
      "typescript",
      [
        "const MODULE_LIMIT = 3;",
        "",
        "export async function buildDocumentation(",
        "  projectName: string,",
        "  fileCount: number,",
        "): Promise<string> {",
        "  const files = [];",
        "  let content = projectName;",
        "  return content + fileCount + files.length;",
        "}",
      ].join("\n"),
    ),
  );

  const fn = analysis.symbols.find(
    (symbol) => symbol.name === "buildDocumentation",
  );
  assert.ok(fn);
  assert.equal(fn.kind, "function");
  assert.equal(fn.exported, true);
  assert.equal(fn.scope, "module");
  assert.equal(fn.line, 3);
  assert.equal(
    fn.signature,
    "export async function buildDocumentation( projectName: string, fileCount: number, ): Promise<string>",
  );

  const moduleLimit = analysis.symbols.find(
    (symbol) => symbol.name === "MODULE_LIMIT",
  );
  assert.deepEqual(
    moduleLimit && {
      kind: moduleLimit.kind,
      exported: moduleLimit.exported,
      scope: moduleLimit.scope,
    },
    {
      kind: "constant",
      exported: false,
      scope: "module",
    },
  );

  assert.equal(
    analysis.symbols.some((symbol) => symbol.name === "files"),
    false,
  );
  assert.equal(
    analysis.symbols.some((symbol) => symbol.name === "content"),
    false,
  );
});

test("TypeScript AST honors explicit export lists for local declarations", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "src/public.ts",
      "typescript",
      [
        "const hiddenUntilExported = 1;",
        "function helper() {}",
        "export { hiddenUntilExported, helper };",
      ].join("\n"),
    ),
  );

  assert.equal(
    analysis.symbols.find((symbol) => symbol.name === "hiddenUntilExported")
      ?.exported,
    true,
  );
  assert.equal(
    analysis.symbols.find((symbol) => symbol.name === "helper")?.exported,
    true,
  );
});


test("DocuMint BaseAIProvider is detected from the real source file", () => {
  const source = readFileSync(
    "src/providers/aiProvider.ts",
    "utf8",
  );
  const analysis = analyzer.analyzeFile(
    file("src/providers/aiProvider.ts", "typescript", source),
  );

  const base = analysis.symbols.find(
    (symbol) => symbol.name === "BaseAIProvider",
  );
  assert.ok(base);
  assert.equal(base.kind, "class");
  assert.equal(base.exported, true);
  assert.equal(base.scope, "module");
});


test("TypeScript descriptions require explicit file docs or one documented export", () => {
  const explicit = analyzer.analyzeFile(
    file(
      "src/explicit.ts",
      "typescript",
      [
        "/**",
        " * Handles deterministic cache identity.",
        " * @file",
        " */",
        "export const CACHE_VERSION = 1;",
      ].join("\n"),
    ),
  );
  assert.deepEqual(explicit.description, {
    text: "Handles deterministic cache identity.",
    source: "file-comment",
    line: 1,
  });

  const single = analyzer.analyzeFile(
    file(
      "src/single.ts",
      "typescript",
      [
        "/** Creates provider instances from normalized names. */",
        "export class ProviderFactory {}",
      ].join("\n"),
    ),
  );
  assert.deepEqual(single.description, {
    text: "Creates provider instances from normalized names.",
    source: "declaration-comment",
    line: 1,
  });

  const ambiguous = analyzer.analyzeFile(
    file(
      "src/ambiguous.ts",
      "typescript",
      [
        "/** First exported API. */",
        "export function first() {}",
        "/** Second exported API. */",
        "export function second() {}",
      ].join("\n"),
    ),
  );
  assert.equal(ambiguous.description, undefined);
  assert.equal(
    ambiguous.symbols.find((symbol) => symbol.name === "first")?.description?.text,
    "First exported API.",
  );
});


test("TypeScript file tags can carry or precede the trusted file description", () => {
  const tagged = analyzer.analyzeFile(
    file(
      "src/tagged.ts",
      "typescript",
      [
        "/**",
        " * @file Provider selection helpers.",
        " */",
        "export const provider = \"openai\";",
      ].join("\n"),
    ),
  );
  assert.deepEqual(tagged.description, {
    text: "Provider selection helpers.",
    source: "file-comment",
    line: 1,
  });

  const standaloneTag = analyzer.analyzeFile(
    file(
      "src/tagged-later.ts",
      "typescript",
      [
        "/**",
        " * @module",
        " * Canonicalizes model metadata before caching.",
        " */",
        "export const value = 1;",
      ].join("\n"),
    ),
  );
  assert.deepEqual(standaloneTag.description, {
    text: "Canonicalizes model metadata before caching.",
    source: "file-comment",
    line: 1,
  });
});
