import test from "node:test";
import assert from "node:assert/strict";
import { mergeChunkDocumentation } from "../src/providers/chunkDocumentationMerge";

test("merges repeated top-level sections in first-seen order", () => {
  const merged = mergeChunkDocumentation([
    [
      "## Overview",
      "First fact.",
      "",
      "## API Reference",
      "### `alpha()`",
      "Alpha docs.",
    ].join("\n"),
    [
      "## Overview",
      "Second fact.",
      "",
      "## API Reference",
      "### `beta()`",
      "Beta docs.",
    ].join("\n"),
  ]);

  assert.equal((merged.match(/^## Overview$/gm) ?? []).length, 1);
  assert.equal((merged.match(/^## API Reference$/gm) ?? []).length, 1);
  assert.equal((merged.match(/^### `alpha\(\)`$/gm) ?? []).length, 1);
  assert.equal((merged.match(/^### `beta\(\)`$/gm) ?? []).length, 1);
  assert.match(merged, /First fact\./);
  assert.match(merged, /Second fact\./);
});

test("deduplicates exact repeated prose and fenced code blocks", () => {
  const repeatedCode = ["```ts", "run();", "```"].join("\n");
  const merged = mergeChunkDocumentation([
    `## Usage\nSame paragraph.\n\n${repeatedCode}`,
    `## Usage\nSame paragraph.\n\n${repeatedCode}`,
  ]);

  assert.equal((merged.match(/Same paragraph\./g) ?? []).length, 1);
  assert.equal((merged.match(/run\(\);/g) ?? []).length, 1);
});

test("does not treat headings inside code fences as document sections", () => {
  const merged = mergeChunkDocumentation([
    [
      "## Example",
      "```md",
      "## Fake Heading",
      "content",
      "```",
    ].join("\n"),
    "## Example\nExtra explanation.",
  ]);

  assert.equal((merged.match(/^## Example$/gm) ?? []).length, 1);
  assert.match(merged, /## Fake Heading/);
  assert.match(merged, /Extra explanation\./);
});

test("preserves one-chunk output without rewriting it", () => {
  const markdown = "## Overview\nExact formatting.\n";
  assert.equal(mergeChunkDocumentation([markdown]), markdown.trim());
});
