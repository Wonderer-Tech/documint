import * as vscode from "vscode";
import axios from "axios";
import { BaseAIProvider, ApiCallParams } from "./aiProvider";
import { DocumentationContext, DocumentationResult } from "../types";
import { capRequestedOutputTokens } from "./outputTokenLimit";
import { parseOpenAICompatibleResponse } from "./openAICompatibleResponse";
import { evaluateCustomEndpoint } from "./customEndpointPolicy";
import { runProviderRequestWithRetry } from "./providerRetry";

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
  isLocal: boolean;

  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.isLocal = this.getEndpointPolicy().isLocal;
  }

  private get endpoint(): string {
    const policy = this.getEndpointPolicy();
    if (!policy.valid) {
      throw new Error(
        policy.reason ??
          `Set "aiDocGenerator.customApiEndpoint" to a valid http or https URL.`,
      );
    }
    return policy.normalizedEndpoint;
  }

  private getEndpointPolicy() {
    const endpoint = vscode.workspace
      .getConfiguration("aiDocGenerator")
      .get<string>("customApiEndpoint");
    return evaluateCustomEndpoint(endpoint);
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
              ...(params.apiKey
                ? { Authorization: `Bearer ${params.apiKey}` }
                : {}),
              "Content-Type": "application/json",
            },
            timeout: 120000,
            signal: params.signal,
          },
        ),
      { signal: params.signal },
    );

    const parsed = parseOpenAICompatibleResponse(
      response.data,
      "Custom provider",
    );
    return {
      ...parsed,
      model: params.model,
    };
  }

  public async validateConnection(): Promise<boolean> {
    try {
      return this.getEndpointPolicy().valid;
    } catch {
      return false;
    }
  }

  getMaxContextWindow(_model?: string): number {
    // Unknown — use a safe conservative value
    return 8192;
  }
}
