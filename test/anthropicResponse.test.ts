import test from "node:test";
import assert from "node:assert/strict";
import { parseAnthropicResponse } from "../src/providers/anthropicResponse";

test("parses Anthropic text blocks and ignores non-text blocks", () => {
  const result = parseAnthropicResponse({
    content: [
      { type: "thinking", thinking: "private reasoning" },
      { type: "text", text: "# Overview" },
      { type: "tool_use", id: "tool-1" },
      { type: "text", text: "Details" },
    ],
    usage: { input_tokens: 120, output_tokens: 30 },
  });

  assert.equal(result.documentation, "# Overview\n\nDetails");
  assert.equal(result.tokensUsed, 150);
});

test("includes Anthropic prompt-cache token usage when reported", () => {
  const result = parseAnthropicResponse({
    content: [{ type: "text", text: "Docs" }],
    usage: {
      input_tokens: 20,
      cache_creation_input_tokens: 100,
      cache_read_input_tokens: 250,
      output_tokens: 30,
    },
  });

  assert.equal(result.tokensUsed, 400);
});

test("normalizes missing or invalid Anthropic token usage", () => {
  const result = parseAnthropicResponse({
    content: [{ type: "text", text: "Docs" }],
    usage: {
      input_tokens: -1,
      cache_creation_input_tokens: Number.NaN,
      cache_read_input_tokens: -5,
      output_tokens: Number.NaN,
    },
  });

  assert.equal(result.tokensUsed, 0);
});

test("rejects Anthropic responses without text content", () => {
  assert.throws(
    () =>
      parseAnthropicResponse({
        content: [{ type: "thinking", thinking: "no persisted text" }],
      }),
    /returned no text content/,
  );

  assert.throws(() => parseAnthropicResponse({}), /returned no text content/);
});
