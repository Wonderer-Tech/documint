export type GuardedProviderName =
  | "openai"
  | "anthropic"
  | "deepseek"
  | "openrouter";

/**
 * Prevents a model selected for one provider from being sent unchanged to
 * another provider after the user switches providers. Only clearly foreign
 * model identifiers are replaced; provider-native/custom identifiers remain
 * untouched.
 */
export function normalizeProviderModel(
  provider: GuardedProviderName,
  requestedModel: string | undefined,
  fallbackModel: string,
): string {
  const requested = requestedModel?.trim();
  if (!requested) {
    return fallbackModel;
  }

  const model = requested.toLowerCase();

  if (provider === "openai") {
    return isClearlyForeignToOpenAI(model) ? fallbackModel : requested;
  }

  if (provider === "anthropic") {
    return isClearlyForeignToAnthropic(model) ? fallbackModel : requested;
  }

  if (provider === "deepseek") {
    if (model === "deepseek-chat" || model === "deepseek-reasoner") {
      return fallbackModel;
    }
    return model.startsWith("deepseek-") ? requested : fallbackModel;
  }

  return isClearlyForeignToOpenRouter(model) ? fallbackModel : requested;
}

function isClearlyForeignToOpenAI(model: string): boolean {
  return (
    model.startsWith("claude-") ||
    model.startsWith("deepseek-") ||
    model.includes("/")
  );
}

function isClearlyForeignToAnthropic(model: string): boolean {
  return (
    model.startsWith("gpt-") ||
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("deepseek-") ||
    model.includes("/")
  );
}

function isClearlyForeignToOpenRouter(model: string): boolean {
  if (model.includes("/")) {
    return false;
  }

  return (
    model.startsWith("gpt-") ||
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("claude-") ||
    model.startsWith("deepseek-")
  );
}
