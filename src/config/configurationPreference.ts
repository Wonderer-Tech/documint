export interface ConfigurationInspectionLike<T> {
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
  globalLanguageValue?: T;
  workspaceLanguageValue?: T;
  workspaceFolderLanguageValue?: T;
}

export interface ResolvedConfigurationValue<T> {
  value: T | undefined;
  source: "current-explicit" | "legacy-explicit" | "current-default";
}

/**
 * Returns the effective explicit value inside one configuration namespace.
 * The ordering mirrors VS Code's more-specific workspace/language scopes
 * before broader global scopes.
 */
export function getExplicitConfigurationValue<T>(
  inspection: ConfigurationInspectionLike<T> | undefined,
): T | undefined {
  if (!inspection) {
    return undefined;
  }

  return (
    inspection.workspaceFolderLanguageValue ??
    inspection.workspaceLanguageValue ??
    inspection.globalLanguageValue ??
    inspection.workspaceFolderValue ??
    inspection.workspaceValue ??
    inspection.globalValue
  );
}

/**
 * Namespace migration precedence:
 *   explicit documint.* -> explicit aiDocGenerator.* -> documint.* default
 *
 * A legacy explicit value must beat the new namespace's contributed default;
 * otherwise existing users would silently lose their configured provider,
 * model, generation mode, or other settings after the namespace migration.
 */
export function resolveConfigurationValue<T>(
  currentInspection: ConfigurationInspectionLike<T> | undefined,
  legacyInspection: ConfigurationInspectionLike<T> | undefined,
  currentDefault: T | undefined,
): ResolvedConfigurationValue<T> {
  const current = getExplicitConfigurationValue(currentInspection);
  if (current !== undefined) {
    return { value: current, source: "current-explicit" };
  }

  const legacy = getExplicitConfigurationValue(legacyInspection);
  if (legacy !== undefined) {
    return { value: legacy, source: "legacy-explicit" };
  }

  return { value: currentDefault, source: "current-default" };
}
