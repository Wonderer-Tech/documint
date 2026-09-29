import * as vscode from "vscode";
import { getDocuMintConfiguration } from "../config/configuration";
import { BaseAIProvider } from "./aiProvider";
import {
  GuardedProviderName,
  normalizeProviderModel,
} from "./providerModelGuard";
import { PROVIDER_DEFAULT_MODELS } from "./providerDefaults";
import {
  hasExplicitContextWindow,
  RequestContextWindowScope,
  resolveMetadataContextWindow,
} from "./contextWindowPolicy";
import { generationRunContext } from "../services/generationRunContext";
import { ModelMetadataService } from "../services/modelMetadataService";
import {
  type LocalPresetProviderName,
  resolveLocalPresetModel,
} from "./localProviderPolicy";

type MetadataProviderName = GuardedProviderName | LocalPresetProviderName | "custom";

function isGuardedProviderName(
  provider: MetadataProviderName,
): provider is GuardedProviderName {
  return provider in PROVIDER_DEFAULT_MODELS;
}

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
 * Estimated metadata is never allowed to reduce a provider's own known context
 * window. Provider API metadata may override the static fallback when available.
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
  const localPreset =
    providerName === "ollama" || providerName === "lmstudio";

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
    const configuredModel = getDocuMintConfiguration()
      .get<string>("model")
      ?.trim();

    if (providerName === "custom") {
      return requestedModel?.trim() || configuredModel || CUSTOM_DEFAULT_MODEL;
    }

    if (localPreset) {
      return resolveLocalPresetModel(
        requestedModel,
        configuredModel,
      );
    }

    if (!isGuardedProviderName(providerName)) {
      return requestedModel?.trim() || configuredModel || "";
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
    if (
      resolvedWindows.has(key) ||
      providerName === "custom" ||
      localPreset
    ) {
      return;
    }

    const metadata = await metadataService.fetchContextWindow(
      providerName,
      model,
    );
    const resolvedContextWindow = resolveMetadataContextWindow(
      metadata.contextWindow,
      metadata.source,
      originalGetMaxContextWindow(model),
    );
    resolvedWindows.set(key, resolvedContextWindow);
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
    const runContextWindow = generationRunContext.getContextWindow();
    if (hasExplicitContextWindow(runContextWindow)) {
      return requestContextWindow.run(runContextWindow!, () =>
        originalGenerateMarkdownFromPrompt(params),
      );
    }

    await warmContextWindow(params.model);
    return originalGenerateMarkdownFromPrompt(params);
  };

  return provider;
}
