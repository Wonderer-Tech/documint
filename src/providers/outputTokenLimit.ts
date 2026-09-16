import * as vscode from "vscode";
import { resolveOutputTokenLimit } from "./outputTokenLimitCore";

export { resolveOutputTokenLimit } from "./outputTokenLimitCore";

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
