import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const srcRoot = join(repoRoot, "src");

const allowedBaseImports = new Map([
  ["./sourceAnalyzerBase", "src/analyzer/sourceAnalyzer.ts"],
  ["./docGeneratorBase", "src/services/docGenerator.ts"],
  ["./extensionBase", "src/extension.ts"],
]);

function collectTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      files.push(...collectTypeScriptFiles(absolute));
    } else if (entry.endsWith(".ts")) {
      files.push(absolute);
    }
  }
  return files;
}

test("base implementation modules are reachable only through their public facades", () => {
  for (const filePath of collectTypeScriptFiles(srcRoot)) {
    const source = readFileSync(filePath, "utf8");
    const repoPath = relative(repoRoot, filePath).replace(/\\/g, "/");

    for (const [baseImport, allowedFacade] of allowedBaseImports) {
      const importsBase =
        source.includes(`from "${baseImport}"`) ||
        source.includes(`from '${baseImport}'`) ||
        source.includes(`import "${baseImport}"`) ||
        source.includes(`import '${baseImport}'`);
      if (!importsBase) {
        continue;
      }

      assert.equal(
        repoPath,
        allowedFacade,
        `${repoPath} bypasses the public facade by importing ${baseImport}`,
      );
    }
  }
});
