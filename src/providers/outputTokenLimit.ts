import * as vscode from "vscode";

/**
 * Applies the user-facing aiDocGenerator.maxTokens setting as an upper bound
 * on provider output while preserving any stricter provider/context limit that
 * was already calculated upstream.
 */
export function capRequestedOutputTokens(requestedTokens: number): number {
  const configured = vscode.workspace
    .getConfiguration("aiDocGenerator")
    .get<number>("maxTokens");

  const requested = Number.isFinite(requestedTokens)
    ? Math.max(1, Math.floor(requestedTokens))
    : 1;

  if (!Number.isFinite(configured) || (configured ?? 0) <= 0) {
    return requested;
  }

  return Math.min(requested, Math.max(1, Math.floor(configured!)));
}
