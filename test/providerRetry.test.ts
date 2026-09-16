import test from "node:test";
import assert from "node:assert/strict";
import {
  getRetryAfterMs,
  runProviderRequestWithRetry,
} from "../src/providers/providerRetry";

test("retries transient server failures and eventually succeeds", async () => {
  let calls = 0;
  const sleeps: number[] = [];

  const result = await runProviderRequestWithRetry(
    async () => {
      calls++;
      if (calls < 3) {
        throw { response: { status: 503 } };
      }
      return "ok";
    },
    {
      sleep: async (delayMs) => {
        sleeps.push(delayMs);
      },
    },
  );

  assert.equal(result, "ok");
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [1000, 2000]);
});

test("does not retry permanent client failures", async () => {
  let calls = 0;

  await assert.rejects(
    runProviderRequestWithRetry(
      async () => {
        calls++;
        throw { response: { status: 401 } };
      },
      { sleep: async () => undefined },
    ),
  );

  assert.equal(calls, 1);
});

test("stops after the configured retry bound", async () => {
  let calls = 0;

  await assert.rejects(
    runProviderRequestWithRetry(
      async () => {
        calls++;
        throw { code: "ETIMEDOUT" };
      },
      { maxRetries: 2, sleep: async () => undefined },
    ),
  );

  assert.equal(calls, 3);
});

test("does not start an attempt when already cancelled", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;

  await assert.rejects(
    runProviderRequestWithRetry(
      async () => {
        calls++;
        return "never";
      },
      { signal: controller.signal, sleep: async () => undefined },
    ),
    (error: unknown) => error instanceof Error && error.name === "AbortError",
  );

  assert.equal(calls, 0);
});

test("parses Retry-After seconds and HTTP dates", () => {
  assert.equal(
    getRetryAfterMs({ response: { headers: { "retry-after": "2.5" } } }, 0),
    2500,
  );

  const now = Date.parse("2026-09-16T12:00:00Z");
  assert.equal(
    getRetryAfterMs(
      { response: { headers: { "Retry-After": "Wed, 16 Sep 2026 12:00:03 GMT" } } },
      now,
    ),
    3000,
  );
});

test("reads Retry-After through AxiosHeaders-style get", () => {
  const headers = {
    get(name: string) {
      return name === "retry-after" ? "1.25" : undefined;
    },
  };

  assert.equal(getRetryAfterMs({ response: { headers } }, 0), 1250);
});

test("prefers retry-after-ms when provided", () => {
  assert.equal(
    getRetryAfterMs({ response: { headers: { "retry-after-ms": "1750" } } }, 0),
    1750,
  );
});
