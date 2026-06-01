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
  // Ollama / local common models
  "llama3": 8192,
  "llama3.1": 131072,
  "llama3.2": 131072,
  "mistral": 32768,
  "mixtral": 32768,
  "codellama": 16384,
  "gemma2": 8192,
  "phi3": 4096,
  "qwen2": 32768,
  "deepseek-coder": 16384,
};

export class ModelMetadataService {
  private static instance: ModelMetadataService;
  private cache = new Map<string, ModelMetadata>();

  private constructor(private context: vscode.ExtensionContext) {}

  static getInstance(context: vscode.ExtensionContext): ModelMetadataService {
    if (!ModelMetadataService.instance) {
      ModelMetadataService.instance = new ModelMetadataService(context);
    }
    return ModelMetadataService.instance;
  }

  /**
   * Fetches the context window for a given provider + model.
   * Tries the provider's API first, falls back to known values, then a safe default.
   */
  async fetchContextWindow(
    provider: string,
    model: string,
  ): Promise<ModelMetadata> {
    if (!model.trim()) {
      return { contextWindow: 8192, source: "estimated" };
    }

    const cacheKey = `${provider}:${model}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let result: ModelMetadata;

    try {
      const secretManager = SecretStorageManager.getInstance(this.context);
      const apiKey = (await secretManager.getApiKey(provider)) || "";

      switch (provider) {
        case "openai":
          result = await this.fetchOpenAI(model, apiKey);
          break;
        case "anthropic":
          result = await this.fetchAnthropic(model, apiKey);
          break;
        case "openrouter":
          result = await this.fetchOpenRouter(model, apiKey);
          break;
        case "ollama":
          result = await this.fetchOllama(model);
          break;
        case "lmstudio":
          result = await this.fetchLMStudio(model);
          break;
        default:
          result = this.estimateFallback(model);
      }
    } catch {
      result = this.estimateFallback(model);
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  /** Clears the cache — call when provider/key changes */
  clearCache(): void {
    this.cache.clear();
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
      const cw =
        res.data?.context_window ?? res.data?.max_tokens_input;
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

  private async fetchOllama(model: string): Promise<ModelMetadata> {
    const baseUrl =
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("localModelUrl") || "http://localhost:11434";
    try {
      const res = await axios.post(
        `${baseUrl}/api/show`,
        { name: model },
        { timeout: 6000 },
      );
      // Ollama returns model_info with llama.context_length for GGUF models
      const cw =
        res.data?.model_info?.["llama.context_length"] ??
        res.data?.parameters?.num_ctx ??
        res.data?.template_context_length;
      if (typeof cw === "number" && cw > 0) {
        return { contextWindow: cw, source: "api" };
      }
    } catch {
      // fall through
    }
    return this.estimateFallback(model);
  }

  private async fetchLMStudio(model: string): Promise<ModelMetadata> {
    const baseUrl =
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("localModelUrl") || "http://localhost:1234";
    try {
      const res = await axios.get(`${baseUrl}/v1/models`, { timeout: 6000 });
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
    if (m.includes("200k") || m.includes("claude")) return { contextWindow: 200000, source: "estimated" };
    if (m.includes("128k") || m.includes("gpt-5") || m.includes("gpt-4o") || m.includes("o1") || m.includes("o3")) return { contextWindow: 128000, source: "estimated" };
    if (m.includes("32k") || m.includes("mistral") || m.includes("mixtral")) return { contextWindow: 32768, source: "estimated" };
    if (m.includes("16k")) return { contextWindow: 16385, source: "estimated" };
    if (m.includes("turbo")) return { contextWindow: 128000, source: "estimated" };

    // Safe conservative default
    return { contextWindow: 8192, source: "estimated" };
  }
}
