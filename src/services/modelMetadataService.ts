import * as vscode from "vscode";
import axios from "axios";
import { SecretStorageManager } from "../config/secretStorage";

export interface ModelMetadata {
  contextWindow: number;
  source: "api" | "estimated";
}

// Hardcoded fallbacks — used when API is unreachable or key is missing
const FALLBACK_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI
  "gpt-5.4-nano": 128000,
  "gpt-5.4-mini": 128000,
  "gpt-5.4": 200000,
  "gpt-5-nano": 128000,
  "gpt-5-mini": 128000,
  "gpt-5": 200000,
  "gpt-4o": 128000,
  "gpt-4o-mini": 128000,
  "gpt-4-turbo": 128000,
  "gpt-4": 8192,
  "gpt-3.5-turbo": 16385,
  "o1": 200000,
  "o1-mini": 128000,
  "o3": 200000,
  "o3-mini": 200000,
  // Anthropic
  "claude-3-5-sonnet-20241022": 200000,
  "claude-3-5-haiku-20241022": 200000,
  "claude-3-opus-20240229": 200000,
  "claude-3-sonnet-20240229": 200000,
  "claude-3-haiku-20240307": 200000,
  "claude-2.1": 200000,
  "claude-2.0": 100000,
  // DeepSeek — V4/V4.1 official API models use a 1M context window.
  "deepseek-flash": 1000000,
  "deepseek-v4-flash": 1000000,
  "deepseek-v4-pro": 1000000,
};

export class ModelMetadataService {
  private static instance: ModelMetadataService;
  private cache = new Map<string, ModelMetadata>();
  private pending = new Map<string, Promise<ModelMetadata>>();

  private constructor(private context: vscode.ExtensionContext) {}

  static getInstance(context: vscode.ExtensionContext): ModelMetadataService {
    if (!ModelMetadataService.instance) {
      ModelMetadataService.instance = new ModelMetadataService(context);
    }
    return ModelMetadataService.instance;
  }

  /**
   * Fetches the context window for a given provider + model.
   * Known models resolve locally first; unknown models may query provider metadata
   * APIs before falling back to conservative estimates. Concurrent callers for the
   * same provider/model share one in-flight lookup.
   */
  async fetchContextWindow(
    provider: string,
    model: string,
  ): Promise<ModelMetadata> {
    const normalizedProvider = provider.trim().toLowerCase();
    const normalizedModel = model.trim().toLowerCase();
    if (!normalizedModel) {
      return { contextWindow: 8192, source: "estimated" };
    }

    const cacheKey = `${normalizedProvider}:${normalizedModel}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const knownContextWindow = FALLBACK_CONTEXT_WINDOWS[normalizedModel];
    if (knownContextWindow) {
      const knownResult: ModelMetadata = {
        contextWindow: knownContextWindow,
        source: "estimated",
      };
      this.cache.set(cacheKey, knownResult);
      return knownResult;
    }

    const inFlight = this.pending.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const lookup = this.fetchUncached(normalizedProvider, model)
      .then((result) => {
        this.cache.set(cacheKey, result);
        return result;
      })
      .finally(() => {
        this.pending.delete(cacheKey);
      });

    this.pending.set(cacheKey, lookup);
    return lookup;
  }

  /** Clears cached and in-flight metadata state — call when provider/key changes. */
  clearCache(): void {
    this.cache.clear();
    this.pending.clear();
  }

  private async fetchUncached(
    provider: string,
    model: string,
  ): Promise<ModelMetadata> {
    try {
      const secretManager = SecretStorageManager.getInstance(this.context);
      const apiKey = (await secretManager.getApiKey(provider)) || "";

      switch (provider) {
        case "openai":
          return await this.fetchOpenAI(model, apiKey);
        case "anthropic":
          return await this.fetchAnthropic(model, apiKey);
        case "openrouter":
          return await this.fetchOpenRouter(model, apiKey);
        default:
          return this.estimateFallback(model);
      }
    } catch {
      return this.estimateFallback(model);
    }
  }

  // ── Provider implementations ───────────────────────────────────────────────

  private async fetchOpenAI(
    model: string,
    apiKey: string,
  ): Promise<ModelMetadata> {
    if (!apiKey) {
      return this.estimateFallback(model);
    }
    try {
      const res = await axios.get(
        `https://api.openai.com/v1/models/${encodeURIComponent(model)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 6000,
        },
      );
      const cw = res.data?.context_window;
      if (typeof cw === "number" && cw > 0) {
        return { contextWindow: cw, source: "api" };
      }
    } catch {
      // fall through
    }
    return this.estimateFallback(model);
  }

  private async fetchAnthropic(
    model: string,
    apiKey: string,
  ): Promise<ModelMetadata> {
    if (!apiKey) {
      return this.estimateFallback(model);
    }
    try {
      const res = await axios.get(
        `https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`,
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          timeout: 6000,
        },
      );
      const cw = res.data?.context_window ?? res.data?.max_tokens_input;
      if (typeof cw === "number" && cw > 0) {
        return { contextWindow: cw, source: "api" };
      }
    } catch {
      // fall through
    }
    return this.estimateFallback(model);
  }

  private async fetchOpenRouter(
    model: string,
    apiKey: string,
  ): Promise<ModelMetadata> {
    if (!apiKey) {
      return this.estimateFallback(model);
    }
    try {
      // OpenRouter exposes model metadata at /api/v1/models
      const res = await axios.get("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 6000,
      });
      const entry = res.data?.data?.find(
        (m: { id: string; context_length?: number }) => m.id === model,
      );
      if (entry?.context_length) {
        return { contextWindow: entry.context_length, source: "api" };
      }
    } catch {
      // fall through
    }
    return this.estimateFallback(model);
  }

  // ── Fallback logic ─────────────────────────────────────────────────────────

  private estimateFallback(model: string): ModelMetadata {
    const m = model.toLowerCase();

    // Exact match first
    if (FALLBACK_CONTEXT_WINDOWS[m]) {
      return { contextWindow: FALLBACK_CONTEXT_WINDOWS[m], source: "estimated" };
    }

    // Partial match — check if model name contains a known key
    for (const [key, tokens] of Object.entries(FALLBACK_CONTEXT_WINDOWS)) {
      if (m.includes(key)) {
        return { contextWindow: tokens, source: "estimated" };
      }
    }

    // Pattern-based inference for unknown model names
    if (m.includes("deepseek-v4") || m.includes("deepseek-flash")) {
      return { contextWindow: 1000000, source: "estimated" };
    }
    if (m.includes("200k") || m.includes("claude")) {
      return { contextWindow: 200000, source: "estimated" };
    }
    if (
      m.includes("128k") ||
      m.includes("gpt-5") ||
      m.includes("gpt-4o") ||
      m.includes("o1") ||
      m.includes("o3")
    ) {
      return { contextWindow: 128000, source: "estimated" };
    }
    if (m.includes("32k")) {
      return { contextWindow: 32768, source: "estimated" };
    }
    if (m.includes("16k")) {
      return { contextWindow: 16385, source: "estimated" };
    }
    if (m.includes("turbo")) {
      return { contextWindow: 128000, source: "estimated" };
    }

    // Safe conservative default
    return { contextWindow: 8192, source: "estimated" };
  }
}
