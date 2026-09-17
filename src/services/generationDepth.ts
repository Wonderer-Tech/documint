export type DocumentationDepth =
  | "simple"
  | "basic"
  | "standard"
  | "comprehensive";

const VALID_DEPTHS = new Set<DocumentationDepth>([
  "simple",
  "basic",
  "standard",
  "comprehensive",
]);

/**
 * Normalizes run/config depth so cache identity and runtime generation cannot
 * disagree on blank or unsupported values.
 */
export function normalizeDocumentationDepth(
  value: string | undefined,
  fallback: string | undefined = "standard",
): DocumentationDepth {
  const normalized = value?.trim().toLowerCase();
  if (normalized && VALID_DEPTHS.has(normalized as DocumentationDepth)) {
    return normalized as DocumentationDepth;
  }

  const normalizedFallback = fallback?.trim().toLowerCase();
  if (
    normalizedFallback &&
    VALID_DEPTHS.has(normalizedFallback as DocumentationDepth)
  ) {
    return normalizedFallback as DocumentationDepth;
  }

  return "standard";
}
