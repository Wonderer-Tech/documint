import { getAnthropicModelCapabilities } from "../providers/anthropicCapabilities";
import { getDeepSeekModelCapabilities } from "../providers/deepSeekCapabilities";
import { getOpenAIModelCapabilities } from "../providers/openAICapabilities";

export interface KnownModelContext {
  contextWindow: number;
  lifecycle: "current" | "legacy";
}

const CURRENT_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // Current Anthropic models not yet represented by the canonical capability
  // table retain explicit metadata here until their output limits are verified.
  "claude-sonnet-4-5-20250929": 200000,
  "claude-opus-4-5-20251101": 200000,
};

const LEGACY_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // Anthropic legacy compatibility entries.
  "claude-3-5-sonnet-20241022": 200000,
  "claude-3-5-haiku-20241022": 200000,
  "claude-3-opus-20240229": 200000,
  "claude-3-sonnet-20240229": 200000,
  "claude-3-haiku-20240307": 200000,
  "claude-2.1": 200000,
  "claude-2.0": 100000,
};

export function getKnownModelContext(
  model: string,
): KnownModelContext | undefined {
  const normalized = model.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const openai = getOpenAIModelCapabilities(normalized);
  if (openai) {
    return {
      contextWindow: openai.contextWindow,
      lifecycle: openai.lifecycle,
    };
  }

  const anthropic = getAnthropicModelCapabilities(normalized);
  if (anthropic) {
    return {
      contextWindow: anthropic.contextWindow,
      lifecycle: anthropic.lifecycle,
    };
  }

  const deepseek = getDeepSeekModelCapabilities(normalized);
  if (deepseek) {
    return {
      contextWindow: deepseek.contextWindow,
      lifecycle: deepseek.lifecycle,
    };
  }

  const current = CURRENT_MODEL_CONTEXT_WINDOWS[normalized];
  if (current) {
    return { contextWindow: current, lifecycle: "current" };
  }

  const legacy = LEGACY_MODEL_CONTEXT_WINDOWS[normalized];
  if (legacy) {
    return { contextWindow: legacy, lifecycle: "legacy" };
  }

  return undefined;
}

export function estimateModelContextWindow(model: string): number {
  const normalized = model.trim().toLowerCase();
  if (!normalized) {
    return 8192;
  }

  const openai = getOpenAIModelCapabilities(normalized);
  if (openai) {
    return openai.contextWindow;
  }

  const anthropic = getAnthropicModelCapabilities(normalized);
  if (anthropic) {
    return anthropic.contextWindow;
  }

  const deepseek = getDeepSeekModelCapabilities(normalized);
  if (deepseek) {
    return deepseek.contextWindow;
  }

  const known = getKnownModelContext(normalized);
  if (known) {
    return known.contextWindow;
  }

  if (normalized.includes("200k") || normalized.includes("claude")) {
    return 200000;
  }

  if (normalized.includes("128k")) {
    return 128000;
  }

  if (normalized.includes("32k")) {
    return 32768;
  }

  if (normalized.includes("16k")) {
    return 16385;
  }

  if (normalized.includes("turbo")) {
    return 128000;
  }

  return 8192;
}
