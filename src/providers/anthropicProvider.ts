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
import { runProviderRequestWithRetry } from "./providerRetry";
import { CLOUD_PROVIDER_REQUEST_TIMEOUT_MS } from "./providerRequestPolicy";
import { PROVIDER_DEFAULT_MODELS } from "./providerDefaults";

/**
 * Anthropic Claude provider.
 * Uses the /v1/messages endpoint with the system prompt as a top-level field.
 */
export class AnthropicProvider extends BaseAIProvider {
  name = "anthropic";
  isLocal = false;

  private readonly endpoint = "https://api.anthropic.com/v1/messages";
  private readonly apiVersion = "2023-06-01";

  protected defaultModel(): string {
    return PROVIDER_DEFAULT_MODELS.anthropic;
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
      "anthropic",
      requestedModel ?? configuredModel,
      this.defaultModel(),
    );
  }

  protected async callApi(params: ApiCallParams): Promise<DocumentationResult> {
    // Anthropic separates system from the messages array
    const systemMessage = params.messages.find((m) => m.role === "system");
    const userMessages = params.messages.filter((m) => m.role !== "system");

    const response = await runProviderRequestWithRetry(
      () =>
        axios.post(
          this.endpoint,
          {
            model: params.model,
            max_tokens: capRequestedOutputTokens(params.maxTokens),
            ...(systemMessage ? { system: systemMessage.content } : {}),
            messages: userMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
          {
            headers: {
              "x-api-key": params.apiKey,
              "anthropic-version": this.apiVersion,
              "Content-Type": "application/json",
            },
            timeout: CLOUD_PROVIDER_REQUEST_TIMEOUT_MS,
            signal: params.signal,
          },
        ),
      { signal: params.signal },
    );

    const tokensUsed =
      (response.data.usage?.input_tokens ?? 0) +
      (response.data.usage?.output_tokens ?? 0);
    const contentBlocks: unknown[] = Array.isArray(response.data.content)
      ? response.data.content
      : [];
    const documentation = contentBlocks
      .filter(
        (block: unknown): block is { type: string; text: string } =>
          typeof block === "object" &&
          block !== null &&
          (block as { type?: unknown }).type === "text" &&
          typeof (block as { text?: unknown }).text === "string",
      )
      .map((block) => block.text)
      .join("\n\n")
      .trim();

    if (!documentation) {
      throw new Error(
        `Anthropic returned no text content for model "${params.model}".`,
      );
    }

    return {
      documentation,
      tokensUsed,
      model: params.model,
    };
  }

  protected getMaxOutputTokens(model?: string): number {
    const m = (model || "").toLowerCase();
    if (m.includes("claude-sonnet-5") || m.includes("claude-opus-5")) {
      return 128000;
    }
    if (m.includes("claude-3-5") || m.includes("claude-3.5")) {
      return 8192;
    }
    return 4096;
  }

  getMaxContextWindow(model?: string): number {
    const m = (model || "").toLowerCase();
    if (m.includes("claude-sonnet-5") || m.includes("claude-opus-5")) {
      return 1000000;
    }
    if (m.includes("claude-3") || m.includes("claude-3-5")) {
      return 200000;
    }
    if (m.includes("claude-2") || m.includes("instant")) {
      return 100000;
    }
    return 200000;
  }
}
