import type { GuardedProviderName } from "./providerModelGuard";

export const PROVIDER_DEFAULT_MODELS: Record<GuardedProviderName, string> = {
  openai: "gpt-5.4-nano",
  anthropic: "claude-sonnet-5",
  openrouter: "openai/gpt-4o",
  deepseek: "deepseek-flash",
};

export function resolveProviderSelectionModel(
  provider: GuardedProviderName,
  currentModel: string | undefined,
): string {
  const requested = currentModel?.trim();
  if (!requested) {
    return PROVIDER_DEFAULT_MODELS[provider];
  }

  const model = requested.toLowerCase();

  if (provider === "openai") {
    return model.startsWith("claude-") ||
      model.startsWith("deepseek-") ||
      model.includes("/")
      ? PROVIDER_DEFAULT_MODELS.openai
      : requested;
  }

  if (provider === "anthropic") {
    return model.startsWith("gpt-") ||
      model.startsWith("o1") ||
      model.startsWith("o3") ||
      model.startsWith("deepseek-") ||
      model.includes("/")
      ? PROVIDER_DEFAULT_MODELS.anthropic
      : requested;
  }

  if (provider === "deepseek") {
    return model.startsWith("deepseek-")
      ? requested
      : PROVIDER_DEFAULT_MODELS.deepseek;
  }

  if (model.includes("/")) {
    return requested;
  }

  return model.startsWith("gpt-") ||
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("claude-") ||
    model.startsWith("deepseek-")
    ? PROVIDER_DEFAULT_MODELS.openrouter
    : requested;
}
