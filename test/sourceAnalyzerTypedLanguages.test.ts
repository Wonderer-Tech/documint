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
