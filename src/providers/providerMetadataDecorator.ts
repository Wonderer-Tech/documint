import * as vscode from "vscode";
import { BaseAIProvider } from "./aiProvider";
import {
  GuardedProviderName,
  normalizeProviderModel,
} from "./providerModelGuard";
import { PROVIDER_DEFAULT_MODELS } from "./providerDefaults";
import {
  hasExplicitContextWindow,
  RequestContextWindowScope,
} from "./contextWindowPolicy";
import { ModelMetadataService } from "../services/modelMetadataService";

type MetadataProviderName = GuardedProviderName | "custom";

const CUSTOM_DEFAULT_MODEL = "default";

/**
 * Makes ModelMetadataService part of the real generation path without changing
 * each provider's token-budgeting implementation. Metadata is cached by actual
 * provider/model, and existing provider fallbacks remain the safety net.
 *
 * Explicit context-window overrides are scoped to the current async generation
 * request. They never enter the shared per-model metadata cache, so parallel or
 * later requests cannot inherit a previous request's override.
 *
 * Custom endpoints intentionally do not receive inferred remote-model metadata:
 * their real context window is unknown, so they keep their provider fallback
 * unless the caller supplies an explicit positive contextWindow override.
 */
export function withModelMetadata(
  provider: BaseAIProvider,
  context: vscode.ExtensionContext,
): BaseAIProvider {
  const providerName = provider.name as MetadataProviderName;
  if (
    providerName !== "custom" &&
    !(providerName in PROVIDER_DEFAULT_MODELS)
  ) {
    return provider;
  }

  const metadataService = ModelMetadataService.getInstance(context);
  const resolvedWindows = new Map<string, number>();
  const requestContextWindow = new RequestContextWindowScope();
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
      return requestedModel?.trim() || configuredModel || CUSTOM_DEFAULT_MODEL;
    }

    return normalizeProviderModel(
      providerName,
      requestedModel ?? configuredModel,
      PROVIDER_DEFAULT_MODELS[providerName],
    );
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
      resolvedWindows.set(key, Math.floor(metadata.contextWindow));
    }
  };

  provider.getMaxContextWindow = (model?: string): number => {
    const explicitWindow = requestContextWindow.current();
    if (explicitWindow !== undefined) {
      return explicitWindow;
    }

    const resolvedModel = resolveModel(model);
    return (
      resolvedWindows.get(resolvedModel.toLowerCase()) ??
      originalGetMaxContextWindow(resolvedModel)
    );
  };

  provider.generateDocumentation = async (documentationContext) => {
    if (hasExplicitContextWindow(documentationContext.contextWindow)) {
      return requestContextWindow.run(documentationContext.contextWindow!, () =>
        originalGenerateDocumentation(documentationContext),
      );
    }

    await warmContextWindow(documentationContext.model);
    return originalGenerateDocumentation(documentationContext);
  };

  provider.generateMarkdownFromPrompt = async (params) => {
    await warmContextWindow(params.model);
    return originalGenerateMarkdownFromPrompt(params);
  };

  return provider;
}
