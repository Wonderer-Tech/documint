import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { once } from "node:events";
import { readMcpBody, HttpRequestError } from "../bodyPolicy.mjs";

test("real Node HTTP chunked body exceeding limit returns 413", async () => {
  const server = createServer(async (req, res) => {
    try {
      await readMcpBody(req, 32);
      res.writeHead(200).end("ok");
    } catch (e) {
      res.writeHead(e instanceof HttpRequestError ? e.status : 500).end("bad");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const status = await new Promise((resolve, reject) => {
      const req = request({
        host: "127.0.0.1", port: server.address().port, path: "/",
        method: "POST", headers: { "content-type": "application/json" },
      }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      });
      req.on("error", reject);
      for (const part of ['{"x":"', "z".repeat(60), '"}']) req.write(part);
      req.end();
    });
    assert.equal(status, 413);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
