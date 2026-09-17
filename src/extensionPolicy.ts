import * as vscode from "vscode";
import { ProviderFactory } from "./providers/providerFactory";
import {
  evaluateCustomEndpoint,
  type CustomEndpointPolicyResult,
} from "./providers/customEndpointPolicy";

export interface GenerationCommandPayloadLike {
  provider?: string;
  customApiEndpoint?: string;
}

const CUSTOM_CONSENT_PREFIX = "cloud-consent:custom:";

export function resolveGenerationCustomEndpointPolicy(
  payload: GenerationCommandPayloadLike | undefined,
): CustomEndpointPolicyResult | undefined {
  const provider = ProviderFactory.resolveProviderName(payload?.provider);
  if (provider !== "custom") {
    return undefined;
  }

  const configuration = vscode.workspace.getConfiguration("aiDocGenerator");
  const endpoint =
    payload?.customApiEndpoint?.trim() ||
    configuration.get<string>("customApiEndpoint")?.trim() ||
    "";

  return evaluateCustomEndpoint(endpoint);
}

/**
 * The legacy extension runner caches cloud-consent per provider/workspace.
 * When the canonical custom-endpoint policy says a custom endpoint is local,
 * temporarily satisfy that consent lookup so IPv6/127.x loopback endpoints do
 * not get treated as external. The prior workspace-state values are restored
 * immediately after the wrapped command finishes, so a later remote custom
 * endpoint still requires consent.
 */
export async function runWithTemporaryLocalCustomConsent<T>(
  context: vscode.ExtensionContext,
  operation: () => Promise<T> | T,
): Promise<T> {
  const snapshots: Array<{ key: string; value: boolean | undefined }> = [];

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const key = `${CUSTOM_CONSENT_PREFIX}${folder.uri.toString()}`;
    const value = context.workspaceState.get<boolean>(key);
    snapshots.push({ key, value });
    if (value !== true) {
      await context.workspaceState.update(key, true);
    }
  }

  try {
    return await operation();
  } finally {
    for (const snapshot of snapshots) {
      await context.workspaceState.update(snapshot.key, snapshot.value);
    }
  }
}
