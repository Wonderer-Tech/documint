import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExplicitFolderExcludePatterns,
  buildWorkspaceExcludePatterns,
  getDefaultTargetLanguages,
  getLanguageFromPath,
  getTargetExtensions,
  isInsideWorkspace,
  isRelativePathInsideExcludedDirectory,
} from "../src/scanner/scannerPolicy";

test("scanner target language expansion covers language aliases and extensions", () => {
  assert.deepEqual(
    getTargetExtensions(["typescript", "yaml"]),
    ["cts", "mts", "ts", "tsx", "yaml", "yml"],
  );
  assert.deepEqual(getTargetExtensions([".py"]), ["py"]);
  assert.equal(getLanguageFromPath("src/App.TSX"), "typescriptreact");
  assert.equal(getLanguageFromPath("schema.sql"), "sql");
});

test("scanner includes modern Node and TypeScript module extensions", () => {
  assert.deepEqual(
    getTargetExtensions(["javascript"]),
    ["cjs", "js", "jsx", "mjs"],
  );
  assert.deepEqual(
    getTargetExtensions(["typescript"]),
    ["cts", "mts", "ts", "tsx"],
  );
  assert.equal(getLanguageFromPath("src/server.MJS"), "javascript");
  assert.equal(getLanguageFromPath("src/config.CJS"), "javascript");
  assert.equal(getLanguageFromPath("src/worker.MTS"), "typescript");
  assert.equal(getLanguageFromPath("src/legacy.CTS"), "typescript");
});

test("scanner expands common C and C++ source/header extensions", () => {
  assert.deepEqual(getTargetExtensions(["c"]), ["c", "h"]);
  assert.deepEqual(
    getTargetExtensions(["cpp"]),
    ["cc", "cpp", "cxx", "hh", "hpp", "hxx"],
  );
  assert.equal(getLanguageFromPath("include/config.H"), "c");
  assert.equal(getLanguageFromPath("include/service.HPP"), "cpp");
  assert.equal(getLanguageFromPath("src/service.CXX"), "cpp");
});

test("default scanner languages include the full supported matrix", () => {
  const languages = getDefaultTargetLanguages();
  for (const required of [
    "typescript",
    "javascript",
    "python",
    "java",
    "go",
    "rust",
    "swift",
    "kotlin",
    "yaml",
    "json",
    "html",
    "css",
    "sql",
  ]) {
    assert.ok(languages.includes(required), `missing default language ${required}`);
  }
});

test("selected-folder policy relaxes only default test/spec exclusions", () => {
  const defaults = buildExplicitFolderExcludePatterns();
  assert.equal(defaults.includes("**/*.test.*"), false);
  assert.equal(defaults.includes("**/*.spec.*"), false);
  assert.equal(defaults.includes("**/node_modules/**"), true);
  assert.equal(defaults.includes("**/documint/**"), true);

  const userExcluded = buildExplicitFolderExcludePatterns(["**/*.test.*"]);
  assert.equal(userExcluded.includes("**/*.test.*"), true);
});

test("workspace policy keeps default test/spec and DocuMint output exclusions", () => {
  const excludes = buildWorkspaceExcludePatterns();
  assert.equal(excludes.includes("**/*.test.*"), true);
  assert.equal(excludes.includes("**/*.spec.*"), true);
  assert.equal(excludes.includes("**/documint/**"), true);
});

test("workspace boundary rejects sibling paths", () => {
  assert.equal(isInsideWorkspace("/repo", "/repo/src/index.ts"), true);
  assert.equal(isInsideWorkspace("/repo", "/repo"), true);
  assert.equal(isInsideWorkspace("/repo", "/repo-other/index.ts"), false);
  assert.equal(isInsideWorkspace("/repo", "/tmp/index.ts"), false);
});

test("relative exclusion does not reject a workspace merely because its root is named documint", () => {
  const excludedDirectories = ["node_modules", "documint", ".git"];

  assert.equal(
    isRelativePathInsideExcludedDirectory("src/services/htmlTemplate.ts", excludedDirectories),
    false,
  );
  assert.equal(
    isRelativePathInsideExcludedDirectory("documint/documentation.html", excludedDirectories),
    true,
  );
  assert.equal(
    isRelativePathInsideExcludedDirectory("src/documint/cache.ts", excludedDirectories),
    true,
  );
  assert.equal(
    isRelativePathInsideExcludedDirectory("src\\scanner\\workspaceScanner.ts", excludedDirectories),
    false,
  );
});
