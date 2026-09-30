import * as vscode from "vscode";
import axios from "axios";
import { getDocuMintConfiguration } from "../config/configuration";
import { DocumentationContext, DocumentationResult } from "../types";
import {
  ApiCallParams,
  BaseAIProvider,
  RawMarkdownPromptParams,
} from "./aiProvider";
import { capRequestedOutputTokens } from "./outputTokenLimit";
import { parseOpenAICompatibleResponse } from "./openAICompatibleResponse";
import { normalizeProviderRequestError } from "./providerHttpError";
import {
  getLocalPresetDefinition,
  LocalPresetProviderName,
  localPresetModelRequiredMessage,
  resolveLocalPresetModel,
} from "./localProviderPolicy";
import { runProviderRequestWithRetry } from "./providerRetry";
import { LOCAL_PROVIDER_REQUEST_TIMEOUT_MS } from "./providerRequestPolicy";

/**
 * OpenAI-compatible loopback provider used by the Ollama and LM Studio presets.
 *
 * The endpoint is fixed to the provider's conventional loopback server.
 * Model names remain user-controlled because installed local models cannot be
 * inferred safely from package metadata or from DocuMint defaults.
 */
export class LocalOpenAICompatibleProvider extends BaseAIProvider {
  public readonly isLocal = true;
  public readonly name: LocalPresetProviderName;

  constructor(
    context: vscode.ExtensionContext,
    provider: LocalPresetProviderName,
  ) {
    super(context);
    this.name = provider;
  }

  protected defaultModel(): string {
    return "";
  }

  public async generateDocumentation(
    context: DocumentationContext,
  ): Promise<DocumentationResult> {
    const model = this.resolveLocalModel(context.model);
    return this.generateWithMessages(
      {
        ...context,
        model,
      },
      model,
      "",
    );
  }

  public async generateMarkdownFromPrompt(
    params: RawMarkdownPromptParams,
  ): Promise<DocumentationResult> {
    const model = this.resolveLocalModel(params.model);
    return super.generateMarkdownFromPrompt({
      ...params,
      model,
    });
  }

  getMaxContextWindow(_model?: string): number {
    // Local model context windows vary by runtime/model. Keep a conservative
    // fallback; callers can still provide an explicit context-window override.
    return 8192;
  }

  protected async callApi(
    params: ApiCallParams,
  ): Promise<DocumentationResult> {
    const definition = getLocalPresetDefinition(this.name);

    try {
      const response = await runProviderRequestWithRetry(
        () =>
          axios.post(
            definition.chatCompletionsEndpoint,
            {
              model: params.model,
              messages: params.messages,
              temperature: this.temperature,
              max_tokens: capRequestedOutputTokens(params.maxTokens),
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: LOCAL_PROVIDER_REQUEST_TIMEOUT_MS,
              maxRedirects: 0,
              proxy: false,
              signal: params.signal,
            },
          ),
        { signal: params.signal },
      );

      const parsed = parseOpenAICompatibleResponse(
        response.data,
        definition.label,
      );
      return {
        ...parsed,
        model: params.model,
      };
    } catch (error) {
      throw normalizeProviderRequestError(
        error,
        getLocalPresetDefinition(this.name).label,
      );
    }
  }

  private resolveLocalModel(requestedModel?: string): string {
    const configuredModel = getDocuMintConfiguration()
      .get<string>("model");
    const model = resolveLocalPresetModel(
      requestedModel,
      configuredModel,
    );

    if (!model) {
      throw new Error(localPresetModelRequiredMessage(this.name));
    }

    return model;
  }
}
