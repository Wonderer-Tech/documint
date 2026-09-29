export const SIDEBAR_STYLES = String.raw`
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
  .status-text { font-size: 11px; }
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
  .section-label.no-margin { margin: 0; }

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

  .generation-actions { margin-top: 10px; }
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
`;
