import { SIDEBAR_STYLES } from "./sidebarStyles";
import { SIDEBAR_CLIENT_SCRIPT } from "./sidebarClientScript";

export interface SidebarTemplateOptions {
  cspSource: string;
  nonce: string;
}

export function buildSidebarHtml(
  options: SidebarTemplateOptions,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${options.cspSource} data:; style-src 'nonce-${options.nonce}'; script-src 'nonce-${options.nonce}';">
<title>Documint</title>
<style nonce="${options.nonce}">
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
      <option value="ollama">Ollama — Local</option>
      <option value="lmstudio">LM Studio — Local</option>
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

<script nonce="${options.nonce}">
${SIDEBAR_CLIENT_SCRIPT}
</script>
</body>
</html>`;
}
