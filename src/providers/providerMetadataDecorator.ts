import * as vscode from "vscode";
import { BaseAIProvider } from "./aiProvider";
import {
  GuardedProviderName,
  normalizeProviderModel,
} from "./providerModelGuard";
import { ModelMetadataService } from "../services/modelMetadataService";

type MetadataProviderName = GuardedProviderName | "custom";

const DEFAULT_MODELS: Record<MetadataProviderName, string> = {
  openai: "gpt-5.4-nano",
  anthropic: "claude-3-5-sonnet-20241022",
  openrouter: "openai/gpt-4o",
  deepseek: "deepseek-flash",
  custom: "default",
};

/**
 * Makes ModelMetadataService part of the real generation path without changing
 * each provider's token-budgeting implementation. Metadata is cached by actual
 * provider/model, and existing provider fallbacks remain the safety net.
 *
 * Custom endpoints intentionally do not receive inferred remote-model metadata:
 * their real context window is unknown, so they keep their provider fallback
 * unless the caller supplies an explicit positive contextWindow override.
 */
export function withModelMetadata(
  provider: BaseAIProvider,
  context: vscode.ExtensionContext,
): BaseAIProvider {
  if (!(provider.name in DEFAULT_MODELS)) {
    return provider;
  }

  const providerName = provider.name as MetadataProviderName;
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
      .get<string>("model")
      ?.trim();

    if (providerName === "custom") {
      return requestedModel?.trim() || configuredModel || DEFAULT_MODELS.custom;
    }

    return normalizeProviderModel(
      providerName,
      requestedModel ?? configuredModel,
      DEFAULT_MODELS[providerName],
    );
  };

  const rememberExplicitContextWindow = (
    requestedModel: string | undefined,
    contextWindow: number | undefined,
  ): boolean => {
    if (!Number.isFinite(contextWindow) || (contextWindow ?? 0) <= 0) {
      return false;
    }

    const model = resolveModel(requestedModel);
    resolvedWindows.set(model.toLowerCase(), Math.floor(contextWindow!));
    return true;
  };

  const warmContextWindow = async (requestedModel?: string): Promise<void> => {
    const model = resolveModel(requestedModel);
    const key = model.toLowerCase();
    if (resolvedWindows.has(key) || providerName === "custom") {
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
    const hasExplicitWindow = rememberExplicitContextWindow(
      documentationContext.model,
      documentationContext.contextWindow,
    );
    if (!hasExplicitWindow) {
      await warmContextWindow(documentationContext.model);
    }
    return originalGenerateDocumentation(documentationContext);
  };

  provider.generateMarkdownFromPrompt = async (params) => {
    await warmContextWindow(params.model);
    return originalGenerateMarkdownFromPrompt(params);
  };

  return provider;
}
