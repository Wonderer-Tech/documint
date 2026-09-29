import * as vscode from "vscode";
import { getDocuMintConfiguration } from "../config/configuration";
import { randomBytes } from "crypto";
import { SIDEBAR_STYLES } from "./sidebarStyles";
import { SIDEBAR_CLIENT_SCRIPT } from "./sidebarClientScript";
import { SecretStorageManager } from "../config/secretStorage";
import { resolveProviderSelection } from "../providers/providerSelection";
import { normalizeGenerationMode } from "../services/generationMode";

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  private _state = {
    isGenerating: false,
    apiKeyConfigured: false,
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

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>Documint</title>
<style nonce="${nonce}">
${SIDEBAR_STYLES}
</style>
</head>
<body>

<div class="header">
  <svg class="header-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
  <span class="header-title">Documint</span>
  <div class="header-spacer"></div>
  <div class="status-pill">
    <div class="status-dot" id="statusDot"></div>
    <span class="status-text" id="statusText">Ready</span>
  </div>
</div>

<div class="section hidden" id="authSection">
  <div class="section-label">
    Authentication
    <div class="section-label-line"></div>
  </div>
  <div class="auth-status missing" id="authStatus">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" id="authIcon">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    <span id="authText">API Key not configured</span>
  </div>
  <button class="btn btn-primary" id="configureBtn" type="button">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    Configure API Key
  </button>
  <div class="api-key-panel" id="apiKeyPanel">
    <div class="field">
      <label class="field-label" for="apiKeyInput">API Key</label>
      <input type="password" id="apiKeyInput" placeholder="Paste API key for selected provider" autocomplete="off">
      <div class="field-help">Stored securely in VS Code Secret Storage.</div>
    </div>
    <div class="api-key-actions">
      <button class="btn btn-primary" id="saveApiKeyBtn" type="button">Save Key</button>
      <button class="btn btn-secondary" id="cancelApiKeyBtn" type="button">Cancel</button>
    </div>
    <div class="api-key-feedback" id="apiKeyFeedback"></div>
  </div>
</div>

<div class="section hidden" id="providerSection">
  <div class="section-label">
    Provider &amp; Model
    <div class="section-label-line"></div>
  </div>

  <div class="field">
    <label class="field-label">Provider</label>
    <select id="provider">
      <option value="openai">OpenAI</option>
      <option value="anthropic">Anthropic</option>
      <option value="openrouter">OpenRouter</option>
      <option value="deepseek">DeepSeek</option>
      <option value="custom">Custom Endpoint</option>
    </select>
  </div>

  <div class="field">
    <label class="field-label">Model</label>
    <input type="text" id="model" value="gpt-5.4-nano" placeholder="e.g. gpt-5.4-nano, claude-sonnet-5, anthropic/claude-sonnet-5">
  </div>

  <div class="field hidden" id="customEndpointField">
    <label class="field-label">Custom Endpoint URL</label>
    <input type="url" id="customApiEndpoint" placeholder="https://api.example.com/v1/chat/completions">
    <div class="field-help">Use an OpenAI-compatible chat completions URL.</div>
  </div>
</div>

<div class="section">
  <div class="section-label">
    Generation
    <div class="section-label-line"></div>
  </div>

  <div class="field">
    <label class="field-label">Generation Mode</label>
    <select id="generationMode">
      <option value="ai">AI Documentation</option>
      <option value="local" selected>Local Documentation — No AI</option>
    </select>
    <div class="field-help" id="localModeHelp">Runs entirely on this machine. No API key, internet connection, or AI model required.</div>
  </div>

  <div class="field hidden" id="depthField">
    <label class="field-label">Documentation Depth</label>
    <select id="depth">
      <option value="simple">Simple — Plain English overview</option>
      <option value="basic">Basic — Function summaries</option>
      <option value="standard" selected>Standard — Full reference</option>
      <option value="comprehensive">Comprehensive — Enterprise grade</option>
    </select>
  </div>

  <div class="field">
    <label class="field-label">Output Format</label>
    <select id="outputFormat">
      <option value="markdown">Markdown</option>
      <option value="html">HTML</option>
      <option value="both" selected>Both</option>
    </select>
  </div>

  <div class="generation-actions">
    <button class="btn btn-primary" id="generateBtn">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <span id="generateBtnText">Generate Local Documentation</span>
    </button>
    <button class="btn btn-secondary" id="cancelBtn" disabled>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="12" height="12"/>
      </svg>
      Cancel
    </button>
    <button class="btn btn-secondary" id="clearCacheBtn" type="button">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18"/>
        <path d="M8 6V4h8v2"/>
        <path d="M6 6l1 16h10l1-16"/>
        <path d="M10 11v6"/>
        <path d="M14 11v6"/>
      </svg>
      Clear Cache
    </button>
  </div>

  <div class="scope-row">
    <button class="scope-btn" data-scope="current-file">File</button>
    <button class="scope-btn" data-scope="folder">Folder</button>
    <button class="scope-btn" data-scope="workspace">Workspace</button>
  </div>
</div>

<div class="section progress-section" id="progressSection">
  <div class="section-label">
    Progress
    <div class="section-label-line"></div>
  </div>
  <div class="progress-phase" id="progressPhase">Initializing…</div>
  <div class="progress-track">
    <div class="progress-fill" id="progressFill"></div>
  </div>
  <div class="progress-meta">
    <span id="progressFiles">0 / 0 files</span>
    <span id="progressPct">0%</span>
  </div>
  <div class="progress-file" id="progressFile"></div>
</div>

<div class="log-section" id="logSection" hidden>
  <div class="log-header">
    <span class="section-label no-margin">Output</span>
    <button class="log-clear" id="logClear">Clear</button>
  </div>
  <div id="logContainer"></div>
</div>

<script nonce="${nonce}">
${SIDEBAR_CLIENT_SCRIPT}
</script>
</body>
</html>`;
  }
}
