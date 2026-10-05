import * as vscode from "vscode";
import { getDocuMintConfiguration } from "../config/configuration";
import { randomBytes } from "crypto";
import { buildSidebarHtml } from "./sidebarTemplate";
import { SecretStorageManager } from "../config/secretStorage";
import { resolveProviderSelection } from "../providers/providerSelection";
import { discoverLocalProviderModels } from "../providers/localProviderDiscovery";
import { normalizeGenerationMode } from "../services/generationMode";

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  private _state = {
    isGenerating: false,
    apiKeyConfigured: false,
    reviewPromptVisible: false,
    logs: [] as Array<{ message: string; type: string; timestamp: string }>,
    progress: {
      percentage: 0,
      message: "",
      currentFile: "",
      totalFiles: 0,
      processedFiles: 0,
    },
    settings: {
      generationMode: "local",
      provider: "openai",
      model: "gpt-5.4-nano",
      customApiEndpoint: "",
      depth: "standard",
      outputFormat: "both",
    },
  };

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _secretManager: SecretStorageManager,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._buildHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      try {
        switch (msg.type) {
          case "ready":
            this._restoreState();
            break;

          case "review-prompt-presented":
            await vscode.commands.executeCommand(
              "aiDocGenerator.reviewPromptPresented",
            );
            break;

          case "review-marketplace":
            await vscode.commands.executeCommand(
              "aiDocGenerator.reviewMarketplace",
              typeof msg.rating === "number" ? msg.rating : undefined,
            );
            break;

          case "review-feedback":
            await vscode.commands.executeCommand(
              "aiDocGenerator.reviewFeedback",
              {
                feedback:
                  typeof msg.feedback === "string" ? msg.feedback : "",
                rating:
                  typeof msg.rating === "number" ? msg.rating : undefined,
              },
            );
            break;

          case "review-later":
            await vscode.commands.executeCommand(
              "aiDocGenerator.reviewLater",
            );
            break;

          case "review-never":
            await vscode.commands.executeCommand(
              "aiDocGenerator.reviewNever",
            );
            break;

          case "generate-documentation":
            await vscode.commands.executeCommand(
              "aiDocGenerator.generateDocumentation",
              msg.payload,
            );
            break;

          case "pick-file":
            await vscode.commands.executeCommand(
              "aiDocGenerator.pickAndGenerateFile",
              msg.payload,
            );
            break;

          case "pick-folder":
            await vscode.commands.executeCommand(
              "aiDocGenerator.pickAndGenerateFolder",
              msg.payload,
            );
            break;

          case "cancel-generation":
            await vscode.commands.executeCommand(
              "aiDocGenerator.cancelGeneration",
            );
            break;

          case "clear-cache":
            await vscode.commands.executeCommand("aiDocGenerator.clearCache");
            break;

          case "configure-api-key":
            this._post({ type: "show-api-key-form" });
            break;

          case "save-api-key":
            await this._saveApiKeyFromPanel(
              typeof msg.provider === "string"
                ? msg.provider
                : this._state.settings.provider,
              typeof msg.apiKey === "string" ? msg.apiKey : "",
            );
            break;

          case "discover-local-models": {
            const provider =
              typeof msg.provider === "string"
                ? msg.provider.trim().toLowerCase()
                : "";
            if (provider !== "ollama" && provider !== "lmstudio") {
              break;
            }

            try {
              const models = await discoverLocalProviderModels(provider);
              this._post({
                type: "local-models",
                provider,
                models,
              });
            } catch (error) {
              this._post({
                type: "local-models",
                provider,
                models: [],
                error:
                  error instanceof Error
                    ? error.message
                    : String(error),
              });
            }
            break;
          }

          case "update-settings": {
            const payload: Record<string, unknown> =
              msg.payload && typeof msg.payload === "object"
                ? { ...msg.payload }
                : {};

            if (typeof payload.generationMode === "string") {
              payload.generationMode = normalizeGenerationMode(
                payload.generationMode,
              );
            }

            if (
              typeof payload.provider === "string" ||
              typeof payload.model === "string"
            ) {
              const selection = resolveProviderSelection(
                typeof payload.provider === "string"
                  ? payload.provider
                  : this._state.settings.provider,
                typeof payload.model === "string"
                  ? payload.model
                  : this._state.settings.model,
              );
              payload.provider = selection.provider;
              payload.model = selection.model;
            }

            this._state.settings = { ...this._state.settings, ...payload } as typeof this._state.settings;
            await this._persistSettings(payload);
            if (typeof payload.provider === "string") {
              await this._refreshSelectedProviderApiKeyStatus();
            }
            this._post({
              type: "settings-normalized",
              settings: this._state.settings,
            });
            break;
          }
        }
      } catch (e) {
        console.error("[Documint] webview message handler error:", e);
      }
    });
  }

  public setReviewPromptVisible(visible: boolean) {
    this._state.reviewPromptVisible = visible;
    this._post({ type: "review-prompt-visibility", visible });
  }

  public updateProgress(progress: {
    phase: string;
    currentFile: string;
    totalFiles?: number;
    processedFiles?: number;
    percentage: number;
    message: string;
  }) {
    Object.assign(this._state.progress, {
      percentage: progress.percentage,
      message: progress.message,
      currentFile: progress.currentFile,
      totalFiles: progress.totalFiles ?? 0,
      processedFiles: progress.processedFiles ?? 0,
    });
    this._post({ type: "progress", ...progress });
  }

  public completeGeneration() {
    this._post({ type: "complete" });
  }

  public reportError(message: string) {
    this._post({ type: "error", message });
  }

  public updateApiKeyStatus(
    configured: boolean,
    provider: string = this._state.settings.provider,
  ) {
    this._state.apiKeyConfigured = configured;
    this._post({ type: "api-key-status", configured, provider });
  }

  public setGeneratingState(generating: boolean) {
    this._state.isGenerating = generating;
    this._post({ type: "generating-state", generating });
  }

  public addLogEntry(message: string, type: string) {
    const entry = {
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    this._state.logs.push(entry);
    if (this._state.logs.length > 100) {
      this._state.logs = this._state.logs.slice(-100);
    }
    this._post({
      type: "log",
      message: entry.message,
      logType: entry.type,
      timestamp: entry.timestamp,
    });
  }

  private _post(msg: Record<string, unknown>) {
    this._view?.webview.postMessage(msg);
  }

  private async _restoreState() {
    const config = getDocuMintConfiguration();
    const selection = resolveProviderSelection(
      config.get<string>("aiProvider") || this._state.settings.provider,
      config.get<string>("model") || this._state.settings.model,
    );

    this._state.settings = {
      ...this._state.settings,
      generationMode: normalizeGenerationMode(
        config.get<string>("generationMode"),
      ),
      provider: selection.provider,
      model: selection.model,
      customApiEndpoint:
        config.get<string>("customApiEndpoint") ||
        this._state.settings.customApiEndpoint,
      depth:
        config.get<string>("documentationDepth") || this._state.settings.depth,
      outputFormat:
        config.get<string>("outputFormat") || this._state.settings.outputFormat,
    };

    try {
      const key = await this._secretManager.getApiKey(
        this._state.settings.provider,
      );
      this._state.apiKeyConfigured = !!key;
    } catch {
      this._state.apiKeyConfigured = false;
    }

    this._post({ type: "restore-state", state: this._state });
  }

  private async _persistSettings(payload: Record<string, unknown>) {
    const config = getDocuMintConfiguration();
    const updates: Array<[string, unknown]> = [];

    if (typeof payload.generationMode === "string") {
      updates.push(["generationMode", normalizeGenerationMode(payload.generationMode)]);
    }
    if (typeof payload.provider === "string") {
      updates.push(["aiProvider", payload.provider]);
    }
    if (typeof payload.model === "string") {
      updates.push(["model", payload.model]);
    }
    if (typeof payload.customApiEndpoint === "string") {
      updates.push(["customApiEndpoint", payload.customApiEndpoint.trim()]);
    }
    if (typeof payload.depth === "string") {
      updates.push(["documentationDepth", payload.depth]);
    }
    if (typeof payload.outputFormat === "string") {
      updates.push(["outputFormat", payload.outputFormat]);
    }

    for (const [key, value] of updates) {
      await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
  }

  private async _refreshSelectedProviderApiKeyStatus(): Promise<void> {
    try {
      const provider = this._state.settings.provider;
      const key = await this._secretManager.getApiKey(provider);
      this.updateApiKeyStatus(!!key, provider);
    } catch {
      this.updateApiKeyStatus(false, this._state.settings.provider);
    }
  }

  private async _saveApiKeyFromPanel(provider: string, apiKey: string) {
    const normalizedProvider = resolveProviderSelection(provider, undefined).provider;
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      this._post({
        type: "api-key-save-result",
        ok: false,
        message: "API key cannot be empty.",
      });
      return;
    }

    const isValid = await this._secretManager.validateApiKey(
      normalizedProvider,
      trimmedKey,
    );
    if (!isValid) {
      this._post({
        type: "api-key-save-result",
        ok: false,
        message: `Invalid API key format for ${normalizedProvider}.`,
      });
      return;
    }

    const stored = await this._secretManager.storeApiKey(normalizedProvider, trimmedKey);
    if (!stored) {
      this._post({
        type: "api-key-save-result",
        ok: false,
        message: `Failed to store API key for ${normalizedProvider}.`,
      });
      return;
    }

    this._state.apiKeyConfigured = true;
    this._post({
      type: "api-key-status",
      configured: true,
      provider: normalizedProvider,
    });
    this._post({
      type: "api-key-save-result",
      ok: true,
      message: `API key for ${normalizedProvider} saved.`,
    });
  }

  private _buildHtml(webview: vscode.Webview): string {
    const nonce = randomBytes(16).toString("base64");
    return buildSidebarHtml({
      cspSource: webview.cspSource,
      nonce,
    });
  }

}
