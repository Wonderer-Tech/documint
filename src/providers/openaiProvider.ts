import * as vscode from "vscode";
import axios from "axios";
import { BaseAIProvider, ApiCallParams } from "./aiProvider";
import { DocumentationResult } from "../types";
import { normalizeProviderModel } from "./providerModelGuard";
import { capRequestedOutputTokens } from "./outputTokenLimit";
import { parseOpenAICompatibleResponse } from "./openAICompatibleResponse";
import { runProviderRequestWithRetry } from "./providerRetry";
import { CLOUD_PROVIDER_REQUEST_TIMEOUT_MS } from "./providerRequestPolicy";
import { normalizeProviderRequestError } from "./providerHttpError";
import { PROVIDER_DEFAULT_MODELS } from "./providerDefaults";
import { getOpenAIModelCapabilities } from "./openAICapabilities";

/**
 * Model aliases map known shorthand names to their full OpenAI model IDs.
 * This allows users to type "gpt-4o-mini" or "4o-mini" and get the correct model.
 */
const MODEL_ALIASE: Record<string, string> = {
  // GPT-4o family
  "gpt-4o": "gpt-4o",
  "4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "4o-mini": "gpt-4o-mini",
  "gpt-4o-2024-05-13": "gpt-4o-2024-05-13",
  "gpt-4o-2024-08-06": "gpt-4o-2024-08-06",
  "gpt-4o-mini-2024-07-18": "gpt-4o-mini-2024-07-18",
  // GPT-4.1 family
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-nano": "gpt-4.1-nano",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "4.1": "gpt-4.1",
  "4.1-nano": "gpt-4.1-nano",
  "4.1-mini": "gpt-4.1-mini",
  // GPT-4 Turbo
  "gpt-4-turbo": "gpt-4-turbo",
  "gpt-4-turbo-preview": "gpt-4-turbo-preview",
  "gpt-4-0125-preview": "gpt-4-0125-preview",
  "gpt-4-1106-preview": "gpt-4-1106-preview",
  "4-turbo": "gpt-4-turbo",
  // GPT-4 base
  "gpt-4": "gpt-4",
  "gpt-4-32k": "gpt-4-32k",
  "gpt-4-0613": "gpt-4-0613",
  "4": "gpt-4",
  // GPT-3.5
  "gpt-3.5-turbo": "gpt-3.5-turbo",
  "gpt-3.5-turbo-0125": "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-1106": "gpt-3.5-turbo-1106",
  "3.5-turbo": "gpt-3.5-turbo",
  "3.5": "gpt-3.5-turbo",
  // o1 series
  o1: "o1",
  "o1-mini": "o1-mini",
  "o1-preview": "o1-preview",
  "o1-2024-12-17": "o1-2024-12-17",
  "o1-mini-2024-09-12": "o1-mini-2024-09-12",
  // o3 series
  o3: "o3",
  "o3-mini": "o3-mini",
  "o3-mini-2025-01-31": "o3-mini-2025-01-31",
  // GPT-5 family
  "gpt-5": "gpt-5",
  "gpt-5-nano": "gpt-5-nano",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5.4-nano": "gpt-5.4-nano",
  "gpt-5.4-mini": "gpt-5.4-mini",
  "gpt-5.4": "gpt-5.4",
  "5": "gpt-5",
  "5-nano": "gpt-5-nano",
  "5-mini": "gpt-5-mini",
};

export class OpenAIProvider extends BaseAIProvider {
  name = "openai";
  isLocal = false;

  private readonly endpoint = "https://api.openai.com/v1/chat/completions";

  /**
   * Resolves a model name to its canonical OpenAI ID using the alias map.
   * Clearly foreign provider models fall back to the OpenAI default.
   */
  private resolveModelName(model: string): string {
    const compatibleModel = normalizeProviderModel(
      "openai",
      model,
      this.defaultModel(),
    );
    const lower = compatibleModel.toLowerCase().trim();
    return MODEL_ALIASE[lower] ?? compatibleModel;
  }

  protected defaultModel(): string {
    return PROVIDER_DEFAULT_MODELS.openai;
  }

  /**
   * Returns true for models that require `max_completion_tokens` instead of
   * `max_tokens` and do not support the `temperature` parameter.
   * Applies to: o1, o3, gpt-4.1 family, gpt-5 family.
   */
  private usesCompletionTokensParam(model: string): boolean {
    const m = model.toLowerCase();
    return (
      m.startsWith("o1") ||
      m.startsWith("o3") ||
      m.includes("gpt-4.1") ||
      m.includes("gpt-4-1") ||
      m.includes("gpt-5")
    );
  }

  protected async callApi(params: ApiCallParams): Promise<DocumentationResult> {
    const resolvedModel = this.resolveModelName(params.model);
    const newStyleTokens = this.usesCompletionTokensParam(resolvedModel);
    const maxTokens = capRequestedOutputTokens(params.maxTokens);

    // Build request body — newer models use max_completion_tokens, not max_tokens,
    // and do not accept the temperature parameter.
    const body: Record<string, unknown> = {
      model: resolvedModel,
      messages: params.messages,
      ...(newStyleTokens
        ? { max_completion_tokens: maxTokens }
        : { temperature: this.temperature, max_tokens: maxTokens }),
    };

    try {
      const response = await runProviderRequestWithRetry(
        () =>
          axios.post(this.endpoint, body, {
            headers: {
              Authorization: `Bearer ${params.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: CLOUD_PROVIDER_REQUEST_TIMEOUT_MS,
            signal: params.signal,
          }),
        { signal: params.signal },
      );

      const parsed = parseOpenAICompatibleResponse(response.data, "OpenAI");
      return {
        ...parsed,
        model: resolvedModel,
      };
    } catch (error) {
      throw normalizeProviderRequestError(error, "OpenAI");
    }
  }

  protected getMaxOutputTokens(model?: string): number {
    const resolvedModel = this.resolveModelName(model || this.defaultModel());
    return getOpenAIModelCapabilities(resolvedModel)?.maxOutputTokens ?? 8192;
  }

  getMaxContextWindow(model?: string): number {
    const resolvedModel = this.resolveModelName(model || this.defaultModel());
    return getOpenAIModelCapabilities(resolvedModel)?.contextWindow ?? 8192;
  }
}
