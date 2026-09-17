import { getOpenAIModelCapabilities } from "./openAICapabilities";
import {
  estimateModelContextWindow,
  getKnownModelContext,
} from "../services/modelContextCatalog";

export function getOpenRouterMaxOutputTokens(model?: string): number {
  const normalized = normalizeRoutedModel(model);

  const openai = getOpenAIModelCapabilities(normalized);
  if (openai) {
    return openai.maxOutputTokens;
  }

  if (
    normalized.includes("claude-sonnet-5") ||
    normalized.includes("claude-opus-5")
  ) {
    return 128000;
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
  const routedModel = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
  const variantIndex = routedModel.indexOf(":");
  return variantIndex >= 0 ? routedModel.slice(0, variantIndex) : routedModel;
}
