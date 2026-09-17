import test from "node:test";
import assert from "node:assert/strict";
import { ModelMetadataCacheEpoch } from "../src/services/modelMetadataCacheEpoch";

test("metadata cache epoch invalidates older lookup snapshots", () => {
  const epoch = new ModelMetadataCacheEpoch();
  const first = epoch.snapshot();

  assert.equal(epoch.isCurrent(first), true);
  assert.equal(epoch.invalidate(), 1);
  assert.equal(epoch.isCurrent(first), false);

  const second = epoch.snapshot();
  assert.equal(second, 1);
  assert.equal(epoch.isCurrent(second), true);

  epoch.invalidate();
  assert.equal(epoch.isCurrent(second), false);
  assert.equal(epoch.snapshot(), 2);
});
