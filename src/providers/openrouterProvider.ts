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
    return "openai/gpt-4o";
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
  }

  protected getMaxOutputTokens(model?: string): number {
    const m = (model || "").toLowerCase();
    if (m.includes("gpt-4o") || m.includes("o1") || m.includes("o3")) {
      return 16384;
    }
    if (m.includes("claude-3-5") || m.includes("claude-3.5")) {
      return 8192;
    }
    if (m.includes("gemini-1.5") || m.includes("gemini-2")) {
      return 8192;
    }
    // Safe default for unknown OpenRouter models
    return 4096;
  }

  /**
   * OpenRouter routes to many models — use a generous default.
   * Users can paste any context window for the model they select.
   */
  getMaxContextWindow(model?: string): number {
    const m = (model || "").toLowerCase();
    if (m.includes("claude-3") || m.includes("gemini")) {
      return 200000;
    }
    if (m.includes("gpt-4o") || m.includes("o1") || m.includes("o3")) {
      return 128000;
    }
    if (m.includes("gpt-4-turbo") || m.includes("turbo")) {
      return 128000;
    }
    if (m.includes("gpt-3.5")) {
      return 16385;
    }
    if (m.includes("mistral") || m.includes("mixtral")) {
      return 32000;
    }
    if (m.includes("llama")) {
      return 8192;
    }
    return 32000; // Conservative default for unknown models
  }
}
