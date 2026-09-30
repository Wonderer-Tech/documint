import test from "node:test";
import assert from "node:assert/strict";
import { parseLocalProviderModels } from "../src/providers/localProviderDiscovery";

test("local model discovery parses OpenAI-compatible model lists deterministically", () => {
  assert.deepEqual(
    parseLocalProviderModels({
      data: [
        { id: "qwen3:8b" },
        { id: "llama3.2" },
        { id: "qwen3:8b" },
        { id: "  deepseek-r1:7b  " },
      ],
    }),
    ["deepseek-r1:7b", "llama3.2", "qwen3:8b"],
  );
});

test("local model discovery ignores malformed model-list entries", () => {
  assert.deepEqual(parseLocalProviderModels(undefined), []);
  assert.deepEqual(parseLocalProviderModels({}), []);
  assert.deepEqual(parseLocalProviderModels({ data: "wrong" }), []);
  assert.deepEqual(
    parseLocalProviderModels({
      data: [
        null,
        {},
        { id: 123 },
        { id: "" },
        { id: "   " },
        { id: "valid-model" },
      ],
    }),
    ["valid-model"],
  );
});


test("local model discovery bounds identifiers and result count", () => {
  const many = Array.from({ length: 520 }, (_, index) => ({
    id: `model-${String(index).padStart(3, "0")}`,
  }));

  const parsed = parseLocalProviderModels({
    data: [
      { id: "valid-model" },
      { id: "line\nbreak" },
      { id: "null\u0000byte" },
      { id: "x".repeat(257) },
      ...many,
    ],
  });

  assert.equal(parsed.includes("valid-model"), true);
  assert.equal(parsed.includes("line\nbreak"), false);
  assert.equal(parsed.includes("null\u0000byte"), false);
  assert.equal(parsed.some((value) => value.length > 256), false);
  assert.equal(parsed.length, 500);
});
