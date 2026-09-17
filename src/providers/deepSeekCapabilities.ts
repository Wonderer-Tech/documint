export interface DeepSeekModelCapabilities {
  contextWindow: number;
  maxOutputTokens: number;
  lifecycle: "current" | "legacy";
}

/**
 * Canonical DeepSeek capability table used by direct DeepSeek generation,
 * OpenRouter-routed DeepSeek models, and shared model metadata.
 *
 * Current DeepSeek API documentation exposes 1M context and up to 384K output
 * for deepseek-flash and deepseek-v4-pro. Retired V4 Flash aliases still route
 * to the current Flash service, so they keep the same limits but are marked
 * legacy to distinguish them from current model IDs.
 */
export function getDeepSeekModelCapabilities(
  model: string | undefined,
): DeepSeekModelCapabilities | undefined {
  const normalized = model?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return undefined;
  }

  if (isFamily(normalized, "deepseek-flash")) {
    return {
      contextWindow: 1000000,
      maxOutputTokens: 384000,
      lifecycle: "current",
    };
  }

  if (isFamily(normalized, "deepseek-v4-pro")) {
    return {
      contextWindow: 1000000,
      maxOutputTokens: 384000,
      lifecycle: "current",
    };
  }

  if (isFamily(normalized, "deepseek-v4-flash")) {
    return {
      contextWindow: 1000000,
      maxOutputTokens: 384000,
      lifecycle: "legacy",
    };
  }

  return undefined;
}

function isFamily(model: string, family: string): boolean {
  return model === family || model.startsWith(`${family}-`);
}
