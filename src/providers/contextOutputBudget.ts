export const CONTEXT_WINDOW_TOO_SMALL_FOR_OUTPUT_ERROR =
  "Selected context window is too small for DocuMint's prompt and response reserve. Increase contextWindow or choose a model with a larger context window.";

export interface ContextOutputBudgetInput {
  contextWindow: number;
  inputTokens: number;
  providerOutputLimit: number;
  reserveTokens?: number;
}

/**
 * Resolves the maximum response size that can fit inside the model context
 * after the complete prompt and a safety reserve are accounted for.
 */
export function resolveContextOutputTokenBudget(
  input: ContextOutputBudgetInput,
): number {
  const contextWindow = normalizePositiveInteger(input.contextWindow);
  const inputTokens = normalizeNonNegativeInteger(input.inputTokens);
  const providerOutputLimit = normalizePositiveInteger(input.providerOutputLimit);
  const reserveTokens = normalizeNonNegativeInteger(input.reserveTokens ?? 500);

  const remaining = contextWindow - inputTokens - reserveTokens;
  if (remaining <= 0) {
    throw new Error(CONTEXT_WINDOW_TOO_SMALL_FOR_OUTPUT_ERROR);
  }

  return Math.min(providerOutputLimit, remaining);
}

function normalizePositiveInteger(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(CONTEXT_WINDOW_TOO_SMALL_FOR_OUTPUT_ERROR);
  }
  return Math.floor(value);
}

function normalizeNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(CONTEXT_WINDOW_TOO_SMALL_FOR_OUTPUT_ERROR);
  }
  return Math.floor(value);
}
