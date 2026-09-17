import * as vscode from "vscode";
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
      generationMode: "ai",
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

    webviewView.webview.html = this._buildHtml();

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
    const config = vscode.workspace.getConfiguration("aiDocGenerator");
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
    const config = vscode.workspace.getConfiguration("aiDocGenerator");
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

  private _buildHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Documint</title>
<style>
  :root {
    --bg: var(--vscode-sideBar-background, #1e1e1e);
    --fg: var(--vscode-sideBar-foreground, #cccccc);
    --fg-muted: var(--vscode-descriptionForeground, #8c8c8c);
    --border: var(--vscode-panel-border, #2d2d2d);
    --input-bg: var(--vscode-input-background, #3c3c3c);
    --input-fg: var(--vscode-input-foreground, #cccccc);
    --input-border: var(--vscode-input-border, #3c3c3c);
    --input-focus: var(--vscode-focusBorder, #007fd4);
    --btn-bg: var(--vscode-button-background, #0e639c);
    --btn-fg: var(--vscode-button-foreground, #ffffff);
    --btn-hover: var(--vscode-button-hoverBackground, #1177bb);
    --btn-sec-bg: var(--vscode-button-secondaryBackground, #3a3d41);
    --btn-sec-fg: var(--vscode-button-secondaryForeground, #cccccc);
    --btn-sec-hover: var(--vscode-button-secondaryHoverBackground, #45494e);
    --badge-bg: var(--vscode-badge-background, #007acc);
    --badge-fg: var(--vscode-badge-foreground, #ffffff);
    --success: var(--vscode-terminal-ansiGreen, #4ec9b0);
    --warning: var(--vscode-editorWarning-foreground, #cca700);
    --error: var(--vscode-errorForeground, #f14c4c);
    --accent: var(--vscode-textLink-foreground, #3794ff);
    --progress-bg: var(--vscode-progressBar-background, #0e70c0);
    --tag-bg: var(--vscode-badge-background);
    --section-gap: 1px;
    --radius: 4px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    background: var(--bg);
    color: var(--fg);
    line-height: 1.5;
    overflow-x: hidden;
  }

  .header {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    background: var(--vscode-sideBarSectionHeader-background, rgba(0,0,0,.15));
  }
  .header-icon { color: var(--accent); flex-shrink: 0; }
  .header-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--fg); }
  .header-spacer { flex: 1; }
  .status-pill {
    display: flex; align-items: center; gap: 5px;
    padding: 2px 8px; border-radius: 10px; font-size: 11px;
    background: rgba(255,255,255,.06);
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--success); flex-shrink: 0;
  }
  .status-dot.running { background: var(--warning); animation: blink 1.2s infinite; }
  .status-dot.error { background: var(--error); }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }

  .section {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }
  .section-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .7px; color: var(--fg-muted);
    margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
  }
  .section-label-line {
    flex: 1; height: 1px; background: var(--border);
  }

  .auth-status {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px; border-radius: var(--radius);
    font-size: 12px; margin-bottom: 8px;
    border: 1px solid transparent;
    transition: all .2s;
  }
  .auth-status.ok {
    background: rgba(78,201,176,.08);
    border-color: rgba(78,201,176,.3);
    color: var(--success);
  }
  .auth-status.missing {
    background: rgba(241,76,76,.08);
    border-color: rgba(241,76,76,.3);
    color: var(--error);
  }
  .auth-status.optional {
    background: rgba(55,148,255,.08);
    border-color: rgba(55,148,255,.3);
    color: var(--accent);
  }
  .auth-status svg { flex-shrink: 0; }

  .field { margin-bottom: 8px; }
  .field:last-child { margin-bottom: 0; }
  .field-label {
    display: block; font-size: 11px; color: var(--fg-muted);
    margin-bottom: 4px; font-weight: 500;
  }
  select, input[type="text"], input[type="number"], input[type="url"], input[type="password"] {
    width: 100%; padding: 5px 8px;
    background: var(--input-bg); color: var(--input-fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius); font-size: 12px; outline: none;
    transition: border-color .15s;
    font-family: inherit;
  }
  select:focus, input:focus { border-color: var(--input-focus); }
  select { cursor: pointer; }
  .field-help {
    margin-top: 4px;
    color: var(--fg-muted);
    font-size: 10px;
    line-height: 1.4;
  }
  .hidden { display: none !important; }

  .input-row { display: flex; gap: 6px; }
  .input-row input, .input-row select { flex: 1; }

  .icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; flex-shrink: 0;
    background: var(--input-bg); border: 1px solid var(--input-border);
    border-radius: var(--radius); cursor: pointer; color: var(--fg-muted);
    transition: all .15s;
  }
  .icon-btn:hover { border-color: var(--input-focus); color: var(--fg); }
  .icon-btn.spinning svg { animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .api-key-panel {
    display: none;
    margin-top: 8px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: rgba(255,255,255,.035);
  }
  .api-key-panel.visible { display: block; }
  .api-key-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-top: 8px;
  }
  .api-key-actions .btn { margin: 0; padding: 6px 8px; }
  .api-key-feedback {
    display: none;
    margin-top: 7px;
    font-size: 11px;
    line-height: 1.4;
  }
  .api-key-feedback.visible { display: block; }
  .api-key-feedback.ok { color: var(--success); }
  .api-key-feedback.error { color: var(--error); }

  .btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; padding: 7px 12px; margin-bottom: 6px;
    border: none; border-radius: var(--radius); cursor: pointer;
    font-size: 12px; font-weight: 600; transition: all .15s;
    font-family: inherit;
  }
  .btn:last-child { margin-bottom: 0; }
  .btn-primary {
    background: var(--btn-bg); color: var(--btn-fg);
  }
  .btn-primary:hover:not(:disabled) { background: var(--btn-hover); }
  .btn-secondary {
    background: var(--btn-sec-bg); color: var(--btn-sec-fg);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--btn-sec-hover); }
  .btn:disabled { opacity: .45; cursor: not-allowed; }

  .scope-row { display: flex; gap: 5px; margin-top: 8px; }
  .scope-btn {
    flex: 1; padding: 5px 4px; font-size: 11px; font-weight: 500;
    background: var(--input-bg); border: 1px solid var(--input-border);
    border-radius: var(--radius); cursor: pointer; color: var(--fg-muted);
    transition: all .15s; text-align: center; font-family: inherit;
  }
  .scope-btn:hover:not(:disabled) { border-color: var(--input-focus); color: var(--fg); }
  .scope-btn:disabled { opacity: .45; cursor: not-allowed; }

  .progress-section { display: none; }
  .progress-section.visible { display: block; }
  .progress-phase {
    font-size: 10px; color: var(--fg-muted); text-transform: uppercase;
    letter-spacing: .5px; margin-bottom: 6px;
  }
  .progress-track {
    height: 4px; background: var(--input-bg); border-radius: 2px;
    overflow: hidden; margin-bottom: 6px;
  }
  .progress-fill {
    height: 100%; background: var(--progress-bg);
    border-radius: 2px; width: 0%;
    transition: width .3s ease;
  }
  .progress-meta {
    display: flex; justify-content: space-between;
    font-size: 11px; color: var(--fg-muted);
  }
  .progress-file {
    font-size: 11px; color: var(--fg-muted); margin-top: 4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .log-section {
    padding: 0 14px 12px;
    max-height: 180px; overflow-y: auto;
  }
  .log-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0 6px; position: sticky; top: 0;
    background: var(--bg);
  }
  .log-clear {
    font-size: 10px; color: var(--fg-muted); cursor: pointer;
    background: none; border: none; font-family: inherit;
    padding: 0;
  }
  .log-clear:hover { color: var(--fg); }
  .log-entry {
    font-size: 11px; line-height: 1.6; padding: 1px 0;
    font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
    display: flex; gap: 6px;
  }
  .log-ts { color: var(--fg-muted); flex-shrink: 0; }
  .log-info { color: var(--fg); }
  .log-success { color: var(--success); }
  .log-error { color: var(--error); }
  .log-warning { color: var(--warning); }
  .log-empty { font-size: 11px; color: var(--fg-muted); font-style: italic; padding: 4px 0; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
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
    <span id="statusText" style="font-size:11px;">Ready</span>
  </div>
</div>

<div class="section" id="authSection">
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

<div class="section" id="providerSection">
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
      <option value="ai" selected>AI Documentation</option>
      <option value="local">Local Documentation — No AI</option>
    </select>
    <div class="field-help hidden" id="localModeHelp">Runs entirely on this machine. No API key, internet connection, or AI model required.</div>
  </div>

  <div class="field" id="depthField">
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

  <div style="margin-top:10px;">
    <button class="btn btn-primary" id="generateBtn">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <span id="generateBtnText">Generate Documentation</span>
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

<div class="log-section" id="logSection" style="display:none;">
  <div class="log-header">
    <span class="section-label" style="margin:0;">Output</span>
    <button class="log-clear" id="logClear">Clear</button>
  </div>
  <div id="logContainer"></div>
</div>

<script>
(function() {
  'use strict';
  var vscode = acquireVsCodeApi();

  var state = {
    isGenerating: false,
  };

  var $ = function(id) { return document.getElementById(id); };

  var statusDot    = $('statusDot');
  var statusText   = $('statusText');
  var authSection  = $('authSection');
  var authStatus   = $('authStatus');
  var authText     = $('authText');
  var authIcon     = $('authIcon');
  var providerSection = $('providerSection');
  var generationModeSel = $('generationMode');
  var localModeHelp = $('localModeHelp');
  var depthField = $('depthField');
  var providerSel  = $('provider');
  var modelInput   = $('model');
  var customEndpointField = $('customEndpointField');
  var customEndpointInput = $('customApiEndpoint');
  var generateBtn  = $('generateBtn');
  var generateBtnText = $('generateBtnText');
  var cancelBtn    = $('cancelBtn');
  var clearCacheBtn = $('clearCacheBtn');
  var configureBtn = $('configureBtn');
  var progressSec  = $('progressSection');
  var progressFill = $('progressFill');
  var progressPct  = $('progressPct');
  var progressFile = $('progressFile');
  var progressFiles= $('progressFiles');
  var progressPhase= $('progressPhase');
  var logSection   = $('logSection');
  var logContainer = $('logContainer');
  var logClear     = $('logClear');
  var apiKeyPanel  = $('apiKeyPanel');
  var apiKeyInput  = $('apiKeyInput');
  var saveApiKeyBtn = $('saveApiKeyBtn');
  var cancelApiKeyBtn = $('cancelApiKeyBtn');
  var apiKeyFeedback = $('apiKeyFeedback');

  function isLocalMode() {
    return generationModeSel && generationModeSel.value === 'local';
  }

  function updateActionAvailability() {
    generateBtn.disabled = state.isGenerating;
    document.querySelectorAll('.scope-btn').forEach(function(btn) {
      btn.disabled = state.isGenerating;
    });
  }

  function updateGenerationModeVisibility() {
    var local = isLocalMode();
    authSection.classList.toggle('hidden', local);
    providerSection.classList.toggle('hidden', local);
    depthField.classList.toggle('hidden', local);
    localModeHelp.classList.toggle('hidden', !local);
    generateBtnText.textContent = local
      ? 'Generate Local Documentation'
      : 'Generate Documentation';
    if (local) setApiKeyPanelVisible(false);
    updateCustomEndpointVisibility();
    updateActionAvailability();
  }

  function setApiKeyStatus(configured, provider) {
    var selectedProvider = provider || providerSel.value;
    if (configured) {
      authStatus.className = 'auth-status ok';
      authText.textContent = 'API Key configured';
      authIcon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    } else if (selectedProvider === 'custom') {
      authStatus.className = 'auth-status optional';
      authText.textContent = 'API Key optional';
      authIcon.innerHTML = '<path d="M7 14a5 5 0 1 1 3.9 4.9L8 22H5v-3H2v-3l5.1-5.1A5 5 0 0 1 7 14z"/>';
    } else {
      authStatus.className = 'auth-status missing';
      authText.textContent = 'API Key not configured';
      authIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
    }
  }

  function showApiKeyFeedback(message, ok) {
    apiKeyFeedback.textContent = message || '';
    apiKeyFeedback.className = 'api-key-feedback visible ' + (ok ? 'ok' : 'error');
  }

  function setApiKeyPanelVisible(visible) {
    apiKeyPanel.classList.toggle('visible', visible);
    if (visible) {
      apiKeyFeedback.className = 'api-key-feedback';
      apiKeyFeedback.textContent = '';
      setTimeout(function() { apiKeyInput.focus(); }, 0);
    } else {
      apiKeyInput.value = '';
      apiKeyFeedback.className = 'api-key-feedback';
      apiKeyFeedback.textContent = '';
    }
  }

  function setStatus(mode, text) {
    statusDot.className = 'status-dot' + (mode ? ' ' + mode : '');
    statusText.textContent = text;
  }

  function setGenerating(on) {
    state.isGenerating = on;
    updateActionAvailability();
    cancelBtn.disabled = !on;
    clearCacheBtn.disabled = on;
    progressSec.classList.toggle('visible', on);
    if (on) {
      setStatus('running', 'Generating…');
    } else {
      setStatus('', 'Ready');
      progressFill.style.width = '0%';
      progressPct.textContent = '0%';
      progressFile.textContent = '';
      progressPhase.textContent = 'Initializing…';
    }
  }

  function addLog(message, type, ts) {
    logSection.style.display = '';
    var entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML =
      '<span class="log-ts">' + (ts || new Date().toLocaleTimeString()) + '</span>' +
      '<span class="log-' + (type || 'info') + '">' + escHtml(message) + '</span>';
    logContainer.appendChild(entry);
    logSection.scrollTop = logSection.scrollHeight;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getCustomEndpoint() {
    return customEndpointInput ? customEndpointInput.value.trim() : '';
  }

  function updateCustomEndpointVisibility() {
    if (!customEndpointField) return;
    customEndpointField.classList.toggle(
      'hidden',
      isLocalMode() || providerSel.value !== 'custom'
    );
  }

  function applyNormalizedSettings(settings) {
    if (!settings) return;
    if (settings.generationMode) generationModeSel.value = settings.generationMode;
    if (settings.provider) providerSel.value = settings.provider;
    if (settings.model) modelInput.value = settings.model;
    if (typeof settings.customApiEndpoint === 'string') customEndpointInput.value = settings.customApiEndpoint;
    if (settings.depth) $('depth').value = settings.depth;
    if (settings.outputFormat) $('outputFormat').value = settings.outputFormat;
    updateGenerationModeVisibility();
  }

  function validateCustomEndpointForRun() {
    if (isLocalMode() || providerSel.value !== 'custom') return true;

    var endpoint = getCustomEndpoint();
    if (!endpoint) {
      addLog('Custom Endpoint URL is required for the custom provider.', 'error');
      setStatus('error', 'Missing custom endpoint');
      return false;
    }

    try {
      var parsed = new URL(endpoint);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch (err) {
      addLog('Custom Endpoint URL must be a valid http or https URL.', 'error');
      setStatus('error', 'Invalid custom endpoint');
      return false;
    }

    return true;
  }

  generationModeSel.addEventListener('change', function() {
    updateGenerationModeVisibility();
    vscode.postMessage({
      type: 'update-settings',
      payload: { generationMode: generationModeSel.value }
    });
  });

  providerSel.addEventListener('change', function() {
    updateCustomEndpointVisibility();
    vscode.postMessage({
      type: 'update-settings',
      payload: {
        provider: providerSel.value,
        model: modelInput.value.trim(),
        customApiEndpoint: getCustomEndpoint()
      }
    });
  });

  modelInput.addEventListener('change', function() {
    vscode.postMessage({ type: 'update-settings', payload: { model: modelInput.value.trim() } });
  });

  customEndpointInput.addEventListener('change', function() {
    vscode.postMessage({ type: 'update-settings', payload: { customApiEndpoint: getCustomEndpoint() } });
  });

  generateBtn.addEventListener('click', function() {
    if (!validateCustomEndpointForRun()) return;
    var payload = {
      generationMode: generationModeSel.value,
      provider: providerSel.value,
      model: modelInput.value.trim(),
      customApiEndpoint: getCustomEndpoint(),
      depth: $('depth').value,
      outputFormat: $('outputFormat').value,
      scope: 'workspace',
    };
    vscode.postMessage({ type: 'generate-documentation', payload: payload });
    setGenerating(true);
  });

  cancelBtn.addEventListener('click', function() {
    vscode.postMessage({ type: 'cancel-generation' });
  });

  clearCacheBtn.addEventListener('click', function() {
    vscode.postMessage({ type: 'clear-cache' });
  });

  configureBtn.addEventListener('click', function() {
    setApiKeyPanelVisible(!apiKeyPanel.classList.contains('visible'));
  });

  saveApiKeyBtn.addEventListener('click', function() {
    var apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showApiKeyFeedback('API key cannot be empty.', false);
      return;
    }
    saveApiKeyBtn.disabled = true;
    showApiKeyFeedback('Saving key...', true);
    vscode.postMessage({ type: 'save-api-key', provider: providerSel.value, apiKey: apiKey });
  });

  cancelApiKeyBtn.addEventListener('click', function() {
    setApiKeyPanelVisible(false);
  });

  apiKeyInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveApiKeyBtn.click();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setApiKeyPanelVisible(false);
    }
  });

  document.querySelectorAll('.scope-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var scope = btn.getAttribute('data-scope');
      var payload = {
        generationMode: generationModeSel.value,
        provider: providerSel.value,
        model: modelInput.value.trim(),
        customApiEndpoint: getCustomEndpoint(),
        depth: $('depth').value,
        outputFormat: $('outputFormat').value,
      };
      if (!validateCustomEndpointForRun()) return;
      if (scope === 'current-file') {
        vscode.postMessage({ type: 'pick-file', payload: payload });
      } else if (scope === 'folder') {
        vscode.postMessage({ type: 'pick-folder', payload: payload });
      } else {
        vscode.postMessage({ type: 'generate-documentation', payload: Object.assign({}, payload, { scope: 'workspace' }) });
        setGenerating(true);
      }
    });
  });

  ['depth','outputFormat'].forEach(function(id) {
    $(id).addEventListener('change', function() {
      var payload = {};
      payload[id] = this.value;
      vscode.postMessage({ type: 'update-settings', payload: payload });
    });
  });

  logClear.addEventListener('click', function() {
    logContainer.innerHTML = '';
    logSection.style.display = 'none';
  });

  window.addEventListener('message', function(event) {
    var msg = event.data;
    switch (msg.type) {

      case 'restore-state':
        if (!msg.state) break;
        var s = msg.state;
        if (s.settings) {
          applyNormalizedSettings(s.settings);
        }
        setApiKeyStatus(s.apiKeyConfigured, s.settings && s.settings.provider);
        if (s.isGenerating) setGenerating(true);
        if (s.logs && s.logs.length) {
          s.logs.forEach(function(l) { addLog(l.message, l.type, l.timestamp); });
        }
        break;

      case 'settings-normalized':
        applyNormalizedSettings(msg.settings);
        break;

      case 'api-key-status':
        setApiKeyStatus(msg.configured, msg.provider);
        break;

      case 'show-api-key-form':
        if (!isLocalMode()) setApiKeyPanelVisible(true);
        break;

      case 'api-key-save-result':
        saveApiKeyBtn.disabled = false;
        showApiKeyFeedback(msg.message || (msg.ok ? 'API key saved.' : 'Could not save API key.'), !!msg.ok);
        if (msg.ok) {
          apiKeyInput.value = '';
          setTimeout(function() { setApiKeyPanelVisible(false); }, 900);
        }
        break;

      case 'progress':
        progressFill.style.width = (msg.percentage || 0) + '%';
        progressPct.textContent = Math.round(msg.percentage || 0) + '%';
        if (msg.message) progressPhase.textContent = msg.message;
        if (msg.currentFile) progressFile.textContent = msg.currentFile;
        if (msg.totalFiles != null) {
          progressFiles.textContent = (msg.processedFiles || 0) + ' / ' + msg.totalFiles + ' files';
        }
        break;

      case 'log':
        addLog(msg.message, msg.logType, msg.timestamp);
        break;

      case 'generating-state':
        setGenerating(msg.generating);
        break;

      case 'complete':
        setGenerating(false);
        setStatus('', 'Complete');
        break;

      case 'error':
        setGenerating(false);
        setStatus('error', 'Error');
        if (msg.message) addLog(msg.message, 'error');
        break;
    }
  });

  vscode.postMessage({ type: 'ready' });

})();
</script>
</body>
</html>`;
  }
}
