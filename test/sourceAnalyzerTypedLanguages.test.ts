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

test("Java and C# declarations keep class/interface/enum/struct kinds", () => {
  const java = analyzer.analyzeFile(
    file(
      "src/Service.java",
      "java",
      [
        "public class Service {",
        "public interface Worker {}",
        "public enum State { READY }",
        "public String run(int id) { return \"ok\"; }",
        "return helper();",
      ].join("\n"),
    ),
  );

  assert.deepEqual(
    java.symbols.map((symbol) => [symbol.name, symbol.kind, symbol.exported]),
    [
      ["Service", "class", true],
      ["Worker", "interface", true],
      ["State", "enum", true],
      ["run", "method", true],
    ],
  );
  assert.equal(java.symbols.some((symbol) => symbol.name === "helper"), false);

  const csharp = analyzer.analyzeFile(
    file(
      "src/Config.cs",
      "csharp",
      [
        "public struct Config {}",
        "internal interface IWorker {}",
        "private enum Mode { A }",
        "public static int Add(int a, int b) { return a + b; }",
      ].join("\n"),
    ),
  );

  assert.deepEqual(
    csharp.symbols.map((symbol) => [symbol.name, symbol.kind]),
    [
      ["Config", "struct"],
      ["IWorker", "interface"],
      ["Mode", "enum"],
      ["Add", "method"],
    ],
  );
});

test("C++ declarations distinguish class struct enum and methods", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "src/engine.cpp",
      "cpp",
      [
        "class Engine {};",
        "struct Config {};",
        "enum class Mode { Fast, Slow };",
        "int run(int value) { return value; }",
        "return helper();",
      ].join("\n"),
    ),
  );

  assert.deepEqual(
    analysis.symbols.map((symbol) => [symbol.name, symbol.kind]),
    [
      ["Engine", "class"],
      ["Config", "struct"],
      ["Mode", "enum"],
      ["run", "method"],
    ],
  );
  assert.equal(analysis.symbols.some((symbol) => symbol.name === "helper"), false);
});

test("Go export visibility follows identifier capitalization", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "service.go",
      "go",
      [
        "func Exported() {}",
        "func local() {}",
        "type Public struct {}",
        "type private struct {}",
        "type API interface {}",
      ].join("\n"),
    ),
  );

  assert.deepEqual(
    analysis.symbols.map((symbol) => [symbol.name, symbol.exported]),
    [
      ["Exported", true],
      ["local", false],
      ["Public", true],
      ["private", false],
      ["API", true],
    ],
  );
});

test("Rust use statements create internal edges and normalize external crates", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/lib.rs",
      "rust",
      [
        "pub mod service;",
        "use crate::service::Service;",
        "use serde::Serialize;",
      ].join("\n"),
    ),
    file("src/service.rs", "rust", "pub struct Service;"),
  ]);

  const lib = project.files.find((item) => item.path === "src/lib.rs");
  assert.ok(lib);
  assert.deepEqual(
    lib.imports.map((item) => item.source),
    ["./service", "crate::service::Service", "serde::Serialize"],
  );
  assert.deepEqual(project.externalDependencies, ["serde"]);
  assert.equal(
    project.internalDependencies.some(
      (edge) => edge.from === "src/lib.rs" && edge.to === "src/service.rs",
    ),
    true,
  );
});

test("Python dotted imports collapse to the external package root", () => {
  const project = analyzer.analyzeProject([
    file(
      "app.py",
      "python",
      [
        "from requests.sessions import Session",
        "import numpy.random",
        "from google.cloud import storage",
      ].join("\n"),
    ),
  ]);

  assert.deepEqual(project.externalDependencies, ["google", "numpy", "requests"]);
});


test("trusted module descriptions are extracted for Python Rust and Go", () => {
  const python = analyzer.analyzeFile(
    file(
      "app.py",
      "python",
      [
        "#!/usr/bin/env python3",
        "# module bootstrap",
        '"""Loads application configuration and starts the worker."""',
        "",
        "def run():",
        "    return True",
      ].join("\n"),
    ),
  );
  assert.deepEqual(python.description, {
    text: "Loads application configuration and starts the worker.",
    source: "module-docstring",
    line: 3,
  });

  const rust = analyzer.analyzeFile(
    file(
      "src/lib.rs",
      "rust",
      [
        "//! Shared request scheduling primitives.",
        "//! Keeps cancellation isolated per request.",
        "",
        "pub fn schedule() {}",
      ].join("\n"),
    ),
  );
  assert.deepEqual(rust.description, {
    text: "Shared request scheduling primitives. Keeps cancellation isolated per request.",
    source: "file-comment",
    line: 1,
  });

  const go = analyzer.analyzeFile(
    file(
      "worker.go",
      "go",
      [
        "// Package worker coordinates background jobs.",
        "// It exposes deterministic queue helpers.",
        "package worker",
        "",
        "func Run() {}",
      ].join("\n"),
    ),
  );
  assert.deepEqual(go.description, {
    text: "Package worker coordinates background jobs. It exposes deterministic queue helpers.",
    source: "package-comment",
    line: 1,
  });
});

test("non-module strings and unrelated Go comments are not treated as file descriptions", () => {
  const python = analyzer.analyzeFile(
    file(
      "app.py",
      "python",
      [
        "def run():",
        '    """Function docstring only."""',
        "    return True",
      ].join("\n"),
    ),
  );
  assert.equal(python.description, undefined);

  const go = analyzer.analyzeFile(
    file(
      "worker.go",
      "go",
      [
        "// Coordinates background jobs.",
        "package worker",
        "func Run() {}",
      ].join("\n"),
    ),
  );
  assert.equal(go.description, undefined);
});


test("Python environment references are detected without comment or string false positives", () => {
  const analysis = analyzer.analyzeFile(
    file(
      "app.py",
      "python",
      [
        "import os",
        'API_KEY = os.environ["API_KEY"]',
        "region = os.environ.get('REGION', 'us-east-1')",
        'timeout = os.getenv("TIMEOUT")',
        '# fake = os.getenv("COMMENT_ONLY")',
        'example = "os.environ[\\\"STRING_ONLY\\\"]"',
        "",
        "def run():",
        '    """Mentions os.getenv("DOCSTRING_ONLY") for docs."""',
        "    return API_KEY",
      ].join("\n"),
    ),
  );

  assert.deepEqual(analysis.referencedEnvironmentVariables, [
    "API_KEY",
    "REGION",
    "TIMEOUT",
  ]);
});


test("Python direct os env imports are detected only with import evidence", () => {
  const imported = analyzer.analyzeFile(
    file(
      "env.py",
      "python",
      [
        "from os import getenv, environ",
        'api = getenv("API_KEY")',
        'region = environ["REGION"]',
        'mode = environ.get("MODE")',
      ].join("\n"),
    ),
  );

  assert.deepEqual(imported.referencedEnvironmentVariables, [
    "API_KEY",
    "MODE",
    "REGION",
  ]);

  const unrelated = analyzer.analyzeFile(
    file(
      "fake.py",
      "python",
      [
        "def getenv(name):",
        "    return name",
        'value = getenv("NOT_OS_ENV")',
      ].join("\n"),
    ),
  );

  assert.deepEqual(
    unrelated.referencedEnvironmentVariables,
    [],
  );
});
