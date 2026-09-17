import * as vscode from "vscode";
import { BaseAIProvider } from "./aiProvider";
import { OpenAIProvider } from "./openaiProvider";
import { AnthropicProvider } from "./anthropicProvider";
import { OpenRouterProvider } from "./openrouterProvider";
import { DeepSeekProvider } from "./deepseekProvider";
import { CustomProvider } from "./customProvider";
import { withModelMetadata } from "./providerMetadataDecorator";
import {
  normalizeProviderName,
  ProviderName,
  resolveProviderNameWithFallback,
} from "./providerNamePolicy";

/**
 * Creates the correct provider instance for the given provider name.
 * Unknown values are normalized to OpenAI before provider construction.
 */
export class ProviderFactory {
  static create(
    provider: string,
    context: vscode.ExtensionContext,
  ): BaseAIProvider {
    const providerName = normalizeProviderName(provider);
    let instance: BaseAIProvider;

    switch (providerName) {
      case "anthropic":
        instance = new AnthropicProvider(context);
        break;
      case "openrouter":
        instance = new OpenRouterProvider(context);
        break;
      case "deepseek":
        instance = new DeepSeekProvider(context);
        break;
      case "custom":
        instance = new CustomProvider(context);
        break;
      case "openai":
      default:
        instance = new OpenAIProvider(context);
        break;
    }

    return withModelMetadata(instance, context);
  }

  /**
   * Resolves the provider name from options/settings and normalizes it before
   * consent checks and provider construction use the value.
   */
  static resolveProviderName(optionProvider?: string): ProviderName {
    const configuredProvider = vscode.workspace
      .getConfiguration("aiDocGenerator")
      .get<string>("aiProvider");
    return resolveProviderNameWithFallback(optionProvider, configuredProvider);
  }
}
