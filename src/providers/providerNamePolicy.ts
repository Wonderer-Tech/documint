export type ProviderName =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "deepseek"
  | "custom";

const PROVIDER_NAMES = new Set<ProviderName>([
  "openai",
  "anthropic",
  "openrouter",
  "deepseek",
  "custom",
]);

/**
 * Normalizes persisted/sidebar provider values before consent and factory use.
 * Unknown or empty values fall back to OpenAI so the provider shown to the user
 * always matches the provider that will actually execute the request.
 */
export function normalizeProviderName(value: string | undefined): ProviderName {
  const normalized = value?.trim().toLowerCase() as ProviderName | undefined;
  return normalized && PROVIDER_NAMES.has(normalized) ? normalized : "openai";
}
