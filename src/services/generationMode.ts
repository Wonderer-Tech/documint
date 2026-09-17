export type GenerationMode = "ai" | "local";

/**
 * Keeps the generation-mode boundary deliberately small and deterministic.
 * Unknown, blank, or legacy values fall back to the existing AI behavior so
 * older workspaces continue to behave exactly as before.
 */
export function normalizeGenerationMode(value: unknown): GenerationMode {
  return typeof value === "string" && value.trim().toLowerCase() === "local"
    ? "local"
    : "ai";
}
