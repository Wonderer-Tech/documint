export interface OpenAIModelCapabilities {
  contextWindow: number;
  maxOutputTokens: number;
  lifecycle: "current" | "legacy";
}

interface CapabilityPattern extends OpenAIModelCapabilities {
  match: (model: string) => boolean;
}

/**
 * Canonical OpenAI model capability table used by both provider request
 * budgeting and shared model metadata. Keep more-specific families before
 * broader matchers so Mini/Nano variants cannot inherit flagship limits.
 *
 * Values for GPT-4.1, GPT-5, GPT-5.4, GPT-5.6, and o4-mini are aligned with
 * current OpenAI model documentation. Older families retain DocuMint's
 * compatibility limits until their support is intentionally removed.
 */
const CAPABILITY_PATTERNS: CapabilityPattern[] = [
  {
    match: (m) => isFamily(m, "gpt-5.6"),
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "gpt-5.4-nano"),
    contextWindow: 400000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "gpt-5.4-mini"),
    contextWindow: 400000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "gpt-5.4"),
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "gpt-5-nano") || m === "5-nano",
    contextWindow: 400000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "gpt-5-mini") || m === "5-mini",
    contextWindow: 400000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) => isFamily(m, "gpt-5") || m === "5",
    contextWindow: 400000,
    maxOutputTokens: 128000,
    lifecycle: "current",
  },
  {
    match: (m) =>
      isFamily(m, "gpt-4.1-nano") ||
      isFamily(m, "gpt-4-1-nano") ||
      m === "4.1-nano",
    contextWindow: 1047576,
    maxOutputTokens: 32768,
    lifecycle: "current",
  },
  {
    match: (m) =>
      isFamily(m, "gpt-4.1-mini") ||
      isFamily(m, "gpt-4-1-mini") ||
      m === "4.1-mini",
    contextWindow: 1047576,
    maxOutputTokens: 32768,
    lifecycle: "current",
  },
  {
    match: (m) =>
      isFamily(m, "gpt-4.1") ||
      isFamily(m, "gpt-4-1") ||
      m === "4.1",
    contextWindow: 1047576,
    maxOutputTokens: 32768,
    lifecycle: "current",
  },
  {
    match: (m) => m.includes("gpt-4o-mini"),
    contextWindow: 128000,
    maxOutputTokens: 16384,
    lifecycle: "current",
  },
  {
    match: (m) => m.includes("gpt-4o"),
    contextWindow: 128000,
    maxOutputTokens: 16384,
    lifecycle: "current",
  },
  {
    match: (m) => /^o4-mini(?:-\d{4}-\d{2}-\d{2})?$/.test(m),
    contextWindow: 200000,
    maxOutputTokens: 100000,
    lifecycle: "current",
  },
  {
    match: (m) => m.includes("o1-mini"),
    contextWindow: 128000,
    maxOutputTokens: 65536,
    lifecycle: "legacy",
  },
  {
    match: (m) => m.includes("o1-preview"),
    contextWindow: 128000,
    maxOutputTokens: 32768,
    lifecycle: "legacy",
  },
  {
    match: (m) => m === "o1" || m.startsWith("o1-"),
    contextWindow: 200000,
    maxOutputTokens: 100000,
    lifecycle: "current",
  },
  {
    match: (m) => m.includes("o3-mini"),
    contextWindow: 128000,
    maxOutputTokens: 65536,
    lifecycle: "current",
  },
  {
    match: (m) => m === "o3" || m.startsWith("o3-"),
    contextWindow: 200000,
    maxOutputTokens: 100000,
    lifecycle: "current",
  },
  {
    match: (m) =>
      m.includes("gpt-4-turbo") ||
      m.includes("gpt-4-0125") ||
      m.includes("gpt-4-1106"),
    contextWindow: 128000,
    maxOutputTokens: 4096,
    lifecycle: "legacy",
  },
  {
    match: (m) => m.includes("gpt-4-32k"),
    contextWindow: 32768,
    maxOutputTokens: 8192,
    lifecycle: "legacy",
  },
  {
    match: (m) =>
      m.includes("gpt-4") &&
      !m.includes("turbo") &&
      !m.includes("4o") &&
      !m.includes("4.1") &&
      !m.includes("4-1"),
    contextWindow: 8192,
    maxOutputTokens: 8192,
    lifecycle: "legacy",
  },
  {
    match: (m) => m.includes("gpt-3.5"),
    contextWindow: 16385,
    maxOutputTokens: 4096,
    lifecycle: "legacy",
  },
];

export function getOpenAIModelCapabilities(
  model: string | undefined,
): OpenAIModelCapabilities | undefined {
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
