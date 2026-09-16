import {
  estimateModelContextWindow,
  getKnownModelContext,
} from "../services/modelContextCatalog";

export function getOpenRouterMaxOutputTokens(model?: string): number {
  const normalized = normalizeRoutedModel(model);

  if (
    normalized.includes("claude-sonnet-5") ||
    normalized.includes("claude-opus-5")
  ) {
    return 128000;
  }

  if (
    normalized.includes("gpt-4o") ||
    normalized.includes("gpt-5") ||
    normalized.includes("o1") ||
    normalized.includes("o3")
  ) {
    return 16384;
  }

  if (
    normalized.includes("claude-3-5") ||
    normalized.includes("claude-3.5") ||
    normalized.includes("gemini-1.5") ||
    normalized.includes("gemini-2")
  ) {
    return 8192;
  }

  return 4096;
}

export function getOpenRouterContextWindow(model?: string): number {
  const normalized = normalizeRoutedModel(model);
  if (!normalized) {
    return 32000;
  }

  const known = getKnownModelContext(normalized);
  if (known) {
    return known.contextWindow;
  }

  const inferred = estimateModelContextWindow(normalized);
  if (inferred !== 8192) {
    return inferred;
  }

  if (normalized.includes("gemini")) {
    return 200000;
  }
  if (normalized.includes("mistral") || normalized.includes("mixtral")) {
    return 32000;
  }
  if (normalized.includes("llama")) {
    return 8192;
  }

  return 32000;
}

function normalizeRoutedModel(model?: string): string {
  const normalized = model?.trim().toLowerCase() ?? "";
  const slashIndex = normalized.indexOf("/");
  return slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
}
