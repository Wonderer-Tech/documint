import * as vscode from "vscode";
import { SecretStorageManager } from "../config/secretStorage";

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
      provider: "openai",
      model: "gpt-4o",
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

          case "configure-api-key":
            await vscode.commands.executeCommand(
              "aiDocGenerator.configureApiKey",
              msg.provider || this._state.settings.provider,
            );
            break;

          case "update-settings":
            this._state.settings = { ...this._state.settings, ...msg.payload };
            break;
        }
      } catch (e) {
        console.error("[Documint] webview message handler error:", e);
      }
    });
  }

  // ── Public API called from extension.ts ────────────────────────────────────

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

  public updateApiKeyStatus(configured: boolean) {
    this._state.apiKeyConfigured = configured;
    this._post({ type: "api-key-status", configured });
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private _post(msg: Record<string, unknown>) {
    this._view?.webview.postMessage(msg);
  }

  private async _restoreState() {
    // Re-validate API key from storage
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

  // ── HTML ───────────────────────────────────────────────────────────────────

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

  /* ── Header ── */
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

  /* ── Sections ── */
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

  /* ── API Key status ── */
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
  .auth-status svg { flex-shrink: 0; }

  /* ── Form controls ── */
  .field { margin-bottom: 8px; }
  .field:last-child { margin-bottom: 0; }
  .field-label {
    display: block; font-size: 11px; color: var(--fg-muted);
    margin-bottom: 4px; font-weight: 500;
  }
  select, input[type="text"], input[type="number"] {
    width: 100%; padding: 5px 8px;
    background: var(--input-bg); color: var(--input-fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius); font-size: 12px; outline: none;
    transition: border-color .15s;
    font-family: inherit;
  }
  select:focus, input:focus { border-color: var(--input-focus); }
  select { cursor: pointer; }

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


  /* ── Buttons ── */
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

  /* Quick scope buttons */
  .scope-row { display: flex; gap: 5px; margin-top: 8px; }
  .scope-btn {
    flex: 1; padding: 5px 4px; font-size: 11px; font-weight: 500;
    background: var(--input-bg); border: 1px solid var(--input-border);
    border-radius: var(--radius); cursor: pointer; color: var(--fg-muted);
    transition: all .15s; text-align: center; font-family: inherit;
  }
  .scope-btn:hover { border-color: var(--input-focus); color: var(--fg); }

  /* ── Progress ── */
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

  /* ── Log ── */
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

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
</style>
</head>
<body>

<!-- Header -->
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

<!-- Authentication -->
<div class="section">
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
  <button class="btn btn-secondary" id="configureBtn" style="font-size:11px;padding:5px 10px;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    Configure API Key
  </button>
</div>

<!-- Provider & Model -->
<div class="section">
  <div class="section-label">
    Provider &amp; Model
    <div class="section-label-line"></div>
  </div>

  <div class="field">
    <label class="field-label">AI Provider</label>
    <select id="provider">
      <option value="openai">OpenAI</option>
      <option value="anthropic">Anthropic</option>
      <option value="openrouter">OpenRouter</option>
      <option value="deepseek">DeepSeek</option>
      <option value="ollama">Ollama (Local)</option>
      <option value="lmstudio">LM Studio (Local)</option>
      <option value="custom">Custom Endpoint</option>
    </select>
  </div>

  <div class="field">
    <label class="field-label">Model</label>
    <input type="text" id="model" value="gpt-4o" placeholder="e.g. gpt-4o, gpt-4.1-nano, claude-3-5-sonnet-20241022">
  </div>
</div>


<!-- Generation Settings -->
<div class="section">
  <div class="section-label">
    Generation
    <div class="section-label-line"></div>
  </div>

  <div class="field">
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
      Generate Documentation
    </button>
    <button class="btn btn-secondary" id="cancelBtn" disabled>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="12" height="12"/>
      </svg>
      Cancel
    </button>
  </div>

  <div class="scope-row">
    <button class="scope-btn" data-scope="current-file">File</button>
    <button class="scope-btn" data-scope="folder">Folder</button>
    <button class="scope-btn" data-scope="workspace">Workspace</button>
  </div>
</div>

<!-- Progress (hidden until generating) -->
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

<!-- Output Log -->
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

  // ── State ──────────────────────────────────────────────────────────────────
  var state = {
    isGenerating: false,
  };

  // ── Elements ───────────────────────────────────────────────────────────────
  var $ = function(id) { return document.getElementById(id); };

  var statusDot    = $('statusDot');
  var statusText   = $('statusText');
  var authStatus   = $('authStatus');
  var authText     = $('authText');
  var authIcon     = $('authIcon');
  var providerSel  = $('provider');
  var modelInput   = $('model');
  var generateBtn  = $('generateBtn');
  var cancelBtn    = $('cancelBtn');
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

  // ── API key status ─────────────────────────────────────────────────────────
  function setApiKeyStatus(configured) {
    if (configured) {
      authStatus.className = 'auth-status ok';
      authText.textContent = 'API Key configured';
      authIcon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    } else {
      authStatus.className = 'auth-status missing';
      authText.textContent = 'API Key not configured';
      authIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
    }
  }

  // ── Status bar ─────────────────────────────────────────────────────────────
  function setStatus(mode, text) {
    statusDot.className = 'status-dot' + (mode ? ' ' + mode : '');
    statusText.textContent = text;
  }

  // ── Generating state ───────────────────────────────────────────────────────
  function setGenerating(on) {
    state.isGenerating = on;
    generateBtn.disabled = on;
    cancelBtn.disabled = !on;
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

  // ── Log ───────────────────────────────────────────────────────────────────
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

  // ── Event listeners ────────────────────────────────────────────────────────

  providerSel.addEventListener('change', function() {
    var providerDefaults = {
      deepseek: 'deepseek-v4-flash',
      ollama: 'llama3',
      lmstudio: 'local-model'
    };
    if (providerDefaults[providerSel.value] && (!modelInput.value.trim() || modelInput.value.trim() === 'gpt-4o')) {
      modelInput.value = providerDefaults[providerSel.value];
    }
    vscode.postMessage({ type: 'update-settings', payload: { provider: providerSel.value, model: modelInput.value.trim() } });
  });

  modelInput.addEventListener('change', function() {
    vscode.postMessage({ type: 'update-settings', payload: { model: modelInput.value.trim() } });
  });

  generateBtn.addEventListener('click', function() {
    var payload = {
      provider: providerSel.value,
      model: modelInput.value.trim(),
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

  configureBtn.addEventListener('click', function() {
    vscode.postMessage({ type: 'configure-api-key', provider: providerSel.value });
  });

  document.querySelectorAll('.scope-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var scope = btn.getAttribute('data-scope');
      var payload = {
        provider: providerSel.value,
        model: modelInput.value.trim(),
        depth: $('depth').value,
        outputFormat: $('outputFormat').value,
      };
      if (scope === 'current-file') {
        // Open native file picker in extension host — setGenerating called after user confirms
        vscode.postMessage({ type: 'pick-file', payload: payload });
      } else if (scope === 'folder') {
        // Open native folder picker in extension host — setGenerating called after user confirms
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

  // ── Messages from extension ────────────────────────────────────────────────
  window.addEventListener('message', function(event) {
    var msg = event.data;
    switch (msg.type) {

      case 'restore-state':
        if (!msg.state) break;
        var s = msg.state;
        setApiKeyStatus(s.apiKeyConfigured);
        if (s.settings) {
          if (s.settings.provider) providerSel.value = s.settings.provider;
          if (s.settings.model) modelInput.value = s.settings.model;
          if (s.settings.depth) $('depth').value = s.settings.depth;
          if (s.settings.outputFormat) $('outputFormat').value = s.settings.outputFormat;
        }
        if (s.isGenerating) setGenerating(true);
        if (s.logs && s.logs.length) {
          s.logs.forEach(function(l) { addLog(l.message, l.type, l.timestamp); });
        }
        break;

      case 'api-key-status':
        setApiKeyStatus(msg.configured);
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

  // ── Init ───────────────────────────────────────────────────────────────────
  vscode.postMessage({ type: 'ready' });

})();
</script>
</body>
</html>`;
  }
}
