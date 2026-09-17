export interface KnownModelContext {
  contextWindow: number;
  lifecycle: "current" | "legacy";
}

const CURRENT_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI current/default families used by DocuMint.
  "gpt-5.4-nano": 128000,
  "gpt-5.4-mini": 128000,
  "gpt-5.4": 200000,
  "gpt-5-nano": 128000,
  "gpt-5-mini": 128000,
  "gpt-5": 200000,
  "gpt-4.1": 1000000,
  "gpt-4.1-mini": 1000000,
  "gpt-4.1-nano": 1000000,
  "gpt-4o": 128000,
  "gpt-4o-mini": 128000,
  "o1": 200000,
  "o3": 200000,
  "o3-mini": 200000,

  // Anthropic current families used by DocuMint.
  "claude-sonnet-5": 1000000,
  "claude-opus-5": 1000000,
  "claude-sonnet-4-6": 1000000,
  "claude-opus-4-8": 1000000,
  "claude-opus-4-7": 1000000,
  "claude-opus-4-6": 1000000,
  "claude-sonnet-4-5-20250929": 200000,
  "claude-haiku-4-5-20251001": 200000,

  // DeepSeek current/default family.
  "deepseek-flash": 1000000,
};

const LEGACY_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI legacy compatibility entries.
  "gpt-4-turbo": 128000,
  "gpt-4": 8192,
  "gpt-3.5-turbo": 16385,
  "o1-mini": 128000,

  // Anthropic legacy compatibility entries.
  "claude-3-5-sonnet-20241022": 200000,
  "claude-3-5-haiku-20241022": 200000,
  "claude-3-opus-20240229": 200000,
  "claude-3-sonnet-20240229": 200000,
  "claude-3-haiku-20240307": 200000,
  "claude-2.1": 200000,
  "claude-2.0": 100000,

  // DeepSeek legacy aliases retained for explicit old configurations.
  "deepseek-v4-flash": 1000000,
  "deepseek-v4-pro": 1000000,
};

export function getKnownModelContext(
  model: string,
): KnownModelContext | undefined {
  const normalized = model.trim().toLowerCase();
  if (!normalized) {
    return undefined;
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

  const known = getKnownModelContext(normalized);
  if (known) {
    return known.contextWindow;
  }

  if (
    normalized.includes("deepseek-v4") ||
    normalized.includes("deepseek-flash")
  ) {
    return 1000000;
  }

  if (
    normalized.includes("claude-sonnet-5") ||
    normalized.includes("claude-opus-5") ||
    normalized.includes("claude-sonnet-4-6") ||
    normalized.includes("claude-opus-4-8") ||
    normalized.includes("claude-opus-4-7") ||
    normalized.includes("claude-opus-4-6") ||
    normalized.includes("gpt-4.1") ||
    normalized.includes("gpt-4-1")
  ) {
    return 1000000;
  }

  if (normalized.includes("200k") || normalized.includes("claude")) {
    return 200000;
  }

  if (
    normalized.includes("128k") ||
    normalized.includes("gpt-5") ||
    normalized.includes("gpt-4o") ||
    normalized.includes("o1") ||
    normalized.includes("o3")
  ) {
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
