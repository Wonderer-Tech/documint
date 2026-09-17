import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenAICompatibleResponse } from "../src/providers/openAICompatibleResponse";

test("parses string chat completion content", () => {
  assert.deepEqual(
    parseOpenAICompatibleResponse(
      {
        choices: [{ message: { content: "  documentation  " } }],
        usage: { total_tokens: 123.9 },
      },
      "Provider",
    ),
    { documentation: "documentation", tokensUsed: 123 },
  );
});

test("parses multipart text content", () => {
  const result = parseOpenAICompatibleResponse(
    {
      choices: [
        {
          message: {
            content: [
              { type: "text", text: "Part one" },
              { type: "metadata", value: "ignored" },
              { type: "text", text: "Part two" },
            ],
          },
        },
      ],
    },
    "Provider",
  );

  assert.equal(result.documentation, "Part one\n\nPart two");
  assert.equal(result.tokensUsed, 0);
});

test("falls back to split token usage fields for compatible providers", () => {
  assert.equal(
    parseOpenAICompatibleResponse(
      {
        choices: [{ message: { content: "docs" } }],
        usage: { prompt_tokens: 100.9, completion_tokens: 24.8 },
      },
      "Custom provider",
    ).tokensUsed,
    124,
  );

  assert.equal(
    parseOpenAICompatibleResponse(
      {
        choices: [{ message: { content: "docs" } }],
        usage: { input_tokens: 50, output_tokens: 12 },
      },
      "Custom provider",
    ).tokensUsed,
    62,
  );
});

test("explicit total token usage wins over split usage fields", () => {
  assert.equal(
    parseOpenAICompatibleResponse(
      {
        choices: [{ message: { content: "docs" } }],
        usage: {
          total_tokens: 90,
          prompt_tokens: 60,
          completion_tokens: 40,
          input_tokens: 70,
          output_tokens: 50,
        },
      },
      "Provider",
    ).tokensUsed,
    90,
  );
});

test("rejects malformed or empty completion content", () => {
  assert.throws(
    () => parseOpenAICompatibleResponse({ choices: [] }, "DeepSeek"),
    /DeepSeek returned no text documentation content/,
  );
  assert.throws(
    () =>
      parseOpenAICompatibleResponse(
        { choices: [{ message: { content: "   " } }] },
        "OpenRouter",
      ),
    /OpenRouter returned no text documentation content/,
  );
});
