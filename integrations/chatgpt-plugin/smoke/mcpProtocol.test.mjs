/**
 * Real SDK smoke tests for the standalone DocuMint Streamable HTTP MCP server.
 * Run from integrations/chatgpt-plugin with npm run check after dependencies
 * are installed and the headless analyzer bundle is built.
 * No live GitHub access is required.
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const serverFile = fileURLToPath(new URL("../server.mjs", import.meta.url));
let child;
let baseUrl;
let output = "";

async function unusedLoopbackPort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("MCP server exited before health check: " + output.slice(-1600));
    }
    try {
      const response = await fetch(baseUrl + "/health", {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok && (await response.json()).service === "documint-mcp") {
        return;
      }
    } catch { /* Server may still be starting. */ }
    await sleep(100);
  }
  throw new Error("MCP server did not become healthy: " + output.slice(-1600));
}

before(async () => {
  const port = await unusedLoopbackPort();
  baseUrl = "http://127.0.0.1:" + port;
  child = spawn(process.execPath, [serverFile], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      GITHUB_TOKEN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      output = (output + chunk.toString()).slice(-4000);
    });
  }
  await waitForHealth();
});

after(async () => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const finished = once(child, "exit");
  child.kill("SIGTERM");
  const exited = await Promise.race([
    finished.then(() => true),
    sleep(1200).then(() => false),
  ]);
  if (!exited) child.kill("SIGKILL");
  await finished;
});

test("SDK initialization registers exactly three read-only DocuMint tools and rejects unsafe repositories",
  { timeout: 12000 }, async () => {
    const client = new Client({
      name: "documint-protocol-smoke",
      version: "1.0.0",
    });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl + "/mcp"));
    try {
      await client.connect(transport);
      const listed = await client.listTools();
      assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), [
        "documint_analyze_repository",
        "documint_explain_file",
        "documint_generate_markdown",
      ]);
      assert.ok(listed.tools.every((tool) => tool.annotations?.readOnlyHint === true));

      for (const name of listed.tools.map((tool) => tool.name)) {
        const args = {
          repository: "https://untrusted.example/org/repo",
          ...(name === "documint_explain_file" ? { file_path: "src/index.ts" } : {}),
        };
        const result = await client.callTool({ name, arguments: args });
        assert.equal(result.isError, true, name);
        assert.match(result.content[0].text, /GitHub|github\.com|repository/i);
      }
    } finally {
      await client.close();
    }
  });

test("HTTP gateway rejects oversized JSON and unsafe browser origins before MCP dispatch",
  { timeout: 12000 }, async () => {
    const headers = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    };
    const tooLarge = await fetch(baseUrl + "/mcp", {
      method: "POST",
      headers,
      body: "x".repeat(32 * 1024 + 1),
    });
    assert.equal(tooLarge.status, 413);
    assert.equal((await tooLarge.json()).error, "Request too large");

    const browser = await fetch(baseUrl + "/mcp", {
      method: "POST",
      headers: { ...headers, origin: "https://untrusted.example" },
      body: "{}",
    });
    assert.equal(browser.status, 429);
    assert.match((await browser.json()).error, /unsafe Origin/);
  });
