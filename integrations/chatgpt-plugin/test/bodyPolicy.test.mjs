import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { readMcpBody, HttpRequestError } from "../bodyPolicy.mjs";

function source(parts, headers = { "content-type": "application/json" }) {
  const req = Readable.from(parts.map((part) => Buffer.from(part)));
  req.headers = headers;
  return req;
}
test("JSON content type and UTF-8 charset accepted", async () => {
  assert.deepEqual(await readMcpBody(source(['{"method":"tools/list"}']), 1024), { method: "tools/list" });
  assert.deepEqual(await readMcpBody(source(['{"jsonrpc":"2.0"}'], { "content-type": "application/json; charset=utf-8" }), 1024), { jsonrpc: "2.0" });
});
test("chunked bodies over byte limit produce 413", async () => {
  await assert.rejects(() => readMcpBody(source(['{"a":"', "x".repeat(40), '"}']), 32),
    (e) => e instanceof HttpRequestError && e.status === 413 && !/x{8}/.test(e.message));
});
test("unsupported content types and compressed bodies produce 415", async () => {
  for (const headers of [
    { "content-type": "text/plain" }, {},
    { "content-type": "application/json", "content-encoding": "gzip" },
  ]) await assert.rejects(() => readMcpBody(source(["{}"], headers), 1024),
    (e) => e instanceof HttpRequestError && e.status === 415);
});
test("bad JSON and empty bodies return sanitized 400", async () => {
  for (const parts of [["{private_secret"], []]) {
    await assert.rejects(() => readMcpBody(source(parts), 1024),
      (e) => e instanceof HttpRequestError && e.status === 400 && !e.message.includes("private_secret"));
  }
});
test("oversized declared content-length refuses streaming", async () => {
  await assert.rejects(() => readMcpBody(source(["{}"], {
    "content-type": "application/json", "content-length": "400",
  }), 32), (e) => e instanceof HttpRequestError && e.status === 413);
});
test("negative or invalid configured limits are rejected", async () => {
  await assert.rejects(() => readMcpBody(source(["{}"]), -1), RangeError);
});
