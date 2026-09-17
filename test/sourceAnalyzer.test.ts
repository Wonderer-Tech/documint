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

test("extensionless JS/TS imports resolve modern module extensions and index files", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/main.ts",
      "typescript",
      [
        'import { esm } from "./esm";',
        'import { common } from "./common";',
        'import { typed } from "./typed";',
        'import { legacy } from "./legacy";',
        'import { feature } from "./feature";',
      ].join("\n"),
    ),
    file("src/esm.mjs", "javascript", "export const esm = true;"),
    file("src/common.cjs", "javascript", "exports.common = true;"),
    file("src/typed.mts", "typescript", "export const typed = true;"),
    file("src/legacy.cts", "typescript", "export const legacy = true;"),
    file("src/feature/index.mjs", "javascript", "export const feature = true;"),
  ]);

  assert.deepEqual(
    project.internalDependencies.map((edge) => [edge.source, edge.to]),
    [
      ["./esm", "src/esm.mjs"],
      ["./common", "src/common.cjs"],
      ["./typed", "src/typed.mts"],
      ["./legacy", "src/legacy.cts"],
      ["./feature", "src/feature/index.mjs"],
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

test("JS/TS methods and namespace imports are normalized", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "src/service.ts",
      "typescript",
      [
        'import DefaultThing, * as Utils from "./utils";',
        'import { type Config, run as execute } from "./runtime";',
        "export class Service {",
        "  public async run(value: string): Promise<void> {",
        "  }",
        "  constructor() {",
        "  }",
        "}",
        "if (ready) {",
        "}",
      ].join("\n"),
    ),
  );

  assert.deepEqual(analysis.imports[0].symbols, ["DefaultThing", "Utils"]);
  assert.deepEqual(analysis.imports[1].symbols, ["Config", "run"]);
  assert.deepEqual(
    analysis.symbols
      .filter((symbol) => symbol.kind === "method")
      .map((symbol) => symbol.name),
    ["run", "constructor"],
  );
  assert.equal(
    analysis.symbols.some((symbol) => symbol.name === "if"),
    false,
  );
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

test("Python relative imports resolve to sibling and parent modules", () => {
  const project = analyzer.analyzeProject([
    file(
      "pkg/sub/app.py",
      "python",
      ["from . import helpers", "from ..shared import load"].join("\n"),
    ),
    file("pkg/sub/helpers.py", "python", "def helper(): pass"),
    file("pkg/shared.py", "python", "def load(): pass"),
  ]);

  const app = project.files.find((item) => item.path === "pkg/sub/app.py");
  assert.ok(app);
  assert.deepEqual(
    app.imports.map((item) => [item.source, item.resolvedPath]),
    [
      [".helpers", "pkg/sub/helpers.py"],
      ["..shared", "pkg/shared.py"],
    ],
  );
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

test("C/C++ local headers become internal edges and system headers stay external", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/main.c",
      "c",
      ['#include "config.h"', "#include <stdio.h>"].join("\n"),
    ),
    file("src/config.h", "c", "#define ENABLED 1"),
  ]);

  assert.deepEqual(project.internalDependencies, [
    { from: "src/main.c", to: "src/config.h", source: "./config.h" },
  ]);
  assert.deepEqual(project.externalDependencies, ["stdio.h"]);
});

test("Rust module declarations resolve module files", () => {
  const project = analyzer.analyzeProject([
    file("src/lib.rs", "rust", "pub mod service;"),
    file("src/service.rs", "rust", "mod helper;"),
    file("src/service/helper.rs", "rust", "pub fn run() {}"),
  ]);

  assert.deepEqual(
    project.internalDependencies.map((edge) => [edge.from, edge.to]),
    [
      ["src/lib.rs", "src/service.rs"],
      ["src/service.rs", "src/service/helper.rs"],
    ],
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

test("TODO markers are collected from comments but ignored inside strings", () => {
  const typescript = analyzer.analyzeFile(
    file(
      "src/todos.ts",
      "typescript",
      [
        'const fake = "TODO: not a real task";',
        "const value = 1; // FIXME: real task",
        "/* HACK: temporary workaround */",
      ].join("\n"),
    ),
  );
  const python = analyzer.analyzeFile(
    file(
      "todos.py",
      "python",
      ['fake = "TODO: not real"', "# TODO: real python task"].join("\n"),
    ),
  );

  assert.deepEqual(
    typescript.todos.map((todo) => todo.text),
    ["FIXME: real task", "HACK: temporary workaround"],
  );
  assert.deepEqual(
    python.todos.map((todo) => todo.text),
    ["TODO: real python task"],
  );
});

test("relative imports resolve supported non-code assets", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/index.ts",
      "typescript",
      ['import schema from "./schema";', 'import "./styles";'].join("\n"),
    ),
    file("src/schema.json", "json", "{}"),
    file("src/styles.css", "css", "body {}"),
  ]);

  assert.deepEqual(
    project.internalDependencies.map((edge) => edge.to),
    ["src/schema.json", "src/styles.css"],
  );
});
