import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractLocalReadmeFacts } from "../src/services/localReadmeFacts";

test("README tree descriptions map to exact project paths", () => {
  const readme = [
    "## Project Structure",
    "",
    "```text",
    "src/",
    "|-- analyzer/                  # Source analysis and dependency facts",
    "|   |-- sourceAnalyzer.ts          # Public analyzer facade",
    "|   `-- sourceAnalyzerBase.ts      # Core cross-language analysis",
    "|-- extension.ts                   # VS Code activation entry point",
    "`-- providers/                 # AI provider integrations",
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


  assert.deepEqual(facts.descriptionsByModule.get("src/analyzer"), {
    text: "Source analysis and dependency facts",
    source: "readme",
  });
  assert.deepEqual(facts.descriptionsByModule.get("src/providers"), {
    text: "AI provider integrations",
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


test("README tree root comments become trusted structural-module descriptions", () => {
  const facts = extractLocalReadmeFacts(
    [
      "```text",
      "src/ # Application source",
      "`-- index.ts # Entry file",
      "```",
    ].join("\n"),
    ["src/index.ts"],
  );

  assert.deepEqual(facts.descriptionsByModule.get("src"), {
    text: "Application source",
    source: "readme",
  });
});


test("DocuMint README provides trusted descriptions for its structural modules", () => {
  const readme = readFileSync(
    join(process.cwd(), "README.md"),
    "utf8",
  );
  const facts = extractLocalReadmeFacts(readme, [
    "src/analyzer/sourceAnalyzer.ts",
    "src/config/secretStorage.ts",
    "src/scanner/workspaceScanner.ts",
    "src/providers/providerFactory.ts",
    "src/services/localDocumentationModel.ts",
    "src/views/sidebarProvider.ts",
  ]);

  assert.match(
    facts.descriptionsByModule.get("src/analyzer")?.text ?? "",
    /Source analysis/i,
  );
  assert.match(
    facts.descriptionsByModule.get("src/config")?.text ?? "",
    /Settings migration/i,
  );
  assert.match(
    facts.descriptionsByModule.get("src/scanner")?.text ?? "",
    /Workspace\/file discovery/i,
  );
  assert.match(
    facts.descriptionsByModule.get("src/providers")?.text ?? "",
    /Cloud and local AI-provider runtimes/i,
  );
  assert.match(
    facts.descriptionsByModule.get("src/services")?.text ?? "",
    /Local\/AI generation/i,
  );
  assert.match(
    facts.descriptionsByModule.get("src/views")?.text ?? "",
    /Sidebar webview/i,
  );
});
