import * as vscode from "vscode";
import { BaseAIProvider } from "./aiProvider";
import {
  GuardedProviderName,
  normalizeProviderModel,
} from "./providerModelGuard";
import { ModelMetadataService } from "../services/modelMetadataService";

const DEFAULT_MODELS: Record<GuardedProviderName, string> = {
  openai: "gpt-5.4-nano",
  anthropic: "claude-3-5-sonnet-20241022",
  openrouter: "openai/gpt-4o",
  deepseek: "deepseek-flash",
};

/**
 * Makes ModelMetadataService part of the real generation path without changing
 * each provider's token-budgeting implementation. Metadata is cached by actual
 * provider/model, and existing provider fallbacks remain the safety net.
 */
export function withModelMetadata(
  provider: BaseAIProvider,
  context: vscode.ExtensionContext,
): BaseAIProvider {
  if (!(provider.name in DEFAULT_MODELS)) {
    return provider;
  }

  const providerName = provider.name as GuardedProviderName;
  const metadataService = ModelMetadataService.getInstance(context);
  const resolvedWindows = new Map<string, number>();
  const originalGetMaxContextWindow =
    provider.getMaxContextWindow.bind(provider);
  const originalGenerateDocumentation =
    provider.generateDocumentation.bind(provider);
  const originalGenerateMarkdownFromPrompt =
    provider.generateMarkdownFromPrompt.bind(provider);

  const resolveModel = (requestedModel?: string): string => {
    const configuredModel = vscode.workspace
      .getConfiguration("aiDocGenerator")
      .get<string>("model");

    return normalizeProviderModel(
      providerName,
      requestedModel ?? configuredModel,
      DEFAULT_MODELS[providerName],
    );
  };

  const warmContextWindow = async (requestedModel?: string): Promise<void> => {
    const model = resolveModel(requestedModel);
    const key = model.toLowerCase();
    if (resolvedWindows.has(key)) {
      return;
    }

    const metadata = await metadataService.fetchContextWindow(
      providerName,
      model,
    );
    if (
      Number.isFinite(metadata.contextWindow) &&
      metadata.contextWindow > 0
    ) {
      resolvedWindows.set(key, metadata.contextWindow);
    }
  };

  provider.getMaxContextWindow = (model?: string): number => {
    const resolvedModel = resolveModel(model);
    return (
      resolvedWindows.get(resolvedModel.toLowerCase()) ??
      originalGetMaxContextWindow(resolvedModel)
    );
  };

  provider.generateDocumentation = async (documentationContext) => {
    await warmContextWindow(documentationContext.model);
    return originalGenerateDocumentation(documentationContext);
  };

  provider.generateMarkdownFromPrompt = async (params) => {
    await warmContextWindow(params.model);
    return originalGenerateMarkdownFromPrompt(params);
  };

  return provider;
}
