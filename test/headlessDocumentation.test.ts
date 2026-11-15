import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { scanWorkspaceOnDisk } from "../src/headless/diskScanner";
import { generateLocalHtmlFromDisk, parseCliArgs } from "../src/headless/documintCli";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationDocument } from "../src/services/localDocumentationDocument";
import { hardenGeneratedHtmlForOffline } from "../src/services/htmlOfflineHardening";

async function temporaryRoot(body: (root: string) => Promise<void>): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "documint-headless-"));
  try { await body(root); } finally { await fs.rm(root, { recursive: true, force: true }); }
}
async function put(root: string, file: string, content: string): Promise<void> {
  const dest = path.join(root, file);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, content, "utf8");
}
function args(root: string) {
  return { root, out: path.join(root, "documint"), format: "both" as const, targets: [], json: true };
}

test("headless scan preserves VS Code language mappings and excludes generated, test and secret files", async () => {
  await temporaryRoot(async (root) => {
    await put(root, "src/index.ts", 'import { helper } from "./helper";\nexport const value = helper();');
    await put(root, "src/helper.ts", "export function helper(){return 42}");
    await put(root, "test/something.test.ts", "export const unused = 1");
    await put(root, "node_modules/package/index.ts", "export const dependency = 2");
    await put(root, "documint/generated.ts", "export const output = 1");
    await put(root, "private/.env.json", '{"secret":"PRIVATE"}');
    await put(root, "README.md", "# Example");
    const files = await scanWorkspaceOnDisk(root);
    assert.deepEqual(files.map(f => f.path), ["src/helper.ts", "src/index.ts"]);
    assert.deepEqual(files.map(f => f.language), ["typescript", "typescript"]);
  });
});

test("headless engine generates same source-model Markdown and same interactive HTML rendering pipeline", async () => {
  await temporaryRoot(async (root) => {
    await put(root, "src/index.ts", 'import { helper } from "./helper";\nexport function run(){return helper()}');
    await put(root, "src/helper.ts", "export function helper(){return 42}");
    await put(root, "package.json", '{"name":"example","scripts":{"test":"node --test"}}');
    await put(root, "README.md", "# Example\nA small library");
    const params = args(root);
    const output = await generateLocalHtmlFromDisk(params);
    assert.equal(output.usedCache, false);
    assert.equal(output.filesAnalyzed, 3);
    assert.ok(output.html); assert.ok(output.markdown);
    const [md, html] = await Promise.all([
      fs.readFile(output.markdown!, "utf8"), fs.readFile(output.html!, "utf8")
    ]);
    const files = await scanWorkspaceOnDisk(root);
    const project = new SourceAnalyzer().analyzeProject(files);
    const expected = buildLocalDocumentationDocument(path.basename(root), files, project, {
      readme: "# Example\nA small library",
    });
    assert.equal(md, expected.markdown); // exactly the VS Code Local documentation text
    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.match(html, /data-documint-local-code-map/);
    assert.match(html, /Find your way through the code/);
    assert.match(html, /How do the parts fit together\?/);
    assert.match(html, /Which files are used by the most project files\?/);
    assert.match(html, /src\/helper\.ts/);
    assert.match(html, /src\/index\.ts/);
    assert.doesNotMatch(html, /cdnjs\.cloudflare\.com/i);
    assert.equal(hardenGeneratedHtmlForOffline(html), html);
    assert.match(expected.html, /data-documint-local-code-map/); // shared renderer
    const cached = await generateLocalHtmlFromDisk(params);
    assert.equal(cached.usedCache, true);
    assert.equal(cached.html, output.html);
    await put(root, "src/helper.ts", "export function helper(){return 43}");
    assert.equal((await generateLocalHtmlFromDisk(params)).usedCache, false);
  });
});

test("CLI argument parser validates format and resolves outputs without shell execution", () => {
  const parsed = parseCliArgs(["--root", "source", "--format", "html", "--target", "src", "--json"], "/tmp/test");
  assert.notEqual(parsed, "help");
  if (parsed === "help") throw new Error("unexpected help");
  assert.equal(parsed.root, "/tmp/test/source");
  assert.equal(parsed.out, "/tmp/test/source/documint");
  assert.equal(parsed.format, "html");
  assert.deepEqual(parsed.targets, ["src"]);
  assert.throws(() => parseCliArgs(["--format", "pdf"]), /Invalid format/);
  assert.throws(() => parseCliArgs(["--root"]), /Missing value/);
  assert.throws(() => parseCliArgs(["--exec", "ls"]), /Unknown option/);
});

test("scanner rejects path escapes, prevents reading symlinks and fails closed on cap", async () => {
  await temporaryRoot(async root => {
    await put(root, "src/index.ts", "export const value = 1");
    await fs.symlink("src/index.ts", path.join(root, "linked.ts"));
    assert.deepEqual((await scanWorkspaceOnDisk(root)).map(f => f.path), ["src/index.ts"]);
    await assert.rejects(scanWorkspaceOnDisk(root, { targets: ["../outside"] }), /escapes workspace/);
    await assert.rejects(scanWorkspaceOnDisk(root, { maxBytes: 2 }), /Source byte limit/);
    assert.deepEqual((await scanWorkspaceOnDisk(root, { targets: ["src/index.ts"] })).map(f => f.path), ["src/index.ts"]);
  });
});


test("headless CLI refuses to write through a symlinked output directory", async () => {
  await temporaryRoot(async (root) => {
    await put(root, "src/index.ts", "export const safe = 1;");
    const external = await fs.mkdtemp(path.join(os.tmpdir(), "documint-output-"));
    try {
      await fs.symlink(external, path.join(root, "documint"));
      await assert.rejects(generateLocalHtmlFromDisk(args(root)), /Symlinked output path rejected/);
    } finally { await fs.rm(external, { recursive: true, force: true }); }
  });
});
