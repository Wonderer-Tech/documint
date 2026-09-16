import * as path from "path";
import * as vscode from "vscode";
import { sanitizeHtml, sanitizeMarkdown } from "./outputSanitizerCore";

interface CachedSection {
  section?: unknown;
}

interface VisualCacheShape {
  entry?: CachedSection;
}

interface DocumentationCacheShape {
  projectVisuals?: CachedSection;
}

export { sanitizeHtml, sanitizeMarkdown } from "./outputSanitizerCore";

export async function sanitizeGeneratedOutputs(paths: {
  markdown?: string;
  html?: string;
}): Promise<void> {
  if (paths.markdown) {
    await sanitizeFile(vscode.Uri.file(paths.markdown), sanitizeMarkdown);
  }
  if (paths.html) {
    await sanitizeFile(vscode.Uri.file(paths.html), sanitizeHtml);
  }

  const outputPath = paths.markdown ?? paths.html;
  if (outputPath) {
    await sanitizeGeneratedCaches(vscode.Uri.file(path.dirname(outputPath)));
  }
}

async function sanitizeGeneratedCaches(docsFolder: vscode.Uri): Promise<void> {
  await sanitizeJsonCache(
    vscode.Uri.joinPath(docsFolder, ".documint-visual-cache.json"),
    (cache: VisualCacheShape) => sanitizeCachedSection(cache.entry),
  );
  await sanitizeJsonCache(
    vscode.Uri.joinPath(docsFolder, ".documint-cache.json"),
    (cache: DocumentationCacheShape) => sanitizeCachedSection(cache.projectVisuals),
  );
}

function sanitizeCachedSection(entry?: CachedSection): boolean {
  if (!entry || typeof entry.section !== "string") {
    return false;
  }

  const cleaned = sanitizeMarkdown(entry.section);
  if (cleaned === entry.section) {
    return false;
  }

  entry.section = cleaned;
  return true;
}

async function sanitizeJsonCache<T extends object>(
  uri: vscode.Uri,
  sanitize: (cache: T) => boolean,
): Promise<void> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const original = Buffer.from(bytes).toString("utf-8");
    const parsed = JSON.parse(original) as T;

    if (sanitize(parsed)) {
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(JSON.stringify(parsed, null, 2), "utf-8"),
      );
    }
  } catch {
    // Cache files are optional and may not exist in fresh workspaces.
  }
}

async function sanitizeFile(
  uri: vscode.Uri,
  sanitize: (content: string) => string,
): Promise<void> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  const original = Buffer.from(bytes).toString("utf-8");
  const cleaned = sanitize(original);

  if (cleaned !== original) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(cleaned, "utf-8"));
  }
}
