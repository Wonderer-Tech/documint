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

test("Java and Kotlin imports collapse to useful package roots", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/Main.java",
      "java",
      [
        "import java.util.List;",
        "import org.springframework.boot.SpringApplication;",
        "public class Main {}",
      ].join("\n"),
    ),
    file(
      "src/Application.kt",
      "kotlin",
      [
        "import io.ktor.server.application.Application",
        "class Application",
      ].join("\n"),
    ),
  ]);

  assert.deepEqual(project.externalDependencies, [
    "io.ktor",
    "java",
    "org.springframework",
  ]);
  assert.deepEqual(project.entryPoints, [
    "src/Application.kt",
    "src/Main.java",
  ]);
});

test("C and C++ system headers normalize while quoted headers resolve internally", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/main.cpp",
      "cpp",
      [
        "#include <vector>",
        "#include <boost/asio.hpp>",
        '#include "config.hpp"',
        "int main() { return 0; }",
      ].join("\n"),
    ),
    file("src/config.hpp", "cpp", "struct Config {};"),
  ]);

  assert.deepEqual(project.externalDependencies, ["boost", "vector"]);
  assert.deepEqual(
    project.internalDependencies.map((edge) => [edge.from, edge.to]),
    [["src/main.cpp", "src/config.hpp"]],
  );
  assert.deepEqual(project.entryPoints, ["src/main.cpp"]);
});

test("Rust nested use groups, aliases, and globs produce dependency evidence", () => {
  const project = analyzer.analyzeProject([
    file(
      "src/lib.rs",
      "rust",
      [
        "use crate::{service::Service, shared::{Thing, Other as Alias}};",
        "use crate::helpers::*;",
        "use serde::{Serialize, Deserialize as De};",
      ].join("\n"),
    ),
    file("src/service.rs", "rust", "pub struct Service;"),
    file("src/shared.rs", "rust", "pub struct Thing;\npub struct Other;"),
    file("src/helpers.rs", "rust", "pub fn helper() {}"),
  ]);

  const lib = project.files.find((item) => item.path === "src/lib.rs");
  assert.ok(lib);
  assert.deepEqual(
    lib.imports.map((item) => item.source),
    [
      "crate::service::Service",
      "crate::shared::Thing",
      "crate::shared::Other",
      "crate::helpers",
      "serde::Serialize",
      "serde::Deserialize",
    ],
  );
  assert.deepEqual(project.externalDependencies, ["serde"]);
  assert.deepEqual(
    Array.from(new Set(project.internalDependencies.map((edge) => edge.to))).sort(),
    ["src/helpers.rs", "src/service.rs", "src/shared.rs"],
  );
});

test("Python parenthesized and backslash imports are combined before parsing", () => {
  const project = analyzer.analyzeProject([
    file(
      "pkg/app.py",
      "python",
      [
        "from requests.models import (",
        "    Response,",
        "    Request as Req,",
        ")",
        "from . import (",
        "    helpers,",
        "    tools as local_tools,",
        ")",
        "import numpy as np, \\",
        "    pandas as pd",
      ].join("\n"),
    ),
    file("pkg/helpers.py", "python", "def helper(): pass"),
    file("pkg/tools.py", "python", "def tool(): pass"),
  ]);

  const app = project.files.find((item) => item.path === "pkg/app.py");
  assert.ok(app);
  assert.deepEqual(
    app.imports.map((item) => [item.source, item.symbols]),
    [
      ["requests.models", ["Response", "Request"]],
      [".helpers", ["helpers"]],
      [".tools", ["tools"]],
      ["numpy", []],
      ["pandas", []],
    ],
  );
  assert.deepEqual(project.externalDependencies, ["numpy", "pandas", "requests"]);
  assert.deepEqual(
    project.internalDependencies.map((edge) => edge.to).sort(),
    ["pkg/helpers.py", "pkg/tools.py"],
  );
});

test("entry point detection is language-aware and ignores incidental index files", () => {
  const project = analyzer.analyzeProject([
    file("web/src/index.ts", "typescript", "export const app = 1;"),
    file("web/styles/index.css", "css", "body {}"),
    file("python/main.py", "python", "def main(): pass"),
    file("rust/src/lib.rs", "rust", "pub fn run() {}"),
    file("go/cmd/main.go", "go", "package main"),
    file("dotnet/Program.cs", "csharp", "public class Program {}"),
    file("config/main.yaml", "yaml", "name: app"),
  ]);

  assert.deepEqual(project.entryPoints, [
    "dotnet/Program.cs",
    "go/cmd/main.go",
    "python/main.py",
    "rust/src/lib.rs",
    "web/src/index.ts",
  ]);
});
