import test from "node:test";
import assert from "node:assert/strict";
import { resolveOutputTokenLimit } from "../src/providers/outputTokenLimitCore";

test("output token limit preserves a stricter upstream provider limit", () => {
  assert.equal(resolveOutputTokenLimit(2048, 4000), 2048);
});

test("output token limit applies configured ceiling and floors decimals", () => {
  assert.equal(resolveOutputTokenLimit(16384, 4000), 4000);
  assert.equal(resolveOutputTokenLimit(16384.9, 3999.8), 3999);
});

test("output token limit ignores invalid configured values", () => {
  assert.equal(resolveOutputTokenLimit(4096, undefined), 4096);
  assert.equal(resolveOutputTokenLimit(4096, Number.NaN), 4096);
  assert.equal(resolveOutputTokenLimit(4096, -10), 4096);
  assert.equal(resolveOutputTokenLimit(Number.NaN, 4000), 1);
});
