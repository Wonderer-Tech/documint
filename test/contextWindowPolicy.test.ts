import test from "node:test";
import assert from "node:assert/strict";
import {
  hasExplicitContextWindow,
  RequestContextWindowScope,
  resolveRequestContextWindow,
} from "../src/providers/contextWindowPolicy";

test("explicit context windows override provider defaults only when valid", () => {
  assert.equal(resolveRequestContextWindow(64000, 128000), 64000);
  assert.equal(resolveRequestContextWindow(64000.9, 128000), 64000);
  assert.equal(resolveRequestContextWindow(undefined, 128000), 128000);
  assert.equal(resolveRequestContextWindow(-1, 128000), 128000);
  assert.equal(resolveRequestContextWindow(Number.NaN, 0), 8192);

  assert.equal(hasExplicitContextWindow(32000), true);
  assert.equal(hasExplicitContextWindow(0), false);
  assert.equal(hasExplicitContextWindow(-1), false);
  assert.equal(hasExplicitContextWindow(Number.NaN), false);
});

test("request context window scope isolates overlapping async requests", async () => {
  const scope = new RequestContextWindowScope();
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = scope.run(32000, async () => {
    assert.equal(scope.current(), 32000);
    await firstGate;
    assert.equal(scope.current(), 32000);
    return scope.current();
  });

  const second = scope.run(64000, async () => {
    assert.equal(scope.current(), 64000);
    await Promise.resolve();
    assert.equal(scope.current(), 64000);
    return scope.current();
  });

  assert.equal(scope.current(), undefined);
  assert.equal(await second, 64000);
  releaseFirst();
  assert.equal(await first, 32000);
  assert.equal(scope.current(), undefined);
});
