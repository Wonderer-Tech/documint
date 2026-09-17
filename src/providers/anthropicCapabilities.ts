export interface AnthropicModelCapabilities {
  contextWindow: number;
  maxOutputTokens: number;
  lifecycle: "current" | "legacy";
}

interface CapabilityPattern extends AnthropicModelCapabilities {
  match: (model: string) => boolean;
}

/**
 * Canonical Anthropic capability table for model families whose current token
 * limits are explicitly documented by Anthropic. More-specific models should
 * stay before broader family matchers.
 */
const CAPABILITY_PATTERNS: CapabilityPattern[] = [
  {
    match: (m) => isFamily(m, "claude-fable-5"),
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "claude-mythos-5"),
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "claude-opus-5"),
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "claude-sonnet-5"),
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "claude-opus-4-8"),
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "claude-opus-4-7"),
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "claude-opus-4-6"),
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "claude-sonnet-4-6"),
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) =>
      isFamily(m, "claude-haiku-4-5-20251001") ||
      m === "claude-haiku-4-5",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    lifecycle: "current",
  },
];

export function getAnthropicModelCapabilities(
  model: string | undefined,
): AnthropicModelCapabilities | undefined {
  const normalized = model?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return undefined;
  }

  const match = CAPABILITY_PATTERNS.find((pattern) => pattern.match(normalized));
  if (!match) {
    return undefined;
  }

  return {
    contextWindow: match.contextWindow,
    maxOutputTokens: match.maxOutputTokens,
    lifecycle: match.lifecycle,
  };
}

function isFamily(model: string, family: string): boolean {
  return model === family || model.startsWith(`${family}-`);
}
