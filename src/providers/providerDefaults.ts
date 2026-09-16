import {
  GuardedProviderName,
  normalizeProviderModel,
} from "./providerModelGuard";

export const PROVIDER_DEFAULT_MODELS: Record<GuardedProviderName, string> = {
  openai: "gpt-5.4-nano",
  anthropic: "claude-sonnet-5",
  openrouter: "openai/gpt-4o",
  deepseek: "deepseek-flash",
};

/**
 * Resolves the model shown after a provider switch using the exact same
 * compatibility policy enforced again at runtime by concrete providers.
 */
export function resolveProviderSelectionModel(
  provider: GuardedProviderName,
  currentModel: string | undefined,
): string {
  return normalizeProviderModel(
    provider,
    currentModel,
    PROVIDER_DEFAULT_MODELS[provider],
  );
}
