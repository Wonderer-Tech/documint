import * as vscode from "vscode";
import axios from "axios";
import {
  BaseAIProvider,
  ApiCallParams,
  RawMarkdownPromptParams,
} from "./aiProvider";
import { DocumentationContext, DocumentationResult } from "../types";
import { normalizeProviderModel } from "./providerModelGuard";

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
    return "claude-3-5-sonnet-20241022";
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

    const response = await axios.post(
      this.endpoint,
      {
        model: params.model,
        max_tokens: params.maxTokens,
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
        signal: params.signal,
      },
    );

    const tokensUsed =
      (response.data.usage?.input_tokens ?? 0) +
      (response.data.usage?.output_tokens ?? 0);

    return {
      documentation: response.data.content[0].text,
      tokensUsed,
      model: params.model,
    };
  }

  protected getMaxOutputTokens(model?: string): number {
    const m = (model || "").toLowerCase();
    // claude-3-5 supports 8K output; claude-3 supports 4K
    if (m.includes("claude-3-5") || m.includes("claude-3.5")) {
      return 8192;
    }
    return 4096;
  }

  getMaxContextWindow(model?: string): number {
    const m = (model || "").toLowerCase();
    // All Claude 3+ models support 200K context
    if (m.includes("claude-3") || m.includes("claude-3-5")) {
      return 200000;
    }
    // Claude 2.x
    if (m.includes("claude-2")) {
      return 100000;
    }
    // Claude Instant
    if (m.includes("instant")) {
      return 100000;
    }
    return 200000; // Default to 200K for new models
  }

  public async validateConnection(): Promise<boolean> {
    try {
      const key = await this.secretManager.getApiKey(this.name);
      return typeof key === "string" && key.startsWith("sk-ant-");
    } catch {
      return false;
    }
  }
}
