import * as path from "path";
import * as vscode from "vscode";
import { hardenGeneratedHtmlForOffline } from "./htmlOfflineHardening";
import { sanitizeMarkdown } from "./outputSanitizerCore";

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

/**
 * Finalizes freshly generated output and cleans legacy cached visual sections.
 *
 * Fresh Markdown/HTML is no longer filtered for the removed hard-coded
 * "Code Workflow" headings. Those headings can be legitimate source-grounded
 * project content, and the current generators no longer emit the legacy visual.
 * The legacy sanitizer therefore stays scoped to persisted cache compatibility,
 * while generated HTML still receives the offline/CDN hardening pass.
 */
export async function sanitizeGeneratedOutputs(paths: {
  markdown?: string;
  html?: string;
}): Promise<void> {
  if (paths.html) {
    await sanitizeFile(
      vscode.Uri.file(paths.html),
      hardenGeneratedHtmlForOffline,
    );
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
