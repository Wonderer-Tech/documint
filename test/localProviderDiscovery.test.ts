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
