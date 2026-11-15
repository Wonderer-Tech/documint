/**
 * Real spawned MCP HTTP boundary tests. The server starts on loopback with
 * an explicit test-only token; no network GitHub access is required.
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createNetServer } from "node:net";
import { request } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const SERVER = fileURLToPath(new URL("../server.mjs", import.meta.url));
const TOKEN = "f12c39a851d976cb8f85a41be6e0a649593f19f12ee2b0a987ca61d803772ad4";
let child;
let base;
let log = "";

async function pickPort() {
  const netServer = createNetServer();
  netServer.listen(0, "127.0.0.1");
  await once(netServer, "listening");
  const port = netServer.address().port;
  await new Promise((resolve) => netServer.close(resolve));
  return port;
}
async function stop(childProcess) {
  if (!childProcess || childProcess.exitCode !== null || childProcess.signalCode !== null) return;
  const finished = once(childProcess, "exit");
  childProcess.kill("SIGTERM");
  if (!(await Promise.race([finished.then(() => true), sleep(1500).then(() => false)]))) {
    childProcess.kill("SIGKILL");
  }
  await finished;
}
function requestHttp(body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(base + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json",
        accept: "application/json, text/event-stream", ...headers },
    }, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => { responseBody += chunk.toString(); });
      res.once("end", () => resolve({ status: res.statusCode, headers: res.headers, body: responseBody }));
    });
    req.once("error", reject);
    for (const part of body) req.write(part);
    req.end();
  });
}
before(async () => {
  const port = await pickPort();
  base = "http://127.0.0.1:" + port;
  child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port),
      MCP_ACCESS_TOKEN: TOKEN, MCP_REQUIRE_ACCESS_TOKEN: "1", GITHUB_TOKEN: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => { log = (log + chunk.toString()).slice(-1500); });
  }
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error("MCP protected server exited: " + log);
      }
      try {
        const result = await fetch(base + "/health", { signal: AbortSignal.timeout(500) });
        if (result.status === 200) return;
      } catch {}
      await sleep(100);
    }
    throw new Error("MCP protected server did not start: " + log);
  } catch (error) {
    await stop(child);
    throw error;
  }
});
after(async () => { await stop(child); });

test("unauthorized MCP requests receive 401 and health stays reachable", async () => {
  assert.equal((await fetch(base + "/health")).status, 200);
  const noAuth = await requestHttp(['{"jsonrpc":"2.0","id":1,"method":"tools/list"}']);
  assert.equal(noAuth.status, 401);
  assert.match(noAuth.headers["www-authenticate"], /^Bearer/);
  assert.equal(noAuth.body.includes(TOKEN), false);
  const wrong = await requestHttp(["{}"], { authorization: "Bearer " + TOKEN.slice(0, -1) + "0" });
  assert.equal(wrong.status, 401);
});

test("authorized malformed JSON is 400 and unsupported media is 415", async () => {
  const authorization = "Bearer " + TOKEN;
  const invalid = await requestHttp(["{broken"], { authorization });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.includes("broken"), false);
  const unsupported = await requestHttp(["{}"], { authorization,
    "content-type": "text/plain" });
  assert.equal(unsupported.status, 415);
});

test("authorized chunked request exceeding body cap receives HTTP 413", async () => {
  const result = await requestHttp(['{"a":"', "x".repeat(33 * 1024), '"}'], {
    authorization: "Bearer " + TOKEN,
  });
  assert.equal(result.status, 413);
});
