import { createHash } from "crypto";
import type { WorkspaceFile } from "../types";

export const LOCAL_DOCUMENTATION_CACHE_FILE = ".documint-local-cache.json";
export const LOCAL_DOCUMENTATION_CACHE_VERSION = "local-documentation-cache-v5";

export interface LocalDocumentationOutputHashes {
  markdown?: string;
  html?: string;
}

export interface LocalDocumentationCacheManifest {
  version: string;
  key: string;
  generatedAt: string;
  outputs: LocalDocumentationOutputHashes;
}

/**
 * Builds a stable fingerprint for deterministic Local Documentation output.
 * Provider/model settings are intentionally excluded because Local mode never
 * uses them. File order is normalized so scanner ordering cannot create a
 * false cache miss.
 */
export function buildLocalDocumentationCacheKey(
  projectName: string,
  files: WorkspaceFile[],
): string {
  const hash = createHash("sha256");
  hash.update(LOCAL_DOCUMENTATION_CACHE_VERSION);
  hash.update("\0project\0");
  hash.update(projectName);

  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update("\0file\0");
    hash.update(file.path);
    hash.update("\0language\0");
    hash.update(file.language);
    hash.update("\0content\0");
    hash.update(file.content);
  }

  return hash.digest("hex");
}

export function hashLocalDocumentationOutput(
  content: string | Uint8Array,
): string {
  return createHash("sha256").update(content).digest("hex");
}

export function createLocalDocumentationCacheManifest(
  key: string,
  outputs: LocalDocumentationOutputHashes,
  generatedAt = new Date().toISOString(),
): LocalDocumentationCacheManifest {
  return {
    version: LOCAL_DOCUMENTATION_CACHE_VERSION,
    key,
    generatedAt,
    outputs: { ...outputs },
  };
}

export function parseLocalDocumentationCacheManifest(
  value: string,
): LocalDocumentationCacheManifest | undefined {
  try {
    const parsed = JSON.parse(value) as Partial<LocalDocumentationCacheManifest>;
    const outputs = parsed.outputs;
    if (
      parsed.version !== LOCAL_DOCUMENTATION_CACHE_VERSION ||
      typeof parsed.key !== "string" ||
      !parsed.key ||
      typeof parsed.generatedAt !== "string" ||
      !outputs ||
      typeof outputs !== "object" ||
      (outputs.markdown !== undefined && typeof outputs.markdown !== "string") ||
      (outputs.html !== undefined && typeof outputs.html !== "string")
    ) {
      return undefined;
    }

    return {
      version: parsed.version,
      key: parsed.key,
      generatedAt: parsed.generatedAt,
      outputs: {
        markdown: outputs.markdown,
        html: outputs.html,
      },
    };
  } catch {
    return undefined;
  }
}
