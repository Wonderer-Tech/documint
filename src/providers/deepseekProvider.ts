import * as vscode from "vscode";
import axios, { AxiosError } from "axios";
import {
  BaseAIProvider,
  ApiCallParams,
  RawMarkdownPromptParams,
} from "./aiProvider";
import { DocumentationContext, DocumentationResult } from "../types";
import { normalizeProviderModel } from "./providerModelGuard";

/**
 * DeepSeek provider using the official OpenAI-compatible Chat Completions API.
 * Docs: https://api-docs.deepseek.com/
 */
export class DeepSeekProvider extends BaseAIProvider {
  name = "deepseek";
  isLocal = false;

  private readonly endpoint = "https://api.deepseek.com/chat/completions";

  protected defaultModel(): string {
    return "deepseek-flash";
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

  protected getMaxOutputTokens(_model?: string): number {
    return 32768;
  }

  getMaxContextWindow(_model?: string): number {
    return 1000000;
  }

  protected async callApi(params: ApiCallParams): Promise<DocumentationResult> {
    try {
      const response = await axios.post(
        this.endpoint,
        {
          model: params.model,
          messages: params.messages,
          temperature: this.temperature,
          max_tokens: params.maxTokens,
          stream: false,
          thinking: { type: "disabled" },
        },
        {
          headers: {
            Authorization: `Bearer ${params.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 300000,
          signal: params.signal,
        },
      );

      return {
        documentation: response.data.choices?.[0]?.message?.content ?? "",
        tokensUsed: response.data.usage?.total_tokens ?? 0,
        model: params.model,
      };
    } catch (error) {
      const axErr = error as AxiosError<{
        error?: { message?: string; code?: string; type?: string };
      }>;

      if (axErr.response) {
        const status = axErr.response.status;
        const apiMessage =
          axErr.response.data?.error?.message ?? axErr.response.statusText;

        if (status === 401) {
          throw new Error(
            `DeepSeek API authentication failed: ${apiMessage}. ` +
              `Use the "Configure API Key" command to update your DeepSeek key.`,
          );
        }

        if (status === 429) {
          throw new Error(
            `DeepSeek API rate limit exceeded: ${apiMessage}. ` +
              `Lower aiDocGenerator.concurrentRequests or increase aiDocGenerator.rateLimitDelay.`,
          );
        }

        throw new Error(`DeepSeek API error (${status}): ${apiMessage}`);
      }

      if (axErr.request) {
        throw new Error(
          `Network error: Could not reach DeepSeek API. ` +
            `Check your internet connection and firewall settings.\n\n` +
            `Original error: ${axErr.message}`,
        );
      }

      throw new Error(`Unexpected DeepSeek API error: ${axErr.message}`);
    }
  }
}
