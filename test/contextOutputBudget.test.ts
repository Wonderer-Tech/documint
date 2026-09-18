import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTEXT_WINDOW_TOO_SMALL_FOR_OUTPUT_ERROR,
  resolveContextOutputTokenBudget,
} from "../src/providers/contextOutputBudget";

test("context output budget respects provider and remaining-context ceilings", () => {
  assert.equal(
    resolveContextOutputTokenBudget({
      contextWindow: 10000,
      inputTokens: 2000,
      providerOutputLimit: 4096,
    }),
    4096,
  );

  assert.equal(
    resolveContextOutputTokenBudget({
      contextWindow: 3000,
      inputTokens: 2200,
      providerOutputLimit: 4096,
    }),
    300,
  );
});

test("context output budget never invents a 1024-token response when less context remains", () => {
  assert.equal(
    resolveContextOutputTokenBudget({
      contextWindow: 2000,
      inputTokens: 1200,
      providerOutputLimit: 8192,
    }),
    300,
  );
});

test("context output budget rejects prompts with no response room", () => {
  for (const inputTokens of [1500, 1600, 2000]) {
    assert.throws(
      () =>
        resolveContextOutputTokenBudget({
          contextWindow: 2000,
          inputTokens,
          providerOutputLimit: 8192,
          reserveTokens: 500,
        }),
      /context window is too small/i,
    );
  }
  assert.match(CONTEXT_WINDOW_TOO_SMALL_FOR_OUTPUT_ERROR, /response reserve/i);
});

test("AI provider uses context-safe output budgeting on all generation paths", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/aiProvider.ts"),
    "utf8",
  );

  const calls = source.match(/resolveContextOutputTokenBudget\(\{/g) ?? [];
  assert.equal(calls.length, 3);
  assert.doesNotMatch(source, /Math\.max\(1024,/);
  assert.match(source, /providerOutputLimit:\s*this\.getMaxOutputTokens\(model\)/);
});
