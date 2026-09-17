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
import { getDeepSeekModelCapabilities } from "./deepSeekCapabilities";

/**
 * DeepSeek provider using the official OpenAI-compatible Chat Completions API.
 * Docs: https://api-docs.deepseek.com/
 */
export class DeepSeekProvider extends BaseAIProvider {
  name = "deepseek";
  isLocal = false;

  private readonly endpoint = "https://api.deepseek.com/chat/completions";

  protected defaultModel(): string {
    return PROVIDER_DEFAULT_MODELS.deepseek;
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
      "deepseek",
      requestedModel ?? configuredModel,
      this.defaultModel(),
    );
  }

  protected getMaxOutputTokens(model?: string): number {
    return (
      getDeepSeekModelCapabilities(model ?? this.defaultModel())
        ?.maxOutputTokens ?? 32768
    );
  }

  getMaxContextWindow(model?: string): number {
    return (
      getDeepSeekModelCapabilities(model ?? this.defaultModel())
        ?.contextWindow ?? 1000000
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
              stream: false,
              thinking: { type: "disabled" },
            },
            {
              headers: {
                Authorization: `Bearer ${params.apiKey}`,
                "Content-Type": "application/json",
              },
              timeout: CLOUD_PROVIDER_REQUEST_TIMEOUT_MS,
              signal: params.signal,
            },
          ),
        { signal: params.signal },
      );

      const parsed = parseOpenAICompatibleResponse(response.data, "DeepSeek");
      return {
        ...parsed,
        model: params.model,
      };
    } catch (error) {
      throw normalizeProviderRequestError(error, "DeepSeek");
    }
  }
}
