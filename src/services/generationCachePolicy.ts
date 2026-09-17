import * as vscode from "vscode";
import {
  buildGenerationCacheIdentity,
  GenerationCacheIdentityInput,
  GenerationCacheSettings,
} from "./generationCacheIdentity";

const MARKER_FILE = ".documint-generation-cache-key.json";
const DOCUMENTATION_CACHE_FILE = ".documint-cache.json";

export interface GenerationCachePreparation {
  cacheReset: boolean;
  serializedIdentity: string;
}

/**
 * Checks whether generated documentation cache is compatible with this run and
 * clears stale file-documentation cache when required. The compatibility marker
 * is deliberately NOT updated here: callers must commit the prepared identity
 * only after generation and output sanitization complete successfully.
 */
export async function prepareGenerationCacheCompatibility(
  workspaceFolder: vscode.WorkspaceFolder,
  input: GenerationCacheIdentityInput,
): Promise<GenerationCachePreparation> {
  const serializedIdentity = buildSerializedIdentity(workspaceFolder, input);
  const docsFolder = vscode.Uri.joinPath(workspaceFolder.uri, "docs");
  const markerUri = vscode.Uri.joinPath(docsFolder, MARKER_FILE);
  const cacheUri = vscode.Uri.joinPath(docsFolder, DOCUMENTATION_CACHE_FILE);

  let previous: string | undefined;
  try {
    const bytes = await vscode.workspace.fs.readFile(markerUri);
    previous = Buffer.from(bytes).toString("utf-8");
  } catch {
    // Fresh workspaces and pre-policy caches have no marker.
  }

  if (previous === serializedIdentity) {
    return { cacheReset: false, serializedIdentity };
  }

  try {
    await vscode.workspace.fs.delete(cacheUri, {
      recursive: false,
      useTrash: false,
    });
  } catch {
    // Cache is optional; missing cache is expected on the first run.
  }

  return { cacheReset: true, serializedIdentity };
}

/**
 * Commits the exact identity snapshot prepared before generation. Keeping the
 * snapshot avoids marking a run as compatible with settings changed midway
 * through generation.
 */
export async function commitGenerationCacheCompatibility(
  workspaceFolder: vscode.WorkspaceFolder,
  preparation: GenerationCachePreparation,
): Promise<void> {
  const docsFolder = vscode.Uri.joinPath(workspaceFolder.uri, "docs");
  const markerUri = vscode.Uri.joinPath(docsFolder, MARKER_FILE);
  await vscode.workspace.fs.createDirectory(docsFolder);
  await vscode.workspace.fs.writeFile(
    markerUri,
    Buffer.from(preparation.serializedIdentity, "utf-8"),
  );
}

/**
 * Backwards-compatible one-step helper. New generation flows should prefer
 * prepareGenerationCacheCompatibility() + commitGenerationCacheCompatibility()
 * so failed runs never advance the marker.
 */
export async function ensureGenerationCacheCompatibility(
  workspaceFolder: vscode.WorkspaceFolder,
  input: GenerationCacheIdentityInput,
): Promise<boolean> {
  const preparation = await prepareGenerationCacheCompatibility(
    workspaceFolder,
    input,
  );
  await commitGenerationCacheCompatibility(workspaceFolder, preparation);
  return preparation.cacheReset;
}

function buildSerializedIdentity(
  workspaceFolder: vscode.WorkspaceFolder,
  input: GenerationCacheIdentityInput,
): string {
  const configuration = vscode.workspace.getConfiguration(
    "aiDocGenerator",
    workspaceFolder.uri,
  );
  const settings: GenerationCacheSettings = {
    model: configuration.get<string>("model"),
    documentationDepth: configuration.get<string>("documentationDepth"),
    maxTokens: configuration.get<number>("maxTokens"),
    temperature: configuration.get<number>("temperature"),
    customApiEndpoint: configuration.get<string>("customApiEndpoint"),
  };
  const identity = buildGenerationCacheIdentity(settings, input);
  return JSON.stringify(identity, null, 2);
}
