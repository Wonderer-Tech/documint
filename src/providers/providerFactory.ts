import * as vscode from "vscode";
import { BaseAIProvider } from "./aiProvider";
import { OpenAIProvider } from "./openaiProvider";
import { AnthropicProvider } from "./anthropicProvider";
import { OpenRouterProvider } from "./openrouterProvider";
import { DeepSeekProvider } from "./deepseekProvider";
import { CustomProvider } from "./customProvider";
import { withModelMetadata } from "./providerMetadataDecorator";

export type ProviderName =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "deepseek"
  | "custom";

/**
 * Creates the correct provider instance for the given provider name.
 * Falls back to OpenAI for unknown values.
 */
export class ProviderFactory {
  static create(
    provider: string,
    context: vscode.ExtensionContext,
  ): BaseAIProvider {
    let instance: BaseAIProvider;

    switch (provider as ProviderName) {
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
   * Resolves the provider name from options, falling back to VS Code settings,
   * then to "openai".
   */
  static resolveProviderName(
    optionProvider?: string,
  ): string {
    return (
      optionProvider ||
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("aiProvider") ||
      "openai"
    );
  }
}
