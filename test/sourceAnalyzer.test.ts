import test from "node:test";
import assert from "node:assert/strict";
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

test("JS/TS re-exports and dynamic imports become dependency evidence", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/index.ts",
      "typescript",
      [
        'export { feature as renamed } from "./feature";',
        'export * from "./shared";',
        'const loadLazy = () => import("./lazy");',
        'import React from "react";',
      ].join("\n"),
    ),
    file("src/feature.ts", "typescript", "export const feature = 1;"),
    file("src/shared.ts", "typescript", "export const shared = 1;"),
    file("src/lazy.ts", "typescript", "export default 1;"),
  ]);

  const index = project.files.find((item) => item.path === "src/index.ts");
  assert.ok(index);
  assert.deepEqual(
    index.imports.map((item) => item.source),
    ["./feature", "./shared", "./lazy", "react"],
  );
  assert.deepEqual(index.imports[0].symbols, ["feature"]);
  assert.deepEqual(project.entryPoints, ["src/index.ts"]);
  assert.deepEqual(project.externalDependencies, ["react"]);
  assert.deepEqual(
    project.internalDependencies.map((edge) => [edge.from, edge.to]),
    [
      ["src/index.ts", "src/feature.ts"],
      ["src/index.ts", "src/shared.ts"],
      ["src/index.ts", "src/lazy.ts"],
    ],
  );
});

test("JS/TS exported arrow functions are classified as functions", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "src/handlers.ts",
      "typescript",
      [
        "export const handle = async (value: string): Promise<string> => value;",
        "const local = (value: number) => value * 2;",
        "export const LIMIT = 5;",
      ].join("\n"),
    ),
  );

  const handle = analysis.symbols.find((symbol) => symbol.name === "handle");
  const local = analysis.symbols.find((symbol) => symbol.name === "local");
  const limit = analysis.symbols.find((symbol) => symbol.name === "LIMIT");

  assert.deepEqual(
    handle && { kind: handle.kind, exported: handle.exported },
    { kind: "function", exported: true },
  );
  assert.deepEqual(
    local && { kind: local.kind, exported: local.exported },
    { kind: "function", exported: false },
  );
  assert.equal(limit?.kind, "constant");
});

test("Python import aliases are normalized to source names", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "app.py",
      "python",
      [
        "from helpers import load as local_load, save",
        "import numpy as np, pandas as pd",
      ].join("\n"),
    ),
  );

  assert.deepEqual(analysis.imports, [
    { line: 1, source: "helpers", symbols: ["load", "save"] },
    { line: 2, source: "numpy", symbols: [] },
    { line: 2, source: "pandas", symbols: [] },
  ]);
});

test("Go grouped imports are parsed only inside an import block", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "main.go",
      "go",
      [
        "package main",
        "import (",
        '  "fmt"',
        '  alias "example.com/pkg"',
        ")",
        'var text = "not-an-import"',
        'import "os"',
      ].join("\n"),
    ),
  );

  assert.deepEqual(
    analysis.imports.map((item) => item.source),
    ["fmt", "example.com/pkg", "os"],
  );
  assert.equal(
    analysis.imports.some((item) => item.source === "not-an-import"),
    false,
  );
});

test("Rust restricted/public async functions are detected", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "src/lib.rs",
      "rust",
      [
        "pub async fn fetch_data(id: u64) -> String { String::new() }",
        "pub(crate) unsafe fn internal_helper() {}",
        "pub struct Service;",
      ].join("\n"),
    ),
  );

  assert.deepEqual(
    analysis.symbols.map((symbol) => [symbol.name, symbol.kind]),
    [
      ["fetch_data", "function"],
      ["internal_helper", "function"],
      ["Service", "struct"],
    ],
  );
});
