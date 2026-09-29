export type GenerationMode = "ai" | "local";

/**
 * Keeps the generation-mode boundary deliberately small and deterministic.
 * The manifest defaults new/unconfigured installs to Local mode. Explicit
 * Local values normalize to Local; blank, unknown, or legacy programmatic
 * values still fall back to AI so malformed inputs never silently become Local.
 */
export function normalizeGenerationMode(value: unknown): GenerationMode {
  return typeof value === "string" && value.trim().toLowerCase() === "local"
    ? "local"
    : "ai";
}
