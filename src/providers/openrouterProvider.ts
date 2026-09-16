import * as vscode from "vscode";
import axios from "axios";
import {
  BaseAIProvider,
  ApiCallParams,
  RawMarkdownPromptParams,
} from "./aiProvider";
import { DocumentationContext, DocumentationResult } from "../types";
import { normalizeProviderModel } from "./providerModelGuard";
import { capRequestedOutputTokens } from "./outputTokenLimit";
import { parseOpenAICompatibleResponse } from "./openAICompatibleResponse";
import { runProviderRequestWithRetry } from "./providerRetry";
import { CLOUD_PROVIDER_REQUEST_TIMEOUT_MS } from "./providerRequestPolicy";
import { PROVIDER_DEFAULT_MODELS } from "./providerDefaults";
import { normalizeProviderRequestError } from "./providerHttpError";
import {
  getOpenRouterContextWindow,
  getOpenRouterMaxOutputTokens,
} from "./openRouterCapabilities";

/**
 * OpenRouter provider — routes requests to 100+ models via a single API key.
 * Wire format is OpenAI-compatible; only the base URL and headers differ.
 * https://openrouter.ai/docs
 */
export class OpenRouterProvider extends BaseAIProvider {
  name = "openrouter";
  isLocal = false;

  private readonly endpoint = "https://openrouter.ai/api/v1/chat/completions";

  protected defaultModel(): string {
    return PROVIDER_DEFAULT_MODELS.openrouter;
  }

  public async generateDocumentation(
    context: DocumentationContext,
  ): Promise<DocumentationResult> {
    return super.generateDocumentation({
      ...context,
      model: this.resolveCompatibleModel(context.model),
    });
  }

  public async generateMarkdownFromPrompt(
    params: RawMarkdownPromptParams,
  ): Promise<DocumentationResult> {
    return super.generateMarkdownFromPrompt({
      ...params,
      model: this.resolveCompatibleModel(params.model),
    });
  }

  private resolveCompatibleModel(requestedModel?: string): string {
    const configuredModel = vscode.workspace
      .getConfiguration("aiDocGenerator")
      .get<string>("model");
    return normalizeProviderModel(
      "openrouter",
      requestedModel ?? configuredModel,
      this.defaultModel(),
    );
  }

  protected async callApi(params: ApiCallParams): Promise<DocumentationResult> {
    try {
      const response = await runProviderRequestWithRetry(
        () =>
          axios.post(
            this.endpoint,
            {
              model: params.model,
              messages: params.messages,
              temperature: this.temperature,
              max_tokens: capRequestedOutputTokens(params.maxTokens),
            },
            {
              headers: {
                Authorization: `Bearer ${params.apiKey}`,
                "Content-Type": "application/json",
                // Recommended by OpenRouter for rate-limit tier identification
                "HTTP-Referer": "https://github.com/Wonderer-Tech/documint",
                "X-Title": "Documint",
              },
              timeout: CLOUD_PROVIDER_REQUEST_TIMEOUT_MS,
              signal: params.signal,
            },
          ),
        { signal: params.signal },
      );

      const parsed = parseOpenAICompatibleResponse(response.data, "OpenRouter");
      return {
        ...parsed,
        model: params.model,
      };
    } catch (error) {
      throw normalizeProviderRequestError(error, "OpenRouter");
    }
  }

  protected getMaxOutputTokens(model?: string): number {
    return getOpenRouterMaxOutputTokens(model);
  }

  getMaxContextWindow(model?: string): number {
    return getOpenRouterContextWindow(model);
  }
}
