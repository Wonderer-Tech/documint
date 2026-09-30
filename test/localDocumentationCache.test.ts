import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildLocalDocumentationCacheKey,
  createLocalDocumentationCacheManifest,
  hashLocalDocumentationOutput,
  LOCAL_DOCUMENTATION_CACHE_FILE,
  LOCAL_DOCUMENTATION_CACHE_VERSION,
  parseLocalDocumentationCacheManifest,
} from "../src/services/localDocumentationCache";

const files = [
  {
    path: "src/main.ts",
    language: "typescript",
    content: "export const value = 1;\n",
  },
  {
    path: "src/helper.ts",
    language: "typescript",
    content: "export function helper() { return 1; }\n",
  },
];

test("Local cache identity is stable across scanner ordering", () => {
  const first = buildLocalDocumentationCacheKey("Example", files);
  const second = buildLocalDocumentationCacheKey("Example", [...files].reverse());

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("Local cache identity changes when README facts change", () => {
  const first = buildLocalDocumentationCacheKey("Example", files, {
    readme: "# Example\n\nOld description\n",
  });
  const second = buildLocalDocumentationCacheKey("Example", files, {
    readme: "# Example\n\nNew description\n",
  });

  assert.notEqual(first, second);
});

test("Local cache identity changes with source or project identity", () => {
  const base = buildLocalDocumentationCacheKey("Example", files);
  const changedSource = buildLocalDocumentationCacheKey("Example", [
    { ...files[0], content: "export const value = 2;\n" },
    files[1],
  ]);
  const changedProject = buildLocalDocumentationCacheKey("Other", files);

  assert.notEqual(base, changedSource);
  assert.notEqual(base, changedProject);
});

test("Local cache manifest preserves verified output hashes", () => {
  const outputs = {
    markdown: hashLocalDocumentationOutput("# Local\n"),
    html: hashLocalDocumentationOutput("<h1>Local</h1>"),
  };
  const manifest = createLocalDocumentationCacheManifest(
    "cache-key",
    outputs,
    "2026-09-18T00:00:00.000Z",
  );
  const parsed = parseLocalDocumentationCacheManifest(JSON.stringify(manifest));

  assert.deepEqual(parsed, manifest);
  assert.equal(LOCAL_DOCUMENTATION_CACHE_FILE, ".documint-local-cache.json");
  assert.equal(LOCAL_DOCUMENTATION_CACHE_VERSION, "local-documentation-cache-v12");
});

test("Local cache parser rejects stale or malformed manifests", () => {
  assert.equal(parseLocalDocumentationCacheManifest("not json"), undefined);
  assert.equal(
    parseLocalDocumentationCacheManifest(
      JSON.stringify({
        version: "old-local-cache",
        key: "cache-key",
        generatedAt: "2026-09-18T00:00:00.000Z",
        outputs: { markdown: "hash" },
      }),
    ),
    undefined,
  );
});

test("Local generator sanitizes before committing verified cache metadata", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/localDocumentationGenerator.ts"),
    "utf8",
  );
  const sanitize = source.indexOf("await sanitizeGeneratedOutputs(outputPaths);");
  const cacheCommit = source.indexOf(
    "await this.writeCacheManifest(docsFolder, cacheKey, outputPaths);",
  );

  assert.match(source, /buildLocalDocumentationCacheKey/);
  assert.match(source, /tryReuseCachedOutputs/);
  assert.match(source, /Reused cached Local Documentation/);
  assert.match(source, /DOCUMINT_OUTPUT_DIRECTORY/);
  assert.ok(sanitize >= 0, "missing Local output sanitization");
  assert.ok(cacheCommit > sanitize, "Local cache must commit after sanitization");
});

test("shared Clear Cache removes the separate Local cache manifest", () => {
  const source = readFileSync(
    join(process.cwd(), "src/extensionBase.ts"),
    "utf8",
  );

  assert.match(source, /LOCAL_DOCUMENTATION_CACHE_FILE/);
  assert.match(
    source,
    /"\.documint-generation-cache-key\.json",\s*LOCAL_DOCUMENTATION_CACHE_FILE/,
  );
});


test("Local cache identity changes when Makefile or Dockerfile facts change", () => {
  const base = buildLocalDocumentationCacheKey("Example", files, {
    makefile: "build:\n\tnpm run build\n",
    dockerfile: "FROM node:22-alpine\n",
  });
  const changedMake = buildLocalDocumentationCacheKey("Example", files, {
    makefile: "build:\n\tnpm run compile\n",
    dockerfile: "FROM node:22-alpine\n",
  });
  const changedDocker = buildLocalDocumentationCacheKey("Example", files, {
    makefile: "build:\n\tnpm run build\n",
    dockerfile: "FROM node:24-alpine\n",
  });

  assert.notEqual(base, changedMake);
  assert.notEqual(base, changedDocker);
});


test("Local generator reads optional root build files before cache lookup", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/localDocumentationGenerator.ts"),
    "utf8",
  );

  assert.match(source, /\["Makefile", "makefile"\]/);
  assert.match(source, /\["Dockerfile", "dockerfile"\]/);
  assert.match(source, /\{ readme, makefile, dockerfile \}/);
});
