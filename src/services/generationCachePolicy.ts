import * as vscode from "vscode";

const CACHE_POLICY_VERSION = "generation-cache-policy-v1";
const MARKER_FILE = ".documint-generation-cache-key.json";
const DOCUMENTATION_CACHE_FILE = ".documint-cache.json";

export interface GenerationCacheIdentityInput {
  providerName: string;
  model?: string;
  depth?: string;
  contextWindow?: number;
  customApiEndpoint?: string;
}

interface GenerationCacheIdentity {
  version: string;
  provider: string;
  model: string;
  depth: string;
  maxTokens: number;
  temperature: number;
  contextWindow: number | null;
  customApiEndpoint: string;
}

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
  const identity = buildGenerationCacheIdentity(configuration, input);
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

function buildGenerationCacheIdentity(
  configuration: vscode.WorkspaceConfiguration,
  input: GenerationCacheIdentityInput,
): GenerationCacheIdentity {
  const provider = input.providerName.trim().toLowerCase() || "openai";
  const model =
    input.model?.trim() || configuration.get<string>("model")?.trim() || "";
  const depth =
    input.depth?.trim() ||
    configuration.get<string>("documentationDepth")?.trim() ||
    "standard";
  const maxTokens = normalizePositiveInteger(
    configuration.get<number>("maxTokens"),
    4000,
  );
  const temperature = normalizeFiniteNumber(
    configuration.get<number>("temperature"),
    0.3,
  );
  const contextWindow = Number.isFinite(input.contextWindow) &&
    (input.contextWindow ?? 0) > 0
    ? Math.floor(input.contextWindow!)
    : null;
  const customApiEndpoint =
    provider === "custom"
      ? input.customApiEndpoint?.trim() ||
        configuration.get<string>("customApiEndpoint")?.trim() ||
        ""
      : "";

  return {
    version: CACHE_POLICY_VERSION,
    provider,
    model,
    depth,
    maxTokens,
    temperature,
    contextWindow,
    customApiEndpoint,
  };
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.floor(value!)
    : fallback;
}

function normalizeFiniteNumber(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isFinite(value) ? value! : fallback;
}
