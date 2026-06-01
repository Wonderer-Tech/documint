import * as vscode from "vscode";
import { BaseAIProvider } from "./aiProvider";
import { OpenAIProvider } from "./openaiProvider";
import { AnthropicProvider } from "./anthropicProvider";
import { OpenRouterProvider } from "./openrouterProvider";
import { OllamaProvider } from "./ollamaProvider";
import { LMStudioProvider } from "./lmstudioProvider";
import { DeepSeekProvider } from "./deepseekProvider";
import { CustomProvider } from "./customProvider";

export type ProviderName =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "deepseek"
  | "ollama"
  | "lmstudio"
  | "custom";

/**
 * Creates the correct AI provider instance for the given provider name.
 * Falls back to OpenAI for unknown values.
 */
export class ProviderFactory {
  static create(
    provider: string,
    context: vscode.ExtensionContext,
  ): BaseAIProvider {
    switch (provider as ProviderName) {
      case "anthropic":
        return new AnthropicProvider(context);
      case "openrouter":
        return new OpenRouterProvider(context);
      case "deepseek":
        return new DeepSeekProvider(context);
      case "ollama":
        return new OllamaProvider(context);
      case "lmstudio":
        return new LMStudioProvider(context);
      case "custom":
        return new CustomProvider(context);
      case "openai":
      default:
        return new OpenAIProvider(context);
    }
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
