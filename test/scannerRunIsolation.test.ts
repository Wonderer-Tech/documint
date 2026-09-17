import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ScannerRunTargetScope } from "../src/scanner/scannerRunTargetScope";

test("scanner target scope isolates overlapping async runs", async () => {
  const scope = new ScannerRunTargetScope();

  const [first, second] = await Promise.all([
    scope.run([" /repo/a ", "/repo/b"], async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return scope.current();
    }),
    scope.run(["/repo/other"], async () => {
      await Promise.resolve();
      return scope.current();
    }),
  ]);

  assert.deepEqual(first, ["/repo/a", "/repo/b"]);
  assert.deepEqual(second, ["/repo/other"]);
  assert.equal(scope.current(), undefined);
});

test("scanner target scope returns defensive copies", () => {
  const scope = new ScannerRunTargetScope();
  scope.enter(["/repo/a"]);

  const first = scope.current();
  assert.deepEqual(first, ["/repo/a"]);
  first?.push("/repo/mutated");
  assert.deepEqual(scope.current(), ["/repo/a"]);
});

test("workspace scanner has no mutable module-level target array", () => {
  const source = readFileSync(
    join(process.cwd(), "src/scanner/workspaceScanner.ts"),
    "utf8",
  );

  assert.doesNotMatch(source, /let\s+activeRunTargetPaths/);
  assert.match(source, /scannerRunTargetScope\.current\(\)/);
  assert.match(source, /targetPaths\s*\?\?\s*scannerRunTargetScope\.current\(\)/);
});

test("native source picker derives its filter from scanner policy", () => {
  const source = readFileSync(join(process.cwd(), "src/extension.ts"), "utf8");

  assert.match(source, /getDefaultTargetLanguages/);
  assert.match(source, /getTargetExtensions/);
  assert.match(
    source,
    /SOURCE_FILE_PICKER_EXTENSIONS\s*=\s*getTargetExtensions\([\s\S]*getDefaultTargetLanguages\(\)/,
  );
  assert.match(source, /"Source Files": SOURCE_FILE_PICKER_EXTENSIONS/);
  assert.doesNotMatch(
    source,
    /"Source Files":\s*\[\s*"ts"[\s\S]*"sql"\s*\]/,
  );
});
