import test from "node:test";
import assert from "node:assert/strict";
import { extractLocalReadmeFacts } from "../src/services/localReadmeFacts";

test("README tree descriptions map to exact project paths", () => {
  const readme = [
    "## Project Structure",
    "",
    "```text",
    "src/",
    "|-- analyzer/",
    "|   |-- sourceAnalyzer.ts          # Public analyzer facade",
    "|   `-- sourceAnalyzerBase.ts      # Core cross-language analysis",
    "|-- extension.ts                   # VS Code activation entry point",
    "`-- providers/",
    "    `-- openaiProvider.ts",
    "```",
  ].join("\n");

  const facts = extractLocalReadmeFacts(readme, [
    "src/analyzer/sourceAnalyzer.ts",
    "src/analyzer/sourceAnalyzerBase.ts",
    "src/extension.ts",
    "src/providers/openaiProvider.ts",
  ]);

  assert.deepEqual(facts.descriptionsByPath.get("src/analyzer/sourceAnalyzer.ts"), {
    text: "Public analyzer facade",
    source: "readme",
  });
  assert.deepEqual(facts.descriptionsByPath.get("src/extension.ts"), {
    text: "VS Code activation entry point",
    source: "readme",
  });
  assert.equal(
    facts.descriptionsByPath.has("src/providers/openaiProvider.ts"),
    false,
    "README filenames without an explicit description must not be inferred",
  );
});

test("README parser accepts explicit path-linked descriptions outside tree blocks", () => {
  const facts = extractLocalReadmeFacts(
    [
      "Key file:",
      "src/config/secretStorage.ts — VS Code secret storage wrapper",
    ].join("\n"),
    ["src/config/secretStorage.ts"],
  );

  assert.equal(
    facts.descriptionsByPath.get("src/config/secretStorage.ts")?.text,
    "VS Code secret storage wrapper",
  );
});
