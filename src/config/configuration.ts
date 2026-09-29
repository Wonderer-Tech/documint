import * as vscode from "vscode";
import { resolveConfigurationValue } from "./configurationPreference";

export const DOCUMINT_CONFIGURATION_SECTION = "documint";
export const LEGACY_DOCUMINT_CONFIGURATION_SECTION = "aiDocGenerator";

export function getDocuMintConfigurationValue<T>(
  key: string,
  resource?: vscode.Uri,
): T | undefined {
  const current = vscode.workspace.getConfiguration(
    DOCUMINT_CONFIGURATION_SECTION,
    resource,
  );
  const legacy = vscode.workspace.getConfiguration(
    LEGACY_DOCUMINT_CONFIGURATION_SECTION,
    resource,
  );

  return resolveConfigurationValue(
    current.inspect<T>(key),
    legacy.inspect<T>(key),
    current.get<T>(key),
  ).value;
}

export async function updateDocuMintConfigurationValue(
  key: string,
  value: unknown,
  target: vscode.ConfigurationTarget,
  resource?: vscode.Uri,
): Promise<void> {
  await vscode.workspace
    .getConfiguration(DOCUMINT_CONFIGURATION_SECTION, resource)
    .update(key, value, target);
}

export function affectsDocuMintConfiguration(
  event: vscode.ConfigurationChangeEvent,
  key: string,
): boolean {
  return (
    event.affectsConfiguration(`${DOCUMINT_CONFIGURATION_SECTION}.${key}`) ||
    event.affectsConfiguration(
      `${LEGACY_DOCUMINT_CONFIGURATION_SECTION}.${key}`,
    )
  );
}
