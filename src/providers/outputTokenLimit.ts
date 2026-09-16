import * as vscode from "vscode";

/**
 * Applies a configured output ceiling while preserving a stricter upstream
 * provider/context limit. Invalid configured values are ignored.
 */
export function resolveOutputTokenLimit(
  requestedTokens: number,
  configuredTokens?: number,
): number {
  const requested = Number.isFinite(requestedTokens)
    ? Math.max(1, Math.floor(requestedTokens))
    : 1;

  if (!Number.isFinite(configuredTokens) || (configuredTokens ?? 0) <= 0) {
    return requested;
  }

  return Math.min(
    requested,
    Math.max(1, Math.floor(configuredTokens!)),
  );
}

/**
 * Applies the user-facing aiDocGenerator.maxTokens setting as an upper bound
 * on provider output while preserving any stricter provider/context limit that
 * was already calculated upstream.
 */
export function capRequestedOutputTokens(requestedTokens: number): number {
  const configured = vscode.workspace
    .getConfiguration("aiDocGenerator")
    .get<number>("maxTokens");

  return resolveOutputTokenLimit(requestedTokens, configured);
}
