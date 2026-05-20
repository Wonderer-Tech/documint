import * as vscode from "vscode";
import axios from "axios";
import { BaseAIProvider, ApiCallParams } from "./aiProvider";
import { DocumentationContext, DocumentationResult } from "../types";

/**
 * Custom provider — calls a user-specified endpoint using the OpenAI
 * chat/completions wire format. Suitable for self-hosted models, Azure
 * OpenAI, Together AI, Fireworks, Groq, or any OpenAI-compatible server.
 *
 * Configure via:
 *   aiDocGenerator.customApiEndpoint  — full URL to /chat/completions
 *   aiDocGenerator.model              — model name expected by the endpoint
 */
export class CustomProvider extends BaseAIProvider {
  name = "custom";
  isLocal = false;

  private get endpoint(): string {
    const ep = vscode.workspace
      .getConfiguration("aiDocGenerator")
      .get<string>("customApiEndpoint");

    if (!ep) {
      throw new Error(
        `No custom API endpoint configured. ` +
          `Set "aiDocGenerator.customApiEndpoint" in your VS Code settings.`,
      );
    }
    return ep;
  }

  protected defaultModel(): string {
    return "default";
  }

  public async generateDocumentation(
    context: DocumentationContext,
  ): Promise<DocumentationResult> {
    const cfg = vscode.workspace.getConfiguration("aiDocGenerator");
    const model =
      context.model || cfg.get<string>("model") || this.defaultModel();
    const apiKey = (await this.secretManager.getApiKey(this.name)) || "";
    return this.generateWithMessages(context, model, apiKey);
  }

  protected async callApi(params: ApiCallParams): Promise<DocumentationResult> {
    const response = await axios.post(
      this.endpoint,
      {
        model: params.model,
        messages: params.messages,
        temperature: this.temperature,
        max_tokens: params.maxTokens,
      },
      {
        headers: {
          ...(params.apiKey
            ? { Authorization: `Bearer ${params.apiKey}` }
            : {}),
          "Content-Type": "application/json",
        },
        timeout: 120000,
        signal: params.signal,
      },
    );

    return {
      documentation: response.data.choices[0].message.content,
      tokensUsed: response.data.usage?.total_tokens ?? 0,
      model: params.model,
    };
  }

  public async validateConnection(): Promise<boolean> {
    try {
      // For custom providers, just check the endpoint is configured
      const ep = vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("customApiEndpoint");
      return typeof ep === "string" && ep.startsWith("http");
    } catch {
      return false;
    }
  }

  getMaxContextWindow(_model?: string): number {
    // Unknown — use a safe conservative value
    return 8192;
  }
}
