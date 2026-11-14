import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePublicRepository,
  isSafeSourcePath,
  fetchPublicRepository,
} from "../repositoryFetch.mjs";

test("only direct GitHub repository slugs/URLs are accepted", () => {
  assert.deepEqual(parsePublicRepository("Wonderer-Tech/documint"), {
    owner: "Wonderer-Tech",
    name: "documint",
    slug: "Wonderer-Tech/documint",
  });
  assert.equal(
    parsePublicRepository("https://github.com/Wonderer-Tech/documint.git").slug,
    "Wonderer-Tech/documint",
  );
  for (const invalid of [
    "https://example.com/owner/repo",
    "http://github.com/owner/repo",
    "https://github.com/owner/repo/tree/main",
    "https://github.com/owner/repo?token=secret",
    "https://token@github.com/owner/repo",
    "owner/../repo",
    "../repo",
    "file:///etc/passwd",
  ]) {
    assert.throws(() => parsePublicRepository(invalid));
  }
});

test("source path filter rejects secrets, build output and tests", () => {
  for (const path of [
    ".env", "src/.env.production", "private_key.pem", "tests/index.ts",
    "node_modules/pkg/index.js", "dist/main.js", "src/util.test.ts",
    "src/file.min.js", "src/../../etc/passwd", "/src/index.ts",
    "src\\index.ts", "src/key.p12", "src/module.d.ts",
  ]) {
    assert.equal(isSafeSourcePath(path), false, path);
  }
  for (const path of [
    "src/index.ts", "src/lib/config.yaml", "lib/model.prisma",
    "package.json", "server/routes/api.py",
  ]) {
    assert.equal(isSafeSourcePath(path), true, path);
  }
});

function mockGithubFetch({ privateRepo = false, truncated = false } = {}) {
  const calls = [];
  const source = new Map([
    ["package.json", '{"name":"example","scripts":{"test":"node --test"}}'],
    ["src/index.ts", 'import { run } from "./lib";\\nexport const value = run();'],
    ["src/lib.ts", "export function run() { return 42; }"],
    ["README.md", "# Example\\n"],
  ]);
  const entries = [
    ...Array.from(source, ([path, body]) => ({
      path,
      type: "blob",
      size: Buffer.byteLength(body),
    })),
    { path: ".env", type: "blob", size: 10 },
    { path: "tests/demo.ts", type: "blob", size: 10 },
    { path: "node_modules/x/a.js", type: "blob", size: 10 },
  ];

  return {
    calls,
    fetchImpl: async (url, options) => {
      const address = String(url);
      calls.push({ address, options });
      if (address === "https://api.github.com/repos/example/project") {
        return new Response(
          JSON.stringify({ private: privateRepo, default_branch: "main" }),
          { status: 200 },
        );
      }
      if (address ===
          "https://api.github.com/repos/example/project/git/trees/main?recursive=1") {
        return new Response(
          JSON.stringify({ tree: entries, sha: "sample-sha", truncated }),
          { status: 200 },
        );
      }
      const prefix = "https://raw.githubusercontent.com/example/project/main/";
      if (address.startsWith(prefix)) {
        const path = decodeURIComponent(address.slice(prefix.length));
        if (source.has(path)) {
          return new Response(source.get(path), { status: 200 });
        }
      }
      return new Response("missing", { status: 404 });
    },
  };
}

test("read-only public collection is bounded, deterministic and explicit about coverage", async () => {
  const mock = mockGithubFetch();
  const result = await fetchPublicRepository("example/project", {
    maxFiles: 10,
    fetchImpl: mock.fetchImpl,
  });
  assert.equal(result.repository, "example/project");
  assert.equal(result.treeSha, "sample-sha");
  assert.equal(result.files.length, 3);
  assert.equal(result.files[0].path, "package.json");
  assert.ok(result.files.every((file) => isSafeSourcePath(file.path)));
  assert.equal(result.coverage.complete, true);
  assert.equal(result.coverage.eligibleSourceFiles, 3);
  assert.match(result.extras.readme, /# Example/);

  for (const call of mock.calls) {
    assert.equal(call.options.method, "GET");
    assert.equal(call.options.redirect, "error");
    assert.ok(
      call.address.startsWith("https://api.github.com/") ||
      call.address.startsWith("https://raw.githubusercontent.com/"),
    );
    assert.doesNotMatch(call.address, /\.env|node_modules|tests\/demo/);
  }
});

test("private repositories and unsupported focus paths are rejected", async () => {
  const privateMock = mockGithubFetch({ privateRepo: true });
  await assert.rejects(
    () => fetchPublicRepository("example/project", {
      maxFiles: 10, fetchImpl: privateMock.fetchImpl,
    }),
    /Only verified public GitHub repositories/,
  );

  const publicMock = mockGithubFetch();
  await assert.rejects(
    () => fetchPublicRepository("example/project", {
      maxFiles: 10,
      focusPath: "private_key.pem",
      fetchImpl: publicMock.fetchImpl,
    }),
    /excluded or not a supported source type/,
  );
});

test("truncated GitHub trees never claim complete analysis", async () => {
  const mock = mockGithubFetch({ truncated: true });
  const result = await fetchPublicRepository("example/project", {
    maxFiles: 10,
    fetchImpl: mock.fetchImpl,
    focusPath: "src/lib.ts",
  });
  assert.equal(result.coverage.complete, false);
  assert.equal(result.coverage.githubTreeTruncated, true);
  assert.ok(result.files.some((file) => file.path === "src/lib.ts"));
});
