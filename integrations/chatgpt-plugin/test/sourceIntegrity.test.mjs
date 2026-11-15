import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublicRepository } from "../repositoryFetch.mjs";

const SHA = "a".repeat(40);
const API = "https://api.github.com/repos/example/project";
const RAW = "https://raw.githubusercontent.com/example/project/" + SHA + "/";
const CODE = "export const available = 1;";
const POINTER = "version https://git-lfs.github.com/spec/v1\n" +
  "oid sha256:" + "d".repeat(64) + "\nsize 1234567\n";

function repo({ entries = [], contents = {} } = {}) {
  const requests = [];
  const bodies = { "src/index.ts": CODE, ...contents };
  const tree = [
    { path: "src/index.ts", type: "blob", mode: "100644", size: Buffer.byteLength(CODE) },
    ...entries,
  ];
  return {
    requests,
    fetchImpl: async (url) => {
      const address = String(url);
      requests.push(address);
      if (address === API) return Response.json({ private: false, default_branch: "main" });
      if (address === API + "/git/ref/heads/main") {
        return Response.json({ object: { type: "commit", sha: SHA } });
      }
      if (address === API + "/git/trees/" + SHA + "?recursive=1") {
        return Response.json({ sha: "b".repeat(40), truncated: false, tree });
      }
      if (address.startsWith(RAW) &&
          Object.hasOwn(bodies, address.slice(RAW.length))) {
        return new Response(bodies[address.slice(RAW.length)]);
      }
      return new Response("not found", { status: 404 });
    },
  };
}

test("in-scope gitlink submodules prevent a complete scan claim", async () => {
  const sample = repo({ entries: [
    { path: "packages/engine", type: "commit", mode: "160000", sha: "c".repeat(40) },
  ] });
  const result = await fetchPublicRepository("example/project", {
    maxFiles: 10, fetchImpl: sample.fetchImpl,
  });
  assert.equal(result.coverage.omittedSubmodules, 1);
  assert.equal(result.coverage.complete, false);
  assert.ok(sample.requests.every((address) => !address.includes("packages/engine")));
});

test("a Git LFS pointer is not presented as a source file", async () => {
  const sample = repo({
    entries: [
      { path: "src/model.py", type: "blob", mode: "100644", size: Buffer.byteLength(POINTER) },
    ],
    contents: { "src/model.py": POINTER },
  });
  const result = await fetchPublicRepository("example/project", {
    maxFiles: 10, fetchImpl: sample.fetchImpl,
  });
  assert.equal(result.coverage.omittedLfsPointerFiles, 1);
  assert.equal(result.coverage.complete, false);
  assert.deepEqual(result.files.map((file) => file.path), ["src/index.ts"]);
  assert.ok(sample.requests.includes(RAW + "src/model.py"));
});

test("source comments mentioning Git LFS are still analyzable", async () => {
  const code = "// version https://git-lfs.github.com/spec/v1\nexport const value = 42;";
  const sample = repo({
    entries: [
      { path: "src/lfsExample.ts", type: "blob", mode: "100644", size: Buffer.byteLength(code) },
    ],
    contents: { "src/lfsExample.ts": code },
  });
  const result = await fetchPublicRepository("example/project", {
    maxFiles: 10, fetchImpl: sample.fetchImpl,
  });
  assert.equal(result.coverage.omittedLfsPointerFiles, 0);
  assert.equal(result.coverage.omittedSubmodules, 0);
  assert.equal(result.coverage.complete, true);
  assert.equal(result.files.length, 2);
});

test("excluded test/build submodules do not count as missing source", async () => {
  const sample = repo({ entries: [
    { path: "tests/fixtures", type: "commit", mode: "160000", sha: "c".repeat(40) },
    { path: ".github/subproject", type: "commit", mode: "160000", sha: "e".repeat(40) },
  ] });
  const result = await fetchPublicRepository("example/project", {
    maxFiles: 10, fetchImpl: sample.fetchImpl,
  });
  assert.equal(result.coverage.omittedSubmodules, 0);
  assert.equal(result.coverage.complete, true);
});
