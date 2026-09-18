import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTEXT_WINDOW_TOO_SMALL_FOR_PROMPT_ERROR,
  INVALID_CHUNK_TOKEN_BUDGET_ERROR,
  requirePositiveChunkTokenBudget,
} from "../src/providers/chunkTokenBudget";

test("chunk token budget accepts positive finite values and floors decimals", () => {
  assert.equal(requirePositiveChunkTokenBudget(1), 1);
  assert.equal(requirePositiveChunkTokenBudget(128.9), 128);
});

test("chunk token budget rejects zero, negative, and non-finite values", () => {
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => requirePositiveChunkTokenBudget(value),
      new RegExp(INVALID_CHUNK_TOKEN_BUDGET_ERROR),
    );
  }
});

test("AI generation rejects a context window too small for prompt overhead before chunking", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/aiProvider.ts"),
    "utf8",
  );
  const budgetGuard = source.indexOf("if (maxCodeTokens <= 0)");
  const chunkCall = source.indexOf("return await this.generateChunked(");

  assert.ok(budgetGuard >= 0, "missing non-positive maxCodeTokens guard");
  assert.ok(chunkCall > budgetGuard, "chunking must occur after the budget guard");
  assert.match(source, /CONTEXT_WINDOW_TOO_SMALL_FOR_PROMPT_ERROR/);
  assert.match(
    source,
    /const safeMaxTokens = requirePositiveChunkTokenBudget\(maxTokens\)/,
  );
  assert.doesNotMatch(
    source,
    /while \(rem\.length > 0\) \{\s*chunks\.push\(rem\.substring\(0, maxTokens \* 4\)\)/,
  );
  assert.match(
    CONTEXT_WINDOW_TOO_SMALL_FOR_PROMPT_ERROR,
    /context window is too small/i,
  );
});
