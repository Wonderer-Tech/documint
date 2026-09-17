export const GENERATION_CACHE_POLICY_VERSION = "generation-cache-policy-v7";
/**
 * Bump whenever generation prompts, evidence formatting, validation rules,
 * provider capability limits, or other release-level generation semantics
 * materially change generated documentation. This invalidates persisted AI
 * sections even when provider/model settings and source files are unchanged.
 */
export const GENERATION_PROMPT_SCHEMA_VERSION = "documint-prompts-2026-09-17";

export interface GenerationCacheIdentityInput {
  providerName: string;
  model?: string;
  depth?: string;
  contextWindow?: number;
  customApiEndpoint?: string;
}

export interface GenerationCacheSettings {
  model?: string;
  documentationDepth?: string;
  maxTokens?: number;
  temperature?: number;
  customApiEndpoint?: string;
}

export interface GenerationCacheIdentity {
  version: string;
  promptSchemaVersion: string;
  provider: string;
  model: string;
  depth: string;
  maxTokens: number;
  temperature: number;
  contextWindow: number | null;
  customApiEndpoint: string;
}

export function buildGenerationCacheIdentity(
  settings: GenerationCacheSettings,
  input: GenerationCacheIdentityInput,
): GenerationCacheIdentity {
  const provider = input.providerName.trim().toLowerCase() || "openai";
  const model = input.model?.trim() || settings.model?.trim() || "";
  const depth =
    input.depth?.trim() || settings.documentationDepth?.trim() || "standard";
  const maxTokens = normalizePositiveInteger(settings.maxTokens, 4000);
  const temperature = normalizeFiniteNumber(settings.temperature, 0.3);
  const contextWindow =
    Number.isFinite(input.contextWindow) && (input.contextWindow ?? 0) > 0
      ? Math.floor(input.contextWindow!)
      : null;
  const customApiEndpoint =
    provider === "custom"
      ? input.customApiEndpoint?.trim() ||
        settings.customApiEndpoint?.trim() ||
        ""
      : "";

  return {
    version: GENERATION_CACHE_POLICY_VERSION,
    promptSchemaVersion: GENERATION_PROMPT_SCHEMA_VERSION,
    provider,
    model,
    depth,
    maxTokens,
    temperature,
    contextWindow,
    customApiEndpoint,
  };
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.floor(value!)
    : fallback;
}

function normalizeFiniteNumber(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isFinite(value) ? value! : fallback;
}
