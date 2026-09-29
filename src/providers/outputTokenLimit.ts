import { getDocuMintConfiguration } from "../config/configuration";
import { resolveOutputTokenLimit } from "./outputTokenLimitCore";

export { resolveOutputTokenLimit } from "./outputTokenLimitCore";

/**
 * Applies the user-facing documint.maxTokens setting as an upper bound
 * on provider output while preserving any stricter provider/context limit that
 * was already calculated upstream.
 */
export function capRequestedOutputTokens(requestedTokens: number): number {
  const configured = getDocuMintConfiguration()
    .get<number>("maxTokens");

  return resolveOutputTokenLimit(requestedTokens, configured);
}
