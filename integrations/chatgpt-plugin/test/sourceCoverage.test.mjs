import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublicRepository } from "../repositoryFetch.mjs";

const SHA = "a".repeat(40);
const ROOT = "https://api.github.com/repos/example/project";

function repoFixture(entries) {
  const requests = [];
  const fetchImpl = async (url) => {
    const u = String(url);
    requests.push(u);
    if (u === ROOT) return Response.json({ private: false, default_branch: "main" });
    if (u === ROOT + "/git/ref/heads/main") {
      return Response.json({ object: { type: "commit", sha: SHA } });
    }
    if (u === ROOT + "/git/trees/" + SHA + "?recursive=1") {
      return Response.json({
        sha: "b".repeat(40),
        truncated: false,
        tree: entries,
      });
    }
    if (u === "https://raw.githubusercontent.com/example/project/" + SHA + "/src/index.ts") {
      return new Response("export const safe = true;");
    }
    return new Response("missing", { status: 404 });
  };
  return { fetchImpl, requests };
}

const valid = { type: "blob", path: "src/index.ts", size: 25 };

test("oversized source files produce partial coverage without downloading them", async () => {
  const mock = repoFixture([
    valid,
    { type: "blob", path: "src/huge.ts", size: 129 * 1024 },
  ]);
  const data = await fetchPublicRepository("example/project", {
    maxFiles: 10, fetchImpl: mock.fetchImpl,
  });
  assert.equal(data.coverage.complete, false);
  assert.equal(data.coverage.omittedOversizedSourceFiles, 1);
  assert.equal(data.coverage.omittedUnknownSizeSourceFiles, 0);
  assert.equal(data.coverage.eligibleSourceFiles, 1);
  assert.deepEqual(data.files.map((file) => file.path), ["src/index.ts"]);
  assert.ok(mock.requests.every((url) => !url.includes("huge.ts")));
});

test("unknown and invalid source sizes cause partial coverage", async () => {
  const mock = repoFixture([
    valid,
    { type: "blob", path: "src/missing.ts" },
    { type: "blob", path: "src/negative.ts", size: -1 },
  ]);
  const data = await fetchPublicRepository("example/project", {
    maxFiles: 10, fetchImpl: mock.fetchImpl,
  });
  assert.equal(data.coverage.complete, false);
  assert.equal(data.coverage.omittedOversizedSourceFiles, 0);
  assert.equal(data.coverage.omittedUnknownSizeSourceFiles, 2);
  assert.equal(data.coverage.eligibleSourceFiles, 1);
  assert.ok(mock.requests.every((url) =>
    !url.includes("missing.ts") && !url.includes("negative.ts")));
});

test("explicitly ignored build, test, and secret paths do not count as omitted source", async () => {
  const mock = repoFixture([
    valid,
    { type: "blob", path: "node_modules/a.js", size: 999999 },
    { type: "blob", path: "test/example.test.ts", size: 999999 },
    { type: "blob", path: ".env", size: 999999 },
  ]);
  const data = await fetchPublicRepository("example/project", {
    maxFiles: 10, fetchImpl: mock.fetchImpl,
  });
  assert.equal(data.coverage.complete, true);
  assert.equal(data.coverage.omittedOversizedSourceFiles, 0);
  assert.equal(data.coverage.omittedUnknownSizeSourceFiles, 0);
});
