import * as vscode from "vscode";
import axios from "axios";
import { SecretStorageManager } from "../config/secretStorage";
import {
  estimateModelContextWindow,
  getKnownModelContext,
} from "./modelContextCatalog";

export interface ModelMetadata {
  contextWindow: number;
  source: "api" | "estimated";
}

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
   * Exact known current/legacy models resolve locally first. Unknown models may
   * query provider metadata APIs before falling back to conservative inference.
   * Concurrent callers for the same provider/model/key revision share one lookup.
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

    const known = getKnownModelContext(normalizedModel);
    if (known) {
      return {
        contextWindow: known.contextWindow,
        source: "estimated",
      };
    }

    const credentialRevision =
      SecretStorageManager.getCredentialRevision(normalizedProvider);
    const cacheKey = `${normalizedProvider}:${credentialRevision}:${normalizedModel}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
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

  /** Clears cached and in-flight metadata state explicitly when required. */
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
      const contextWindow = res.data?.context_window;
      if (typeof contextWindow === "number" && contextWindow > 0) {
        return { contextWindow, source: "api" };
      }
    } catch {
      // Fall through to the local estimate.
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
      const contextWindow =
        res.data?.context_window ?? res.data?.max_tokens_input;
      if (typeof contextWindow === "number" && contextWindow > 0) {
        return { contextWindow, source: "api" };
      }
    } catch {
      // Fall through to the local estimate.
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
      const res = await axios.get("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 6000,
      });
      const entry = res.data?.data?.find(
        (candidate: { id: string; context_length?: number }) =>
          candidate.id === model,
      );
      if (entry?.context_length) {
        return { contextWindow: entry.context_length, source: "api" };
      }
    } catch {
      // Fall through to the local estimate.
    }

    return this.estimateFallback(model);
  }

  private estimateFallback(model: string): ModelMetadata {
    return {
      contextWindow: estimateModelContextWindow(model),
      source: "estimated",
    };
  }
}
