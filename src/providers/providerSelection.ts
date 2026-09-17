import { resolveProviderSelectionModel } from "./providerDefaults";
import {
  normalizeProviderName,
  ProviderName,
} from "./providerNamePolicy";

export interface ProviderSelection {
  provider: ProviderName;
  model: string;
}

/**
 * Canonicalizes provider/model pairs before cache identity, generation, and UI
 * persistence. This prevents a stale model selected for one provider from being
 * cached under one ID while the provider silently executes another fallback.
 */
export function resolveProviderSelection(
  providerValue: string | undefined,
  modelValue: string | undefined,
): ProviderSelection {
  const provider = normalizeProviderName(providerValue);
  const requestedModel = modelValue?.trim();

  if (provider === "custom") {
    return {
      provider,
      model: requestedModel || "default",
    };
  }

  return {
    provider,
    model: resolveProviderSelectionModel(provider, requestedModel),
  };
}
