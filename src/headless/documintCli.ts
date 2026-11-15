#!/usr/bin/env node
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { SourceAnalyzer } from "../analyzer/sourceAnalyzer";
import { scanWorkspaceOnDisk } from "./diskScanner";
import { buildLocalDocumentationDocument } from "../services/localDocumentationDocument";
import { hardenGeneratedHtmlForOffline } from "../services/htmlOfflineHardening";
import {
  buildLocalDocumentationCacheKey,
  createLocalDocumentationCacheManifest,
  hashLocalDocumentationOutput,
  parseLocalDocumentationCacheManifest,
} from "../services/localDocumentationCache";

export interface CliOptions {
  root: string;
  out: string;
  format: "html" | "markdown" | "both";
  targets: string[];
  json: boolean;
  projectName?: string;
}

export const CLI_USAGE = `DocuMint Local HTML — same analyzer and renderer as VS Code Local Mode

Usage: node documint-cli.cjs [--root DIRECTORY] [--out DIRECTORY]
       [--format both|html|markdown] [--target FILE_OR_DIRECTORY ...]
       [--project-name NAME] [--json] [--help]

Defaults: --root is the current directory; --out is ROOT/documint;
          --format is both. No cloud or MCP service is invoked.

Examples:
  node documint-cli.cjs --root ./my-repo --json
  node documint-cli.cjs --root ./my-repo --target src --format html
`;

export function parseCliArgs(args: string[], cwd = process.cwd()): CliOptions | "help" {
  let root = cwd;
  let out: string | undefined;
  let format: CliOptions["format"] = "both";
  let projectName: string | undefined;
  let json = false;
  const targets: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--help" || flag === "-h") return "help";
    if (flag === "--json") { json = true; continue; }
    if (!["--root", "--out", "--format", "--target", "--project-name"].includes(flag)) {
      throw new Error(`Unknown option: ${flag}`);
    }
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    switch (flag) {
      case "--root": root = value; break;
      case "--out": out = value; break;
      case "--format":
        if (!["html", "markdown", "both"].includes(value)) throw new Error(`Invalid format: ${value}`);
        format = value as CliOptions["format"];
        break;
      case "--target": targets.push(value); break;
      case "--project-name": projectName = value; break;
    }
  }
  const resolvedRoot = path.resolve(cwd, root);
  const resolvedOut = out ? path.resolve(cwd, out) : path.join(resolvedRoot, "documint");
  return { root: resolvedRoot, out: resolvedOut, format, projectName, targets, json };
}

export interface GenerationResult {
  markdown?: string;
  html?: string;
  filesAnalyzed: number;
  usedCache: boolean;
}

export async function generateLocalHtmlFromDisk(options: CliOptions): Promise<GenerationResult> {
  const files = await scanWorkspaceOnDisk(options.root, { targets: options.targets });
  if (files.length === 0) throw new Error("No supported source files found within the selected scope");
  const projectName = options.projectName ?? path.basename(options.root);
  const readOptional = async (names: string[]): Promise<string | undefined> => {
    for (const name of names) {
      try {
        const filepath = path.join(options.root, name);
        const handle = await fs.open(filepath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
        try { return await handle.readFile("utf8"); } finally { await handle.close(); }
      } catch (error) {
        if (isMissing(error)) continue;
        throw error;
      }
    }
    return undefined;
  };
  const supplemental = {
    readme: await readOptional(["README.md", "README.MD", "readme.md"]),
    makefile: await readOptional(["Makefile", "makefile"]),
    dockerfile: await readOptional(["Dockerfile", "dockerfile"]),
  };
  await assertSafeOutputPaths(options.out);
  const cacheKey = buildLocalDocumentationCacheKey(projectName, files, supplemental);
  const wantsMarkdown = options.format !== "html";
  const wantsHtml = options.format !== "markdown";
  const mdFile = path.join(options.out, "documentation.md");
  const htmlFile = path.join(options.out, "documentation.html");
  const cacheFile = path.join(options.out, ".documint-local-cache.json");
  try {
    const cache = parseLocalDocumentationCacheManifest(await fs.readFile(cacheFile, "utf8"));
    if (cache?.key === cacheKey &&
        (!wantsMarkdown || (cache.outputs.markdown && await hashOnDisk(mdFile) === cache.outputs.markdown)) &&
        (!wantsHtml || (cache.outputs.html && await hashOnDisk(htmlFile) === cache.outputs.html))) {
      return { markdown: wantsMarkdown ? mdFile : undefined, html: wantsHtml ? htmlFile : undefined,
        filesAnalyzed: files.length, usedCache: true };
    }
  } catch (error) { if (!isMissing(error)) throw error; }

  // Exactly the same analyzer / document model / HTML template used by VS Code.
  const project = new SourceAnalyzer().analyzeProject(files);
  const document = buildLocalDocumentationDocument(projectName, files, project, supplemental);
  const html = hardenGeneratedHtmlForOffline(document.html);
  await fs.mkdir(options.out, { recursive: true });
  if (wantsMarkdown) await fs.writeFile(mdFile, document.markdown, "utf8");
  if (wantsHtml) await fs.writeFile(htmlFile, html, "utf8");
  await fs.writeFile(cacheFile, JSON.stringify(createLocalDocumentationCacheManifest(cacheKey, {
    ...(wantsMarkdown ? { markdown: hashLocalDocumentationOutput(document.markdown) } : {}),
    ...(wantsHtml ? { html: hashLocalDocumentationOutput(html) } : {}),
  }), null, 2) + "\n", "utf8");
  return { markdown: wantsMarkdown ? mdFile : undefined, html: wantsHtml ? htmlFile : undefined,
    filesAnalyzed: files.length, usedCache: false };
}

async function assertSafeOutputPaths(out: string): Promise<void> {
  const outputRoot = path.resolve(out);
  const root = path.parse(outputRoot).root;
  for (let current = outputRoot; current !== root; current = path.dirname(current)) {
    await rejectSymlink(current);
  }
  for (const filename of ["documentation.md", "documentation.html", ".documint-local-cache.json"]) {
    await rejectSymlink(path.join(outputRoot, filename));
  }
}

async function rejectSymlink(location: string): Promise<void> {
  try {
    if ((await fs.lstat(location)).isSymbolicLink()) {
      throw new Error(`Symlinked output path rejected: ${location}`);
    }
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}
async function hashOnDisk(file: string): Promise<string | undefined> {
  try { return hashLocalDocumentationOutput(await fs.readFile(file)); }
  catch (error) { if (isMissing(error)) return undefined; throw error; }
}

export async function runCli(args: string[]): Promise<number> {
  try {
    const parsed = parseCliArgs(args);
    if (parsed === "help") { process.stdout.write(CLI_USAGE); return 0; }
    const result = await generateLocalHtmlFromDisk(parsed);
    const payload = { status: "ok", ...result, renderer: "documint-local", server: false };
    process.stdout.write(parsed.json ? `${JSON.stringify(payload)}\n` :
      `DocuMint: ${result.filesAnalyzed} files, ${result.usedCache ? "cache reused" : "generated"}.\n` +
      (result.html ? `HTML: ${result.html}\n` : "") +
      (result.markdown ? `Markdown: ${result.markdown}\n` : ""));
    return 0;
  } catch (error) {
    process.stderr.write(`DocuMint: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

