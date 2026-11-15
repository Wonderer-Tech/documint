/**
 * Opt-in public GitHub MCP acceptance. Requires a built server and SDK.
 * Run: DOCUMINT_LIVE_ACCEPT=1 npm run test:live
 * The ordinary npm run check never makes public GitHub calls.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { assertLiveOverview, assertLiveFile, assertLiveMarkdown } from "./liveAcceptanceAssertions.mjs";

const REPO = "Wonderer-Tech/documint";
const FOCUS = "src/analyzer/sourceAnalyzer.ts";
const LIMIT = 10;
const MARKDOWN_LIMIT = 5000;
const SERVER = fileURLToPath(new URL("../server.mjs", import.meta.url));
const BUNDLE = fileURLToPath(new URL("../dist/core.cjs", import.meta.url));

async function freePort() {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close((e) => e ? reject(e) : resolve()));
  return port;
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const finished = once(child, "exit");
  child.kill("SIGTERM");
  const exited = await Promise.race([finished.then(() => true), sleep(1500).then(() => false)]);
  if (!exited) child.kill("SIGKILL");
  await finished;
}

async function start() {
  const port = await freePort();
  const base = "http://127.0.0.1:" + port;
  let output = "";
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1",
      MCP_ALLOWED_HOSTS: "", MCP_ACCESS_TOKEN: "", MCP_REQUIRE_ACCESS_TOKEN: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => { output = (output + chunk.toString()).slice(-4000); });
  }
  try {
    for (let attempt = 0; attempt < 120; attempt++) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error("MCP process exited before health: " + output);
      }
      try {
        const response = await fetch(base + "/health", { signal: AbortSignal.timeout(500) });
        if (response.ok && (await response.json()).service === "documint-mcp") {
          return { child, base };
        }
      } catch { /* Process may still be starting. */ }
      await sleep(100);
    }
    throw new Error("MCP health timeout: " + output);
  } catch (error) {
    await stop(child);
    throw error;
  }
}

test("live public GitHub: analyze, explain and document DocuMint through the MCP SDK",
  { timeout: 180000 }, async () => {
    if (process.env.DOCUMINT_LIVE_ACCEPT !== "1") {
      throw new Error("Live network acceptance is opt-in: DOCUMINT_LIVE_ACCEPT=1 npm run test:live");
    }
    assert.ok(existsSync(BUNDLE), "Build core bundle first: npm run build");
    const { child, base } = await start();
    const client = new Client({ name: "documint-live-acceptance", version: "1.0.0" });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL(base + "/mcp")));
      const tools = await client.listTools();
      for (const name of [
        "documint_analyze_repository",
        "documint_explain_file",
        "documint_generate_markdown",
      ]) {
        assert.ok(tools.tools.some((tool) => tool.name === name), "Missing MCP tool " + name);
      }

      // Each call pins its own SHA; the default branch may advance between calls.
      const overview = assertLiveOverview(await client.callTool({
        name: "documint_analyze_repository",
        arguments: { repository: REPO, max_files: LIMIT },
      }), { repository: REPO, maxFiles: LIMIT });

      const explained = assertLiveFile(await client.callTool({
        name: "documint_explain_file",
        arguments: { repository: REPO, file_path: FOCUS, max_files: LIMIT },
      }), { repository: REPO, maxFiles: LIMIT, filePath: FOCUS });

      const documented = assertLiveMarkdown(await client.callTool({
        name: "documint_generate_markdown",
        arguments: { repository: REPO, max_files: LIMIT, max_chars: MARKDOWN_LIMIT },
      }), { repository: REPO, maxFiles: LIMIT, maxChars: MARKDOWN_LIMIT });

      console.log("DocuMint live MCP acceptance:", JSON.stringify({
        repository: REPO,
        overviewCommit: overview.commitSha,
        explainedCommit: explained.commitSha,
        markdownCommit: documented.commitSha,
        eligibleSourceFiles: overview.coverage.eligibleSourceFiles,
        scannedSourceFiles: overview.coverage.fetched,
        omittedByFileLimit: overview.coverage.omittedByFileLimit,
        fileExplained: explained.file.path,
        markdownLength: documented.markdown.length,
        markdownTruncated: documented.documentTruncated,
      }));
    } finally {
      await client.close().catch(() => {});
      await stop(child);
    }
  });
