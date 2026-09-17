export type GuardedProviderName =
  | "openai"
  | "anthropic"
  | "deepseek"
  | "openrouter";

const RETIRED_OPENAI_MODELS = new Set([
  "gpt-3.5-turbo-0301",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-16k-0613",
  "gpt-4-0314",
  "gpt-4-0125-preview",
  "gpt-4-turbo-preview",
  "gpt-4-turbo-preview-completions",
  "gpt-4.5-preview",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-4-vision-preview",
  "gpt-4-1106-vision-preview",
]);

const RETIRED_ANTHROPIC_MODELS = new Set([
  "claude-opus-4-1-20250805",
  "claude-opus-4-20250514",
  "claude-sonnet-4-20250514",
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "claude-2.1",
  "claude-2.0",
  "claude-1.3",
  "claude-1.2",
  "claude-1.1",
  "claude-1.0",
  "claude-instant-1.2",
  "claude-instant-1.1",
  "claude-instant-1.0",
]);

/**
 * Prevents a model selected for one provider from being sent unchanged to
 * another provider after the user switches providers. Retired provider-native
 * model IDs are also replaced with the current provider fallback so saved old
 * configurations do not fail at request time.
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
    if (RETIRED_OPENAI_MODELS.has(model)) {
      return fallbackModel;
    }
    return isClearlyForeignToOpenAI(model) ? fallbackModel : requested;
  }

  if (provider === "anthropic") {
    if (RETIRED_ANTHROPIC_MODELS.has(model)) {
      return fallbackModel;
    }
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
