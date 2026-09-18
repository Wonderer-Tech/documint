export const CONTEXT_WINDOW_TOO_SMALL_FOR_PROMPT_ERROR =
  "Selected context window is too small for DocuMint's prompt overhead. Increase contextWindow or choose a model with a larger context window.";

export const INVALID_CHUNK_TOKEN_BUDGET_ERROR =
  "Chunk token budget must be greater than zero.";

export function requirePositiveChunkTokenBudget(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(INVALID_CHUNK_TOKEN_BUDGET_ERROR);
  }

  return Math.floor(value);
}
