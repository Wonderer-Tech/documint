import { PROVIDER_DEFAULT_MODELS } from "./providerDefaults";

export type LocalPresetProviderName = "ollama" | "lmstudio";

export interface LocalPresetProviderDefinition {
  name: LocalPresetProviderName;
  label: string;
  chatCompletionsEndpoint: string;
  modelsEndpoint: string;
}

const LOCAL_PRESET_DEFINITIONS: Record<
  LocalPresetProviderName,
  LocalPresetProviderDefinition
> = {
  ollama: {
    name: "ollama",
    label: "Ollama",
    chatCompletionsEndpoint:
      "http://127.0.0.1:11434/v1/chat/completions",
    modelsEndpoint: "http://127.0.0.1:11434/v1/models",
  },
  lmstudio: {
    name: "lmstudio",
    label: "LM Studio",
    chatCompletionsEndpoint:
      "http://127.0.0.1:1234/v1/chat/completions",
    modelsEndpoint: "http://127.0.0.1:1234/v1/models",
  },
};

const CLOUD_DEFAULT_MODEL_IDS = new Set(
  Object.values(PROVIDER_DEFAULT_MODELS).map((value) =>
    value.toLowerCase(),
  ),
);

export function getLocalPresetDefinition(
  provider: LocalPresetProviderName,
): LocalPresetProviderDefinition {
  return LOCAL_PRESET_DEFINITIONS[provider];
}

/**
 * Keeps local presets from inheriting the extension's contributed cloud-model
 * default when no local model has been selected yet. Any non-empty local/user
 * model name is otherwise preserved verbatim.
 */
export function resolveLocalPresetModel(
  requestedModel: string | undefined,
  configuredModel?: string | undefined,
): string {
  for (const value of [requestedModel, configuredModel]) {
    const candidate = value?.trim();
    if (!candidate) {
      continue;
    }
    if (CLOUD_DEFAULT_MODEL_IDS.has(candidate.toLowerCase())) {
      continue;
    }
    return candidate;
  }
  return "";
}

export function localPresetModelRequiredMessage(
  provider: LocalPresetProviderName,
): string {
  const definition = getLocalPresetDefinition(provider);
  return (
    `Set "documint.model" to a model served by ${definition.label} before generating documentation.`
  );
}
