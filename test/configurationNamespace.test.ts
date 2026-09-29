import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const srcRoot = join(repoRoot, "src");
const authoritativeSettings = [
  "generationMode",
  "aiProvider",
  "model",
  "documentationDepth",
  "outputFormat",
  "targetLanguages",
  "maxTokens",
  "temperature",
  "rateLimitDelay",
  "concurrentRequests",
  "excludePatterns",
  "customApiEndpoint",
];

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

test("runtime settings access goes through the DocuMint namespace bridge", () => {
  for (const filePath of collectTypeScriptFiles(srcRoot)) {
    const repoPath = relative(repoRoot, filePath).replace(/\\/g, "/");
    const source = readFileSync(filePath, "utf8");

    if (repoPath === "src/config/configuration.ts") {
      continue;
    }

    assert.doesNotMatch(
      source,
      /getConfiguration\(["']aiDocGenerator["']\)/,
      `${repoPath} bypasses the configuration namespace bridge`,
    );
  }
});

test("runtime source does not advertise legacy setting keys as authoritative", () => {
  const forbidden = new RegExp(
    `aiDocGenerator\\.(?:${authoritativeSettings.join("|")})\\b`,
  );

  for (const filePath of collectTypeScriptFiles(srcRoot)) {
    const repoPath = relative(repoRoot, filePath).replace(/\\/g, "/");
    if (repoPath === "src/config/configuration.ts") {
      continue;
    }

    const source = readFileSync(filePath, "utf8");
    assert.doesNotMatch(
      source,
      forbidden,
      `${repoPath} still advertises a legacy setting key`,
    );
  }
});

test("configuration bridge names both current and legacy namespaces explicitly", () => {
  const source = readFileSync(
    join(srcRoot, "config/configuration.ts"),
    "utf8",
  );

  assert.match(source, /DOCUMINT_CONFIGURATION_SECTION = "documint"/);
  assert.match(
    source,
    /LEGACY_DOCUMINT_CONFIGURATION_SECTION = "aiDocGenerator"/,
  );
  assert.match(source, /current\.inspect<T>\(key\)/);
  assert.match(source, /legacy\.inspect<T>\(key\)/);
});
