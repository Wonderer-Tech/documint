import * as vscode from "vscode";
import {
  buildGenerationCacheIdentity,
  GenerationCacheIdentityInput,
  GenerationCacheSettings,
} from "./generationCacheIdentity";

const MARKER_FILE = ".documint-generation-cache-key.json";
const DOCUMENTATION_CACHE_FILE = ".documint-cache.json";

/**
 * Prevents documentation generated under materially different AI settings from
 * being reused from .documint-cache.json. Visual cache is intentionally kept:
 * project-tree/architecture visuals are source-derived and model-independent.
 */
export async function ensureGenerationCacheCompatibility(
  workspaceFolder: vscode.WorkspaceFolder,
  input: GenerationCacheIdentityInput,
): Promise<boolean> {
  const configuration = vscode.workspace.getConfiguration(
    "aiDocGenerator",
    workspaceFolder.uri,
  );
  const docsFolder = vscode.Uri.joinPath(workspaceFolder.uri, "docs");
  const markerUri = vscode.Uri.joinPath(docsFolder, MARKER_FILE);
  const cacheUri = vscode.Uri.joinPath(docsFolder, DOCUMENTATION_CACHE_FILE);
  const settings: GenerationCacheSettings = {
    model: configuration.get<string>("model"),
    documentationDepth: configuration.get<string>("documentationDepth"),
    maxTokens: configuration.get<number>("maxTokens"),
    temperature: configuration.get<number>("temperature"),
    customApiEndpoint: configuration.get<string>("customApiEndpoint"),
  };
  const identity = buildGenerationCacheIdentity(settings, input);
  const serialized = JSON.stringify(identity, null, 2);

  let previous: string | undefined;
  try {
    const bytes = await vscode.workspace.fs.readFile(markerUri);
    previous = Buffer.from(bytes).toString("utf-8");
  } catch {
    // Fresh workspaces and pre-policy caches have no marker.
  }

  if (previous === serialized) {
    return false;
  }

  try {
    await vscode.workspace.fs.delete(cacheUri, {
      recursive: false,
      useTrash: false,
    });
  } catch {
    // Cache is optional; missing cache is expected on the first run.
  }

  await vscode.workspace.fs.createDirectory(docsFolder);
  await vscode.workspace.fs.writeFile(
    markerUri,
    Buffer.from(serialized, "utf-8"),
  );
  return true;
}
