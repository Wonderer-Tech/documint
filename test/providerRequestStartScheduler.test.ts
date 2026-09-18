import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ProviderRequestStartScheduler } from "../src/providers/providerRequestStartScheduler";

test("request scheduler spaces starts from the last actual start", async () => {
  let now = 1000;
  const waits: number[] = [];
  const scheduler = new ProviderRequestStartScheduler(() => now);

  await scheduler.waitForSlot(100, async (milliseconds) => {
    waits.push(milliseconds);
    now += milliseconds;
  });

  await scheduler.waitForSlot(100, async (milliseconds) => {
    waits.push(milliseconds);
    now += milliseconds;
  });

  assert.deepEqual(waits, [100]);
});

test("cancelled waiter does not leave a phantom future request slot", async () => {
  let now = 1000;
  let cancelled = false;
  let observedCancelledWait = 0;
  let rejectWait: ((reason?: unknown) => void) | undefined;
  const scheduler = new ProviderRequestStartScheduler(() => now);

  await scheduler.waitForSlot(100, async (milliseconds) => {
    now += milliseconds;
  });

  const cancelledRequest = scheduler.waitForSlot(
    100,
    (milliseconds) => {
      observedCancelledWait = milliseconds;
      return new Promise<void>((_resolve, reject) => {
        rejectWait = reject;
      });
    },
    () => cancelled,
  );

  await Promise.resolve();
  assert.equal(observedCancelledWait, 100);
  assert.ok(rejectWait, "cancelled request never entered its wait");
  cancelled = true;
  rejectWait!(new Error("Generation cancelled"));
  await assert.rejects(cancelledRequest, /Generation cancelled/);

  let nextWait = 0;
  await scheduler.waitForSlot(100, async (milliseconds) => {
    nextWait = milliseconds;
    now += milliseconds;
  });

  assert.equal(
    nextWait,
    100,
    "cancelled request must not reserve an extra rate-limit interval",
  );
});

test("AI provider delegates pacing to cancellation-safe request scheduler", () => {
  const source = readFileSync(
    join(process.cwd(), "src/providers/aiProvider.ts"),
    "utf8",
  );

  assert.match(
    source,
    /private readonly requestStartScheduler = new ProviderRequestStartScheduler\(\)/,
  );
  assert.match(source, /requestStartScheduler\.waitForSlot\(/);
  assert.match(source, /waitForRateLimitDelay\(waitMs, context\.cancellationToken\)/);
  assert.doesNotMatch(source, /nextApiRequestStart/);
  assert.doesNotMatch(source, /scheduledStart = Math\.max/);
});
