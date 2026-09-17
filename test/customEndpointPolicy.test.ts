import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCustomEndpoint } from "../src/providers/customEndpointPolicy";

test("custom endpoint policy accepts remote HTTPS and rejects remote HTTP", () => {
  assert.deepEqual(evaluateCustomEndpoint(" https://api.example.com/v1/chat "), {
    valid: true,
    normalizedEndpoint: "https://api.example.com/v1/chat",
    isLocal: false,
  });

  const insecure = evaluateCustomEndpoint("http://api.example.com/v1/chat");
  assert.equal(insecure.valid, false);
  assert.equal(insecure.isLocal, false);
  assert.match(insecure.reason ?? "", /remote custom endpoints must use HTTPS/i);
});

test("custom endpoint policy detects localhost and loopback hosts", () => {
  for (const endpoint of [
    "http://localhost:11434/v1/chat/completions",
    "http://127.0.0.1:1234/v1/chat/completions",
    "http://127.0.0.2:1234/v1/chat/completions",
    "http://[::1]:8080/v1/chat/completions",
    "https://model.localhost/v1/chat/completions",
  ]) {
    const result = evaluateCustomEndpoint(endpoint);
    assert.equal(result.valid, true, endpoint);
    assert.equal(result.isLocal, true, endpoint);
  }
});

test("custom endpoint policy rejects missing, malformed, and non-http URLs", () => {
  assert.equal(evaluateCustomEndpoint(undefined).valid, false);
  assert.equal(evaluateCustomEndpoint("not a url").valid, false);
  assert.equal(evaluateCustomEndpoint("file:///tmp/model").valid, false);
});
