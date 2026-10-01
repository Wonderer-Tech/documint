import type { LocalCodeMapData } from "./localCodeMapData";

export interface LocalCodeMapFragments {
  styles: string;
  markup: string;
  script: string;
}

export function renderLocalCodeMapFragments(
  data: LocalCodeMapData | undefined,
  scriptNonce = "",
): LocalCodeMapFragments {
  if (!data || data.files.length === 0) {
    return { styles: "", markup: "", script: "" };
  }

  const nonceAttribute = scriptNonce
    ? ` nonce="${escapeHtmlAttribute(scriptNonce)}"`
    : "";

  return {
    styles: LOCAL_CODE_MAP_STYLES,
    markup: LOCAL_CODE_MAP_MARKUP.replace(
      "<script type=\"application/json\"",
      `<script${nonceAttribute} type="application/json"`,
    ),
    script: buildLocalCodeMapScript(data, nonceAttribute),
  };
}

const LOCAL_CODE_MAP_STYLES = String.raw`
  body.documint-local-report {
    --map-grid: #E2EAE6;
    --bg-primary: #F6F8F7;
    --bg-secondary: #FFFFFF;
    --bg-tertiary: #E8EFEC;
    --bg-code: #EEF3F1;
    --border: #C9D4CF;
    --text-primary: #24303A;
    --text-secondary: #5E6B74;
    --text-muted: #78858C;
    --accent: #1E8C6E;
    --accent-subtle: #D3EEE4;
    --heading-1: #24303A;
    --heading-2: #24303A;
    --heading-3: #3F6394;
    --code-inline: #B8475A;
    --jelly-surface: color-mix(in srgb, #F6F8F7 88%, transparent);
    --jelly-surface-strong: #FFFFFF;
    --jelly-surface-soft: color-mix(in srgb, #1E8C6E 4%, transparent);
    --jelly-surface-hover: color-mix(in srgb, #1E8C6E 7%, transparent);
    --jelly-border: #C9D4CF;
    --jelly-border-accent: color-mix(in srgb, #1E8C6E 45%, #C9D4CF);
    --jelly-shadow: none;
    --jelly-shadow-soft: none;
    --jelly-highlight: none;
    --jelly-glow: transparent;
    --jelly-table-row: color-mix(in srgb, #1E8C6E 2%, transparent);
    color: #24303A;
    background-color: #F6F8F7;
    background-image:
      linear-gradient(var(--map-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--map-grid) 1px, transparent 1px);
    background-size: 28px 28px;
    font-family: "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    letter-spacing: 0;
  }
  :root[data-theme="dark"] body.documint-local-report {
    --map-grid: #1C282E;
    --bg-primary: #131B20;
    --bg-secondary: #18232A;
    --bg-tertiary: #223038;
    --bg-code: #18232A;
    --border: #34454C;
    --text-primary: #DCE5E2;
    --text-secondary: #A9B7BC;
    --text-muted: #93A2A9;
    --accent: #4CC9A0;
    --accent-subtle: #163A30;
    --heading-1: #DCE5E2;
    --heading-2: #DCE5E2;
    --heading-3: #8DB0E6;
    --code-inline: #E48597;
    --jelly-surface: color-mix(in srgb, #131B20 90%, transparent);
    --jelly-surface-strong: #18232A;
    --jelly-surface-soft: color-mix(in srgb, #4CC9A0 5%, transparent);
    --jelly-surface-hover: color-mix(in srgb, #4CC9A0 8%, transparent);
    --jelly-border: #34454C;
    --jelly-border-accent: color-mix(in srgb, #4CC9A0 45%, #34454C);
    --jelly-shadow: none;
    --jelly-shadow-soft: none;
    --jelly-highlight: none;
    --jelly-glow: transparent;
    --jelly-table-row: color-mix(in srgb, #4CC9A0 2%, transparent);
    color: #DCE5E2;
    background-color: #131B20;
    background-image:
      linear-gradient(var(--map-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--map-grid) 1px, transparent 1px);
  }
  .documint-local-report::before { display: none; }

  .documint-local-report .topbar {
    top: 0;
    left: 0;
    right: 0;
    height: var(--topbar-h);
    padding: 0 20px;
    border: 0;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
    box-shadow: none;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .documint-local-report .topbar-client {
    padding: 4px 0;
    border-radius: 0;
    color: var(--text-primary);
    font-size: 17px;
    font-weight: 700;
  }
  .documint-local-report .topbar-client:hover {
    background: transparent;
    color: var(--accent);
    transform: none;
  }
  .documint-local-report .topbar-client::before {
    width: 9px;
    height: 9px;
    background: var(--accent);
    box-shadow: none;
  }
  .documint-local-report .search-input,
  .documint-local-report .sidebar-filter,
  .documint-local-report .theme-btn {
    border-color: var(--border);
    border-radius: 9px;
    background: var(--bg-secondary);
    box-shadow: none;
  }
  .documint-local-report .search-input:focus,
  .documint-local-report .sidebar-filter:focus {
    border-color: var(--accent);
    box-shadow: none;
  }
  .documint-local-report .theme-btn:hover {
    border-color: var(--accent);
    background: var(--bg-secondary);
    color: var(--text-primary);
    box-shadow: none;
    transform: none;
  }

  .documint-local-report .sidebar {
    top: var(--topbar-h);
    bottom: 0;
    padding: 14px 0 20px;
    border: 0;
    border-right: 1px solid var(--border);
    border-radius: 0;
    background: color-mix(in srgb, var(--bg-primary) 94%, var(--bg-secondary));
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .documint-local-report .sidebar-head {
    border-color: var(--border);
    border-radius: 10px;
    background: var(--bg-secondary);
    box-shadow: none;
  }
  .documint-local-report .sidebar-project-name { color: var(--text-primary); }
  .documint-local-report .smart-toc-group {
    border-color: transparent;
    border-radius: 8px;
    background: transparent;
    box-shadow: none;
  }
  .documint-local-report .smart-toc-group:hover {
    border-color: transparent;
    background: var(--jelly-surface-hover);
  }
  .documint-local-report .smart-toc-group[open] {
    border-color: transparent;
    background: transparent;
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .documint-local-report .smart-toc-count {
    border-color: var(--border);
    background: var(--bg-secondary);
  }
  .documint-local-report .smart-toc-items .toc-link.active,
  .documint-local-report .toc-link.active {
    background: var(--accent-subtle);
    border-left-color: var(--accent) !important;
  }

  .documint-local-report .main {
    margin-top: var(--topbar-h);
    padding: 34px clamp(24px, 4vw, 48px) 100px;
    background: transparent;
  }
  .documint-local-report .client-heading {
    max-width: 1120px;
    margin: 0 auto 10px;
  }
  .documint-local-report .client-name-highlight {
    padding: 0;
    border: 0;
    background: none;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .documint-local-report .stats-banner {
    max-width: 1120px;
    margin: 0 auto 18px;
    padding: 10px 14px;
    border-color: var(--border);
    border-radius: 10px;
    background: var(--bg-secondary);
    box-shadow: none;
  }
  .documint-local-report .stat-item {
    padding: 2px 6px;
    border-radius: 0;
  }
  .documint-local-report .calendar-chip,
  .documint-local-report .digital-clock {
    border-color: var(--border);
    border-radius: 8px;
    background: var(--bg-primary);
    box-shadow: none;
  }

  .documint-local-report .main > h1 {
    max-width: 1120px;
    margin: 46px auto 18px;
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-left: 0;
    border-radius: 10px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-family: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 18px;
    font-weight: 500;
  }
  .documint-local-report .main > h1::before { display: none; }
  .documint-local-report .main > h2 {
    color: var(--text-primary);
    border-left-color: var(--accent);
  }
  .documint-local-report .main > h3 { color: var(--heading-3); }
  .documint-local-report .main code {
    border-color: var(--border);
    background: var(--bg-secondary);
    font-family: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  }
  .documint-local-report .main pre,
  .documint-local-report .main table,
  .documint-local-report .main blockquote {
    border-color: var(--border);
    box-shadow: none;
  }
  .documint-local-report .main th { background: var(--bg-tertiary); }
  .documint-local-report .main tr:nth-child(even) td { background: var(--jelly-table-row); }
  .documint-local-report .btt {
    border-color: var(--border);
    background: var(--bg-secondary);
    box-shadow: none;
  }
  .documint-local-report .doc-footer {
    border-top-color: var(--border);
    background: color-mix(in srgb, var(--bg-primary) 94%, transparent);
  }

  .local-code-map {
    --map-paper: #F6F8F7;
    --map-grid: #E2EAE6;
    --map-ink: #24303A;
    --map-muted: #5E6B74;
    --map-line: #C9D4CF;
    --map-mint: #1E8C6E;
    --map-note: #3F6394;
    --map-highlight: #FFE66D;
    --map-card: #FFFFFF;
    --map-s0: #5B6770;
    --map-t0: #E3E8EB;
    --map-s1: #3F6394;
    --map-t1: #DAE4F2;
    --map-s2: #B7791F;
    --map-t2: #F5E6C6;
    --map-s3: #1E8C6E;
    --map-t3: #D3EEE4;
    --map-s4: #B8475A;
    --map-t4: #F4DCE0;
    --map-s5: #7A5BA6;
    --map-t5: #E7DFF3;
    --map-s6: #6B7F2A;
    --map-t6: #E5EBCE;
    --map-hand: "Kalam", "Comic Neue", "Segoe Print", "Bradley Hand", cursive;
    --map-sans: "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --map-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

    max-width: 1120px;
    margin: 0 auto 42px;
    padding: 0 0 64px;
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--map-ink);
    box-shadow: none;
    font-family: var(--map-sans);
  }
  :root[data-theme="dark"] .local-code-map {
    --map-paper: #131B20;
    --map-grid: #1C282E;
    --map-ink: #DCE5E2;
    --map-muted: #93A2A9;
    --map-line: #34454C;
    --map-mint: #4CC9A0;
    --map-note: #8DB0E6;
    --map-highlight: #C9B43E;
    --map-card: #18232A;
    --map-s0: #9AA7B0;
    --map-t0: #29333A;
    --map-s1: #86A6D6;
    --map-t1: #21304A;
    --map-s2: #E0A95A;
    --map-t2: #3B3020;
    --map-s3: #4CC9A0;
    --map-t3: #163A30;
    --map-s4: #E48597;
    --map-t4: #44252C;
    --map-s5: #B39AD8;
    --map-t5: #32294A;
    --map-s6: #A9BF62;
    --map-t6: #2E3619;
  }
  :root[data-theme="light"] .local-code-map {
    --map-paper: #F6F8F7;
    --map-grid: #E2EAE6;
    --map-ink: #24303A;
    --map-muted: #5E6B74;
    --map-line: #C9D4CF;
    --map-mint: #1E8C6E;
    --map-note: #3F6394;
    --map-highlight: #FFE66D;
    --map-card: #FFFFFF;
  }
  .local-code-map *,
  .local-code-map *::before,
  .local-code-map *::after { box-sizing: border-box; }
  .local-code-map button,
  .local-code-map input { font-family: inherit; }
  .local-code-map code { font-family: var(--map-mono); }
  .local-code-map .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .local-map-hero {
    display: flex;
    gap: 24px;
    align-items: flex-end;
    justify-content: space-between;
    padding: 42px 0 24px;
    max-width: 100%;
  }
  .local-map-kicker {
    display: block;
    margin-bottom: 8px;
    color: var(--map-mint);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .12em;
    text-transform: uppercase;
  }
  .local-map-hero h2 {
    margin: 0;
    color: var(--map-ink);
    font-family: var(--map-sans);
    font-size: clamp(34px, 4vw, 46px);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -.01em;
  }
  .local-map-hero p {
    max-width: 68ch;
    margin: 12px 0 0;
    color: var(--map-muted);
    font-size: 15.5px;
    line-height: 1.55;
  }
  .local-map-badge {
    flex: none;
    padding: 6px 11px;
    border: 1px solid var(--map-line);
    border-radius: 20px;
    background: var(--map-card);
    color: var(--map-muted);
    font-family: var(--map-mono);
    font-size: 11px;
    font-weight: 500;
  }

  .local-map-nav {
    position: sticky;
    top: calc(var(--topbar-h, 52px) + 1px);
    z-index: 12;
    display: flex;
    gap: 18px;
    overflow-x: auto;
    margin: 0;
    padding: 9px 0 10px;
    border-top: 1px solid color-mix(in srgb, var(--map-line) 80%, transparent);
    border-bottom: 1px solid var(--map-line);
    background: color-mix(in srgb, var(--map-paper) 88%, transparent);
    backdrop-filter: blur(8px);
    scrollbar-width: none;
  }
  .local-map-nav::-webkit-scrollbar { display: none; }
  .local-map-nav a {
    position: relative;
    flex: none;
    padding: 3px 0;
    border: 0;
    background: transparent;
    color: var(--map-muted);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }
  .local-map-nav a::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: -10px;
    left: 0;
    height: 2px;
    background: transparent;
  }
  .local-map-nav a:hover,
  .local-map-nav a:focus,
  .local-map-nav a.active {
    color: var(--map-ink);
    outline: none;
  }
  .local-map-nav a.active::after { background: var(--map-mint); }
  .local-map-nav a[hidden] { display: none; }

  .local-map-section { scroll-margin-top: 78px; }
  .local-map-section {
    padding: 46px 0 0;
    border: 0;
  }
  .local-map-section:first-of-type { padding-top: 38px; }
  .local-map-section-head {
    display: block;
    margin-bottom: 16px;
  }
  .local-map-section h3 {
    margin: 0;
    color: var(--map-ink);
    font-family: var(--map-sans);
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }
  .local-map-question {
    margin: 2px 0 0;
    color: var(--map-note);
    font-family: var(--map-hand);
    font-size: 20px;
    font-style: normal;
    font-weight: 400;
    line-height: 1.3;
    transform: rotate(-.15deg);
    transform-origin: left center;
  }
  .local-map-hint {
    max-width: 72ch;
    margin: 10px 0 0;
    color: var(--map-muted);
    font-size: 13.5px;
    line-height: 1.5;
  }

  .local-map-panel,
  .local-map-overview-card,
  .local-map-fact-card,
  .local-map-card {
    border: 1px solid var(--map-line);
    border-radius: 14px;
    background: var(--map-card);
    box-shadow: none;
  }
  .local-map-panel { overflow: hidden; }

  .local-map-overview {
    display: grid;
    gap: 12px;
  }
  .local-map-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
    gap: 8px;
  }
  .local-map-stat {
    min-width: 0;
    padding: 12px 13px;
    border: 1px solid var(--map-line);
    border-radius: 9px;
    background: var(--map-card);
  }
  .local-map-stat strong {
    display: block;
    color: var(--map-ink);
    font-family: var(--map-mono);
    font-size: 17px;
    line-height: 1.15;
  }
  .local-map-stat span {
    display: block;
    margin-top: 4px;
    color: var(--map-muted);
    font-size: 10.5px;
  }
  .local-map-overview-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 10px;
  }
  .local-map-overview-card {
    min-width: 0;
    padding: 14px;
  }
  .local-map-overview-card h4,
  .local-map-fact-card h4 {
    margin: 0 0 8px;
    color: var(--map-ink);
    font-size: 13px;
    line-height: 1.3;
  }
  .local-map-overview-card p {
    margin: 0;
    color: var(--map-muted);
    font-size: 11.5px;
    line-height: 1.45;
  }
  .local-map-overview-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .local-map-overview-list code,
  .local-map-overview-list button,
  .local-map-chip-list code {
    max-width: 100%;
    border: 1px solid var(--map-line);
    border-radius: 999px;
    padding: 4px 8px;
    overflow: hidden;
    background: var(--map-paper);
    color: var(--map-ink);
    font-family: var(--map-mono);
    font-size: 10.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-overview-list button {
    color: var(--map-note);
    cursor: pointer;
  }
  .local-map-overview-list button:hover,
  .local-map-overview-list button:focus {
    border-color: var(--map-mint);
    outline: none;
  }
  .local-map-overview-more {
    margin-top: 8px;
    border-top: 1px solid var(--map-line);
    padding-top: 7px;
  }
  .local-map-overview-more summary {
    color: var(--map-note);
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    user-select: none;
  }
  .local-map-overview-more .local-map-overview-list { margin-top: 7px; }

  .local-map-onboarding {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 10px;
  }
  .local-map-fact-card {
    min-width: 0;
    padding: 15px;
  }
  .local-map-fact-source {
    margin: -3px 0 9px;
    color: var(--map-muted);
    font-family: var(--map-mono);
    font-size: 9.5px;
    overflow-wrap: anywhere;
  }
  .local-map-fact-row {
    display: grid;
    grid-template-columns: minmax(90px, .42fr) minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 6px 0;
    border-top: 1px solid var(--map-line);
    font-size: 11px;
  }
  .local-map-fact-row:first-of-type { border-top: 0; }
  .local-map-fact-label {
    color: var(--map-muted);
    font-weight: 700;
  }
  .local-map-fact-value,
  .local-map-fact-row code {
    min-width: 0;
    color: var(--map-ink);
    overflow-wrap: anywhere;
  }
  .local-map-command-row {
    padding: 7px 0;
    border-top: 1px solid var(--map-line);
  }
  .local-map-command-row:first-of-type { border-top: 0; }
  .local-map-command-row code {
    display: block;
    color: var(--map-note);
    font-size: 11px;
    overflow-wrap: anywhere;
  }
  .local-map-command-row small {
    display: block;
    margin-top: 2px;
    color: var(--map-muted);
    font-size: 10px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .local-map-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .local-map-graph-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding: 8px 10px;
    border: 1px solid var(--map-line);
    border-radius: 10px;
    background: color-mix(in srgb, var(--map-card) 94%, transparent);
  }
  .local-map-graph-toolbar-group {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .local-map-graph-toolbar-label {
    margin-right: 2px;
    color: var(--map-muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .local-map-graph-toolbar button {
    min-width: 30px;
    height: 28px;
    border: 1px solid var(--map-line);
    border-radius: 7px;
    padding: 0 8px;
    background: var(--map-paper);
    color: var(--map-ink);
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
  }
  .local-map-graph-toolbar button:hover,
  .local-map-graph-toolbar button:focus {
    border-color: var(--map-mint);
    outline: none;
  }
  .local-map-graph-toolbar button[aria-pressed="true"] {
    border-color: var(--map-mint);
    background: color-mix(in srgb, var(--map-mint) 12%, var(--map-card));
    color: var(--map-mint);
  }
  .local-map-zoom-value {
    min-width: 43px;
    color: var(--map-muted);
    font-family: var(--map-mono);
    font-size: 10px;
    text-align: center;
  }
  .local-map-graph-help {
    color: var(--map-muted);
    font-size: 10px;
  }
  .local-map-graph-insights {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 8px 2px 10px;
  }
  .local-map-graph-insight {
    border: 1px solid color-mix(in srgb, var(--map-note) 28%, var(--map-line));
    border-radius: 999px;
    padding: 4px 8px 3px;
    background: color-mix(in srgb, var(--map-note) 5%, var(--map-card));
    color: var(--map-note);
    font-family: var(--map-hand);
    font-size: 12px;
    line-height: 1.2;
  }
  .local-map-graph-panel {
    position: relative;
    overflow: hidden;
  }
  .local-map-module-canvas {
    display: block;
    width: 100%;
    min-width: 0;
    min-height: 390px;
    height: min(62vh, 620px);
    background: var(--map-card);
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .local-map-module-canvas.panning { cursor: grabbing; }
  .local-map-layer-guide {
    stroke: color-mix(in srgb, var(--map-line) 58%, transparent);
    stroke-width: 1;
    stroke-dasharray: 3 7;
    pointer-events: none;
  }
  .local-map-layer-label {
    fill: var(--map-muted);
    font-family: var(--map-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    pointer-events: none;
  }
  .local-map-module-node { cursor: pointer; }
  .local-map-module-node rect {
    fill: var(--module-tint, var(--map-card));
    stroke: var(--module-stroke, var(--map-line));
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .local-map-module-node:hover rect,
  .local-map-module-node:focus rect {
    stroke: var(--module-stroke, var(--map-mint));
    stroke-width: 2.3;
  }
  .local-map-module-node text {
    fill: var(--map-ink);
    font-family: var(--map-sans);
    font-size: 10.5px;
    font-weight: 700;
    pointer-events: none;
  }
  .local-map-module-node,
  .local-map-module-edge,
  .local-map-edge-label {
    transition: opacity .15s ease;
  }
  .local-map-module-canvas.focused .local-map-module-edge:not(.on),
  .local-map-module-canvas.focused .local-map-edge-label:not(.on) {
    opacity: .12;
  }
  .local-map-module-canvas.focused .local-map-module-node:not(.on) {
    opacity: .35;
  }
  .local-map-module-node .local-map-module-meta {
    fill: var(--map-muted);
    font-family: var(--map-mono);
    font-size: 8.3px;
    font-weight: 500;
  }
  .local-map-module-node .local-map-module-start {
    fill: var(--module-stroke, var(--map-note));
    font-family: var(--map-mono);
    font-size: 7.4px;
    font-weight: 600;
  }
  .local-map-module-edge {
    stroke: color-mix(in srgb, var(--map-muted) 58%, transparent);
    stroke-width: 1.05;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 5 6;
    fill: none;
  }
  .local-map-module-edge.mid {
    stroke: color-mix(in srgb, var(--map-muted) 82%, transparent);
    stroke-width: 1.55;
    stroke-dasharray: none;
  }
  .local-map-module-edge.strong {
    stroke: color-mix(in srgb, var(--map-note) 74%, var(--map-muted));
    stroke-width: 2.3;
    stroke-dasharray: none;
  }
  .local-map-module-canvas.compact-links .local-map-module-edge.secondary,
  .local-map-module-canvas.compact-links .local-map-edge-label.secondary {
    opacity: 0;
    visibility: hidden;
  }
  .local-map-module-canvas.compact-links.focused .local-map-module-edge.secondary.on,
  .local-map-module-canvas.compact-links.focused .local-map-edge-label.secondary.on {
    opacity: 1;
    visibility: visible;
  }
  .local-map-edge-label { pointer-events: none; }
  .local-map-edge-badge {
    fill: var(--map-card);
    stroke: var(--map-line);
    stroke-width: 1;
  }
  .local-map-edge-count {
    fill: var(--map-ink);
    font-family: var(--map-hand);
    font-size: 12px;
    font-weight: 700;
  }
  .local-map-note {
    fill: var(--map-note);
    font-family: "Kalam", "Comic Neue", "Segoe Print", "Bradley Hand", cursive;
    font-size: 13px;
    font-weight: 600;
  }
  .local-map-note-line {
    stroke: var(--map-note);
    stroke-width: 1.1;
    fill: none;
    opacity: .82;
  }
  .local-map-module-legend {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
    gap: 7px 22px;
    margin: 14px 2px 0;
    padding: 0;
    list-style: none;
  }
  .local-map-module-legend li {
    display: grid;
    grid-template-columns: 11px minmax(0, 1fr);
    gap: 9px;
    align-items: baseline;
    min-width: 0;
    color: var(--map-ink);
    font-size: 12px;
  }
  .local-map-module-legend i {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    background: var(--module-tint, var(--map-paper));
    box-shadow: inset 0 0 0 1.5px var(--module-stroke, var(--map-line));
    transform: translateY(1px);
  }
  .local-map-module-legend b { font-weight: 700; }
  .local-map-module-legend small {
    display: block;
    overflow: hidden;
    margin-top: 1px;
    color: var(--map-muted);
    font-family: var(--map-mono);
    font-size: 9.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .local-map-module-tooltip {
    position: fixed;
    z-index: 80;
    max-width: min(320px, calc(100vw - 24px));
    padding: 8px 11px;
    border: 0;
    border-radius: 8px;
    background: var(--map-ink);
    color: var(--map-paper);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--map-ink) 16%, transparent);
    opacity: 0;
    visibility: hidden;
    transform: translateY(2px);
    transition: opacity .1s ease, transform .1s ease, visibility .1s linear;
    pointer-events: none;
  }
  .local-map-module-tooltip.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
  .local-map-module-tooltip code {
    display: block;
    margin-bottom: 3px;
    color: inherit;
    font-size: 12px;
    font-weight: 700;
  }
  .local-map-module-tooltip p {
    margin: 0;
    color: inherit;
    font-size: 12px;
    line-height: 1.4;
  }
  .local-map-module-tooltip p + p,
  .local-map-module-tooltip small {
    display: block;
    margin-top: 3px;
  }
  .local-map-module-tooltip small {
    color: color-mix(in srgb, var(--map-paper) 72%, transparent);
    font-size: 9.5px;
    line-height: 1.35;
  }

  .local-map-filter-row {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    min-height: 46px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--map-line);
    background: var(--map-card);
  }
  .local-map-filter-state {
    min-height: 0;
    color: var(--map-muted);
    font-size: 12px;
  }
  .local-map-clear {
    border: 1px solid var(--map-line);
    border-radius: 20px;
    padding: 3px 10px;
    background: var(--map-paper);
    color: var(--map-ink);
    cursor: pointer;
    font-size: 11px;
  }
  .local-map-clear:hover,
  .local-map-clear:focus {
    border-color: var(--map-mint);
    outline: none;
  }
  .local-map-clear[hidden] { display: none; }
  .local-map-treemap {
    position: relative;
    height: 520px;
    min-height: 360px;
    background: var(--map-card);
  }
  .local-map-module-box {
    position: absolute;
    overflow: hidden;
    border: 1.5px solid var(--module-stroke, var(--map-line));
    border-radius: 8px;
    background: var(--module-tint, var(--map-paper));
    transition: opacity .15s ease;
  }
  .local-map-module-title {
    position: absolute;
    z-index: 2;
    top: 4px;
    left: 8px;
    max-width: calc(100% - 16px);
    overflow: hidden;
    color: var(--module-stroke, var(--map-ink));
    font-size: 11px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }
  .local-map-file-tile {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: hidden;
    border: 0;
    border-radius: 4px;
    padding: 3px 5px;
    background: color-mix(in srgb, var(--module-tint, var(--map-paper)) 82%, var(--map-card));
    box-shadow: inset 0 0 0 1px var(--map-card);
    color: var(--map-ink);
    cursor: pointer;
    line-height: 1.2;
    text-align: left;
  }
  .local-map-file-tile:hover,
  .local-map-file-tile:focus {
    filter: brightness(.94);
    outline: 2px solid var(--map-mint);
    outline-offset: -2px;
  }
  .local-map-file-tile span {
    display: block;
    overflow: hidden;
    padding: 0;
    font-family: var(--map-mono);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-file-tile small {
    display: block;
    padding: 1px 0 0;
    color: var(--map-muted);
    font-size: 9.5px;
  }

  .local-map-reading {
    position: relative;
    display: block;
    max-width: 780px;
    margin: 0;
    padding: 0 0 0 66px;
    list-style: none;
  }
  .local-map-reading::before {
    content: "";
    position: absolute;
    top: 14px;
    bottom: 14px;
    left: 14px;
    width: 2px;
    background:
      repeating-linear-gradient(
        to bottom,
        var(--map-note) 0 7px,
        transparent 7px 12px
      );
    opacity: .55;
  }
  .local-map-reading li {
    position: relative;
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    min-height: 58px;
    padding: 8px 0 13px;
  }
  .local-map-step {
    position: absolute;
    left: -66px;
    top: 8px;
    z-index: 1;
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border: 1.5px solid var(--map-note);
    border-radius: 50%;
    background: var(--map-paper);
    color: var(--map-note);
    font-family: var(--map-hand);
    font-size: 12px;
    font-weight: 700;
  }
  .local-map-reading li > div:last-child { grid-column: 1 / -1; }
  .local-map-reading button {
    display: block;
    width: 100%;
    border: 0;
    padding: 0;
    background: none;
    color: var(--map-ink);
    cursor: pointer;
    text-align: left;
    text-decoration: underline;
    text-decoration-color: var(--map-line);
    text-underline-offset: 4px;
    font-family: var(--map-mono);
    font-size: 13px;
  }
  .local-map-reading button:hover { text-decoration-color: var(--map-mint); }
  .local-map-reading p {
    margin: 4px 0 0;
    color: var(--map-muted);
    font-size: 12.5px;
    line-height: 1.45;
  }

  .local-map-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .local-map-scatter {
    display: block;
    width: 100%;
    min-width: 640px;
    min-height: 390px;
    background: var(--map-card);
  }
  .local-map-scatter .grid {
    stroke: color-mix(in srgb, var(--map-line) 82%, transparent);
    stroke-dasharray: 3 5;
  }
  .local-map-scatter .axis-label,
  .local-map-scatter .tick {
    fill: var(--map-muted);
    font-family: var(--map-sans);
    font-size: 10px;
  }
  .local-map-scatter .point {
    cursor: pointer;
    fill: color-mix(in srgb, var(--map-note) 30%, var(--map-card));
    stroke: var(--map-note);
    stroke-width: 1.4;
  }
  .local-map-scatter .point:hover,
  .local-map-scatter .point:focus {
    stroke-width: 3;
    outline: none;
  }

  .local-map-lookup { display: block; }
  .local-map-search-wrap {
    position: relative;
    max-width: 560px;
  }
  .local-map-shortcut {
    position: absolute;
    top: 11px;
    right: 11px;
    color: var(--map-muted);
    font-family: var(--map-mono);
    font-size: 9px;
    pointer-events: none;
  }
  .local-map-search {
    width: 100%;
    border: 1.5px solid var(--map-line);
    border-radius: 10px;
    padding: 11px 72px 11px 14px;
    background: var(--map-card);
    color: var(--map-ink);
    font: inherit;
    font-size: 14px;
  }
  .local-map-search:focus {
    border-color: var(--map-mint);
    outline: none;
    box-shadow: none;
  }
  .local-map-search::placeholder { color: var(--map-muted); }
  .local-map-results {
    position: absolute;
    z-index: 18;
    top: calc(100% + 4px);
    right: 0;
    left: 0;
    display: none;
    max-height: 320px;
    overflow: auto;
    margin: 0;
    padding: 4px;
    border: 1px solid var(--map-line);
    border-radius: 10px;
    background: var(--map-card);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--map-ink) 14%, transparent);
    list-style: none;
  }
  .local-map-results.open { display: block; }
  .local-map-results button {
    width: 100%;
    border: 0;
    border-radius: 6px;
    padding: 7px 10px;
    background: transparent;
    color: var(--map-ink);
    cursor: pointer;
    text-align: left;
  }
  .local-map-results button:hover,
  .local-map-results button[aria-selected="true"] {
    background: var(--map-paper);
  }
  .local-map-results code {
    display: block;
    overflow: hidden;
    color: var(--map-ink);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-results small {
    display: block;
    overflow: hidden;
    margin-top: 2px;
    color: var(--map-muted);
    font-size: 10.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-result-more {
    padding: 4px;
    border-top: 1px solid var(--map-line);
  }
  .local-map-result-more button {
    color: var(--map-note);
    font-size: 10.5px;
    font-weight: 700;
    text-align: center;
  }

  .local-map-card {
    min-height: 220px;
    margin-top: 16px;
    padding: 22px 24px;
  }
  .local-map-card h4 {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--map-ink);
    font-family: var(--map-mono);
    font-size: 18px;
    font-weight: 500;
    line-height: 1.35;
  }
  .local-map-card-meta {
    margin: 6px 0 0;
    color: var(--map-muted);
    font-size: 11.5px;
  }
  .local-map-source-link {
    color: var(--map-note);
    text-decoration: none;
  }
  .local-map-source-link:hover { text-decoration: underline; }
  .local-map-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .local-map-card-actions button,
  .local-map-card-actions a {
    border: 1px solid var(--map-line);
    border-radius: 20px;
    padding: 4px 10px;
    background: var(--map-paper);
    color: var(--map-note);
    cursor: pointer;
    font-size: 10.5px;
    font-weight: 700;
    text-decoration: none;
  }
  .local-map-card-actions button:hover,
  .local-map-card-actions button:focus,
  .local-map-card-actions a:hover,
  .local-map-card-actions a:focus {
    border-color: var(--map-mint);
    outline: none;
  }
  .local-map-card-desc {
    max-width: 70ch;
    margin: 15px 0 5px;
    color: var(--map-ink);
    font-size: 15px;
    line-height: 1.55;
  }
  .local-map-relations {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 14px;
  }
  .local-map-relation {
    min-width: 0;
    padding: 11px;
    border: 1px solid var(--map-line);
    border-radius: 8px;
    background: var(--map-paper);
  }
  .local-map-relation strong {
    display: block;
    margin-bottom: 6px;
    color: var(--map-muted);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .local-map-relation button {
    display: block;
    max-width: 100%;
    border: 0;
    padding: 2px 0;
    overflow: hidden;
    background: none;
    color: var(--map-note);
    cursor: pointer;
    font-family: var(--map-mono);
    font-size: 10.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-relation-more {
    margin-top: 5px;
    border-top: 1px solid var(--map-line);
    padding-top: 5px;
  }
  .local-map-relation-more summary {
    color: var(--map-muted);
    cursor: pointer;
    font-size: 10px;
    user-select: none;
  }
  .local-map-relation-more[open] summary {
    margin-bottom: 3px;
    color: var(--map-ink);
  }
  .local-map-exports {
    width: 100%;
    margin-top: 12px;
    border-collapse: collapse;
    font-size: 11px;
  }
  .local-map-exports th,
  .local-map-exports td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--map-line);
    text-align: left;
  }
  .local-map-exports th {
    color: var(--map-muted);
    font-size: 10px;
    font-weight: 700;
  }
  .local-map-symbol-heading {
    margin: 16px 0 5px;
    color: var(--map-muted);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .local-map-source-notes {
    margin-top: 12px;
    padding: 10px;
    border: 1px solid var(--map-line);
    border-radius: 8px;
    background: var(--map-paper);
  }
  .local-map-source-notes strong {
    display: block;
    margin-bottom: 6px;
    color: var(--map-muted);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .local-map-source-note {
    color: var(--map-muted);
    font-size: 10.5px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .local-map-source-note + .local-map-source-note { margin-top: 4px; }

  @media (max-width: 820px) {
    .local-code-map {
      margin-right: 0;
      margin-left: 0;
      padding-right: 0;
      padding-left: 0;
      border-radius: 0;
    }
    .local-map-hero {
      align-items: flex-start;
      flex-direction: column;
      padding-top: 32px;
    }
    .local-map-nav {
      margin-right: 0;
      margin-left: 0;
      padding-right: 0;
      padding-left: 0;
    }
    .local-map-section h3 { font-size: 25px; }
    .local-map-question { font-size: 18px; }
    .local-map-relations { grid-template-columns: 1fr; }
    .local-map-treemap { height: 620px; }
    .local-map-card { padding: 16px; }
  }
  @media (max-width: 768px) {
    .documint-local-report .sidebar {
      top: 66px;
      left: 8px;
      bottom: 8px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--bg-secondary);
    }
    .documint-local-report .main {
      padding: 24px 16px 72px;
    }
    .documint-local-report .stats-banner {
      margin-bottom: 14px;
    }
  }
  @media (max-width: 620px) {
    .local-map-hero h2 { font-size: 34px; }
    .local-map-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .local-map-overview-details,
    .local-map-onboarding { grid-template-columns: 1fr; }
    .local-map-module-legend { grid-template-columns: 1fr; }
  }
`;
const LOCAL_CODE_MAP_MARKUP = String.raw`
<section class="local-code-map" id="documint-local-code-map" data-documint-local-code-map>
  <div class="local-map-hero">
    <div>
      <div class="local-map-kicker">Local project map</div>
      <h2 id="localMapProjectTitle">Find your way through the code</h2>
      <p>Every view below is generated from the same source-analysis model: files, exports, resolved imports, descriptions, entry points, and detected build metadata.</p>
    </div>
    <span class="local-map-badge" id="localMapFacts"></span>
  </div>

  <nav class="local-map-nav" id="localMapNav" aria-label="Project map sections">
    <a href="#localMapOverviewSection">At a glance</a>
    <a href="#localMapBigSection">Big picture</a>
    <a href="#localMapRunSection" id="localMapRunNav" hidden>How to run</a>
    <a href="#localMapSizeSection">What's inside</a>
    <a href="#localMapReadSection">Start here</a>
    <a href="#localMapReachSection">Dependency reach</a>
    <a href="#localMapLookupSection">Look up a file</a>
  </nav>

  <section class="local-map-section" id="localMapOverviewSection" aria-labelledby="localMapOverviewTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapOverviewTitle">At a glance</h3>
        <p class="local-map-question">What is this project made of?</p>
      </div>
      <p class="local-map-hint">Counts, languages, entry points, and external dependencies come directly from the canonical Local analysis model.</p>
    </div>
    <div class="local-map-overview" id="localMapOverview"></div>
  </section>

  <section class="local-map-section" id="localMapBigSection" aria-labelledby="localMapBigTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapBigTitle">Big picture</h3>
        <p class="local-map-question">How do the parts fit together?</p>
      </div>
      <p class="local-map-hint">Boxes are structural modules. Arrows point from the importing module to the module it imports; numbered badges show repeated cross-module imports. Click a module to filter the size map.</p>
    </div>
    <div class="local-map-graph-toolbar" aria-label="Big picture controls">
      <div class="local-map-graph-toolbar-group" role="group" aria-label="Connection visibility">
        <span class="local-map-graph-toolbar-label">Links</span>
        <button id="localMapMajorLinks" type="button" aria-pressed="false">Major</button>
        <button id="localMapAllLinks" type="button" aria-pressed="true">All</button>
      </div>
      <div class="local-map-graph-toolbar-group" role="group" aria-label="Diagram zoom">
        <button id="localMapZoomOut" type="button" aria-label="Zoom out">−</button>
        <span class="local-map-zoom-value" id="localMapZoomValue" aria-live="polite">100%</span>
        <button id="localMapZoomIn" type="button" aria-label="Zoom in">+</button>
        <button id="localMapZoomFit" type="button">Fit</button>
      </div>
      <span class="local-map-graph-help">Wheel to zoom · drag empty space to pan</span>
    </div>
    <div class="local-map-graph-insights" id="localMapGraphInsights" aria-label="Big picture facts"></div>
    <div class="local-map-panel local-map-graph-panel">
      <svg class="local-map-module-canvas" id="localMapModules" viewBox="0 0 960 360" role="img" aria-label="Project modules and resolved imports between them"></svg>
    </div>
    <ul class="local-map-module-legend" id="localMapModuleLegend" aria-label="Project module legend"></ul>
    <div class="local-map-module-tooltip" id="localMapModuleTooltip" role="tooltip" aria-hidden="true"></div>
  </section>

  <section class="local-map-section" id="localMapRunSection" aria-labelledby="localMapRunTitle" hidden>
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapRunTitle">How to run</h3>
        <p class="local-map-question">How do I build, test, or start this project?</p>
      </div>
      <p class="local-map-hint">Only detected package, Makefile, Dockerfile, VS Code, and source environment-reference facts are shown. Referenced environment variables are not claimed to be required.</p>
    </div>
    <div class="local-map-onboarding" id="localMapOnboarding"></div>
  </section>

  <section class="local-map-section" id="localMapSizeSection" aria-labelledby="localMapSizeTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapSizeTitle">What's inside</h3>
        <p class="local-map-question">Where does the code live, and which files are large?</p>
      </div>
      <p class="local-map-hint">Area is proportional to source lines. Click a file to inspect it.</p>
    </div>
    <div class="local-map-panel">
      <div class="local-map-filter-row">
        <span class="local-map-filter-state" id="localMapFilterState" role="status" aria-live="polite">Showing all modules</span>
        <button class="local-map-clear" id="localMapClearFilter" type="button" hidden>Show all</button>
      </div>
      <div class="local-map-treemap" id="localMapTreemap"></div>
    </div>
  </section>

  <section class="local-map-section" id="localMapReadSection" aria-labelledby="localMapReadTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapReadTitle">Start here</h3>
        <p class="local-map-question">I'm new. What should I read first?</p>
      </div>
      <p class="local-map-hint">Suggested from detected entry points and dependency reach. It is a reading aid, not a claim about the only correct order.</p>
    </div>
    <ol class="local-map-reading" id="localMapReading"></ol>
  </section>

  <section class="local-map-section" id="localMapReachSection" aria-labelledby="localMapReachTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapReachTitle">Dependency reach</h3>
        <p class="local-map-question">Which files are used by the most project files?</p>
      </div>
      <p class="local-map-hint">Horizontal position is source length on a logarithmic scale. Vertical position is incoming project dependents.</p>
    </div>
    <div class="local-map-panel local-map-scroll">
      <svg class="local-map-scatter" id="localMapScatter" viewBox="0 0 960 390" role="img" aria-label="File size versus incoming project dependents"></svg>
    </div>
  </section>

  <section class="local-map-section" id="localMapLookupSection" aria-labelledby="localMapLookupTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapLookupTitle">Look up a file</h3>
        <p class="local-map-question">What does this file do, and who uses it?</p>
      </div>
      <p class="local-map-hint">Search matches file paths, trusted descriptions, exported/internal symbols, referenced environment variables, and TODO/FIXME/HACK source notes.</p>
    </div>
    <div class="local-map-lookup">
      <div class="local-map-search-wrap">
        <label class="sr-only" for="localMapSearch">Search project files, descriptions, symbols, environment references, and source notes</label>
        <input class="local-map-search" id="localMapSearch" type="search" autocomplete="off" placeholder="Search files, symbols, env refs, notes…" role="combobox" aria-expanded="false" aria-controls="localMapResults" aria-autocomplete="list">
        <span class="local-map-shortcut" aria-hidden="true">Ctrl/⌘ K</span>
        <ul class="local-map-results" id="localMapResults" role="listbox" aria-label="Project file search results"></ul>
      </div>
      <article class="local-map-card" id="localMapCard" aria-live="polite"></article>
    </div>
  </section>
</section>

<script type="application/json" id="documintLocalCodeMapData"></script>
`;

function buildLocalCodeMapScript(
  data: LocalCodeMapData,
  nonceAttribute: string,
): string {
  const json = JSON.stringify(data)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return String.raw`
<script${nonceAttribute}>
(function () {
  'use strict';
  var root = document.querySelector('[data-documint-local-code-map]');
  var dataNode = document.getElementById('documintLocalCodeMapData');
  if (!root || !dataNode) return;

  dataNode.textContent = ${JSON.stringify(json)};
  var data;
  try { data = JSON.parse(dataNode.textContent || '{}'); } catch (_) { return; }
  if (!data || !Array.isArray(data.files) || !data.files.length) return;

  var byPath = new Map(data.files.map(function (file) { return [file.path, file]; }));
  var moduleFilter = null;
  var currentPath = (data.readingPath && data.readingPath[0] && data.readingPath[0].path) || data.files[0].path;
  var searchHits = [];
  var searchIndex = -1;
  var searchExpanded = false;

  function makeSvg(tag, attrs, parent) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, String(attrs[key])); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function encodeSourcePathSegment(segment) {
    return encodeURIComponent(segment).replace(
      /[!'()*]/g,
      function (character) {
        return '%' + character.charCodeAt(0).toString(16).toUpperCase();
      }
    );
  }

  function relativeSourceHref(path, line) {
    var encoded = String(path || '')
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean)
      .map(encodeSourcePathSegment)
      .join('/');
    return '../' + encoded + (line ? '#L' + line : '');
  }

  function fileName(path) {
    var parts = String(path || '').split('/');
    return parts[parts.length - 1] || path;
  }

  function formatNumber(value) {
    try { return Number(value).toLocaleString(); } catch (_) { return String(value); }
  }

  function openFile(path) {
    if (!byPath.has(path)) return;
    currentPath = path;
    renderCard();
  }

  function openFileAndReveal(path) {
    openFile(path);
    var card = document.getElementById('localMapCard');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function revealFullDocumentation(path) {
    var targets = Array.from(document.querySelectorAll('[data-documint-file-path]'));
    var target = targets.find(function (element) {
      return /^H[1-6]$/.test(element.tagName) &&
        element.getAttribute('data-documint-file-path') === path;
    });
    if (!target) return;
    if (target.id) {
      try { history.replaceState(null, '', '#' + target.id); } catch (_) {}
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setModuleFilter(name) {
    moduleFilter = name || null;
    renderTreemap();
    var state = document.getElementById('localMapFilterState');
    var clear = document.getElementById('localMapClearFilter');
    if (state) state.textContent = moduleFilter ? 'Showing ' + moduleFilter : 'Showing all modules';
    if (clear) clear.hidden = !moduleFilter;
  }

  function renderOverview() {
    var root = document.getElementById('localMapOverview');
    if (!root) return;
    root.innerHTML = '';

    var summary = data.summary || {};
    var stats = document.createElement('div');
    stats.className = 'local-map-stats';

    [
      ['Files', summary.files],
      ['Lines', summary.lines],
      ['Described', summary.describedFiles],
      ['Undocumented', summary.undocumentedFiles],
      ['Symbols', summary.symbols],
      ['Exports', summary.exports],
      ['Internal links', summary.internalDependencies],
      ['External deps', summary.externalDependencies],
      ['TODO/FIXME/HACK', summary.todos]
    ].forEach(function (item) {
      if (item[1] === undefined || item[1] === null) return;
      var box = document.createElement('div');
      box.className = 'local-map-stat';
      var value = document.createElement('strong');
      value.textContent = formatNumber(item[1]);
      box.appendChild(value);
      var label = document.createElement('span');
      label.textContent = item[0];
      box.appendChild(label);
      stats.appendChild(box);
    });
    root.appendChild(stats);

    var details = document.createElement('div');
    details.className = 'local-map-overview-details';

    var languages = Array.isArray(summary.languages) ? summary.languages : [];
    if (languages.length) {
      var languageCard = document.createElement('section');
      languageCard.className = 'local-map-overview-card';
      var languageTitle = document.createElement('h4');
      languageTitle.textContent = 'Languages';
      languageCard.appendChild(languageTitle);
      var languageList = document.createElement('div');
      languageList.className = 'local-map-overview-list';
      languages.forEach(function (language) {
        var code = document.createElement('code');
        code.textContent =
          language.name +
          ' · ' +
          language.files +
          ' file' +
          (language.files === 1 ? '' : 's') +
          ' · ' +
          formatNumber(language.lines) +
          ' lines';
        languageList.appendChild(code);
      });
      languageCard.appendChild(languageList);
      details.appendChild(languageCard);
    }

    var entryPoints = Array.isArray(summary.entryPoints)
      ? summary.entryPoints
      : [];
    if (entryPoints.length) {
      var entryCard = document.createElement('section');
      entryCard.className = 'local-map-overview-card';
      var entryTitle = document.createElement('h4');
      entryTitle.textContent = 'Detected entry points';
      entryCard.appendChild(entryTitle);
      var entryList = document.createElement('div');
      entryList.className = 'local-map-overview-list';
      entryPoints.forEach(function (path) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = path;
        button.title = path;
        button.addEventListener('click', function () {
          openFileAndReveal(path);
        });
        entryList.appendChild(button);
      });
      entryCard.appendChild(entryList);
      details.appendChild(entryCard);
    }

    var external = Array.isArray(summary.externalDependencyNames)
      ? summary.externalDependencyNames
      : [];
    if (external.length) {
      var dependencyCard = document.createElement('section');
      dependencyCard.className = 'local-map-overview-card';
      var dependencyTitle = document.createElement('h4');
      dependencyTitle.textContent = 'External dependencies';
      dependencyCard.appendChild(dependencyTitle);
      var dependencyList = document.createElement('div');
      dependencyList.className = 'local-map-overview-list';
      external.forEach(function (name) {
        var code = document.createElement('code');
        code.textContent = name;
        dependencyList.appendChild(code);
      });
      dependencyCard.appendChild(dependencyList);
      details.appendChild(dependencyCard);
    }

    var undocumentedFiles = data.files.filter(function (file) {
      return !file.description;
    });
    if (undocumentedFiles.length) {
      var coverageCard = document.createElement('section');
      coverageCard.className = 'local-map-overview-card';
      var coverageTitle = document.createElement('h4');
      coverageTitle.textContent = 'Documentation coverage';
      coverageCard.appendChild(coverageTitle);

      var coverageNote = document.createElement('p');
      coverageNote.textContent =
        undocumentedFiles.length +
        ' file' +
        (undocumentedFiles.length === 1 ? '' : 's') +
        ' without a trusted module-level description.';
      coverageCard.appendChild(coverageNote);

      function appendUndocumentedButtons(container, files) {
        files.forEach(function (file) {
          var button = document.createElement('button');
          button.type = 'button';
          button.textContent = file.path;
          button.title = file.path;
          button.addEventListener('click', function () {
            openFileAndReveal(file.path);
          });
          container.appendChild(button);
        });
      }

      var coverageList = document.createElement('div');
      coverageList.className = 'local-map-overview-list';
      appendUndocumentedButtons(coverageList, undocumentedFiles.slice(0, 8));
      coverageCard.appendChild(coverageList);

      if (undocumentedFiles.length > 8) {
        var coverageMore = document.createElement('details');
        coverageMore.className = 'local-map-overview-more';
        var coverageSummary = document.createElement('summary');
        coverageSummary.textContent =
          'Show ' + (undocumentedFiles.length - 8) + ' more';
        coverageMore.appendChild(coverageSummary);
        var remainingList = document.createElement('div');
        remainingList.className = 'local-map-overview-list';
        appendUndocumentedButtons(remainingList, undocumentedFiles.slice(8));
        coverageMore.appendChild(remainingList);
        coverageCard.appendChild(coverageMore);
      }

      details.appendChild(coverageCard);
    }

    if (details.childNodes.length) {
      root.appendChild(details);
    }
  }

  function renderFacts() {
    var projectTitle = document.getElementById('localMapProjectTitle');
    if (projectTitle && data.projectName) {
      projectTitle.textContent = data.projectName;
    }

    var facts = document.getElementById('localMapFacts');
    if (facts) {
      var summary = data.summary || {};
      var files = summary.files === undefined ? data.files.length : summary.files;
      var lines = summary.lines === undefined
        ? data.files.reduce(function (sum, file) {
            return sum + Number(file.lines || 0);
          }, 0)
        : summary.lines;
      var described = summary.describedFiles === undefined
        ? data.files.filter(function (file) {
            return Boolean(file.description);
          }).length
        : summary.describedFiles;
      facts.textContent =
        formatNumber(files) +
        ' files · ' +
        formatNumber(lines) +
        ' lines · ' +
        formatNumber(described) +
        ' described';
    }

  }

  function formatDefaultValue(value) {
    if (value === undefined) return 'No default declared';
    try {
      var json = JSON.stringify(value);
      return json === undefined ? String(value) : json;
    } catch (_) {
      return String(value);
    }
  }

  function createFactCard(container, title, source) {
    var card = document.createElement('section');
    card.className = 'local-map-fact-card';

    var heading = document.createElement('h4');
    heading.textContent = title;
    card.appendChild(heading);

    if (source) {
      var sourceLine = document.createElement('p');
      sourceLine.className = 'local-map-fact-source';
      sourceLine.textContent = 'Detected from ' + source;
      card.appendChild(sourceLine);
    }

    container.appendChild(card);
    return card;
  }

  function appendFactRow(card, label, value, asCode) {
    if (value === undefined || value === null || value === '') return;

    var row = document.createElement('div');
    row.className = 'local-map-fact-row';

    var labelNode = document.createElement('span');
    labelNode.className = 'local-map-fact-label';
    labelNode.textContent = label;
    row.appendChild(labelNode);

    var valueNode = document.createElement(asCode ? 'code' : 'span');
    valueNode.className = 'local-map-fact-value';
    valueNode.textContent = String(value);
    row.appendChild(valueNode);

    card.appendChild(row);
  }

  function appendCommandRow(card, primary, secondary) {
    var row = document.createElement('div');
    row.className = 'local-map-command-row';

    var code = document.createElement('code');
    code.textContent = String(primary);
    row.appendChild(code);

    if (secondary) {
      var detail = document.createElement('small');
      detail.textContent = String(secondary);
      row.appendChild(detail);
    }

    card.appendChild(row);
  }

  function renderOnboarding() {
    var section = document.getElementById('localMapRunSection');
    var container = document.getElementById('localMapOnboarding');
    if (!section || !container) return;

    container.innerHTML = '';
    var facts = data.gettingStarted || null;
    var environments = Array.isArray(data.referencedEnvironmentVariables)
      ? data.referencedEnvironmentVariables
      : [];
    var cards = 0;

    if (facts) {
      var scripts = Array.isArray(facts.scripts) ? facts.scripts : [];
      if (
        facts.packageJsonPath ||
        facts.packageManager ||
        facts.extensionEntry ||
        scripts.length
      ) {
        var packageCard = createFactCard(
          container,
          'Package / extension',
          facts.packageJsonPath || ''
        );
        cards++;
        appendFactRow(packageCard, 'Package manager', facts.packageManager, true);
        appendFactRow(packageCard, 'Extension entry', facts.extensionEntry, true);
        scripts.forEach(function (script) {
          appendCommandRow(
            packageCard,
            script.run,
            script.name + ' · ' + script.command
          );
        });
      }

      if (facts.makefile) {
        var makeCard = createFactCard(
          container,
          'Makefile',
          facts.makefile.path
        );
        cards++;
        var targets = Array.isArray(facts.makefile.targets)
          ? facts.makefile.targets
          : [];
        if (!targets.length) {
          appendFactRow(makeCard, 'Targets', 'No concrete targets detected', false);
        } else {
          targets.forEach(function (target) {
            appendCommandRow(makeCard, 'make ' + target.name, target.name);
          });
        }
      }

      if (facts.dockerfile) {
        var docker = facts.dockerfile;
        var dockerCard = createFactCard(container, 'Dockerfile', docker.path);
        cards++;
        appendFactRow(
          dockerCard,
          'Base images',
          (docker.baseImages || []).join(', '),
          true
        );
        appendFactRow(
          dockerCard,
          'Stages',
          (docker.stages || []).join(', '),
          true
        );
        appendFactRow(
          dockerCard,
          'Exposed ports',
          (docker.exposedPorts || []).join(', '),
          true
        );
        appendFactRow(dockerCard, 'ENTRYPOINT', docker.entrypoint, true);
        appendFactRow(dockerCard, 'CMD', docker.command, true);
      }

      var commands = Array.isArray(facts.vscodeCommands)
        ? facts.vscodeCommands
        : [];
      if (commands.length) {
        var commandCard = createFactCard(
          container,
          'VS Code commands',
          facts.packageJsonPath || 'package metadata'
        );
        cards++;
        commands.forEach(function (command) {
          appendCommandRow(commandCard, command.id, command.title);
        });
      }

      var settings = Array.isArray(facts.vscodeSettings)
        ? facts.vscodeSettings
        : [];
      if (settings.length) {
        var settingsCard = createFactCard(
          container,
          'VS Code settings',
          facts.packageJsonPath || 'package metadata'
        );
        cards++;
        settings.forEach(function (setting) {
          appendCommandRow(
            settingsCard,
            setting.key,
            'default: ' + formatDefaultValue(setting.defaultValue)
          );
        });
      }
    }

    if (environments.length) {
      var environmentCard = createFactCard(
        container,
        'Referenced environment variables',
        'source references'
      );
      cards++;

      var note = document.createElement('p');
      note.className = 'local-map-fact-source';
      note.textContent =
        'Referenced in source; static analysis does not claim these are required in every run.';
      environmentCard.appendChild(note);

      var chips = document.createElement('div');
      chips.className = 'local-map-chip-list';
      environments.forEach(function (name) {
        var code = document.createElement('code');
        code.textContent = name;
        chips.appendChild(code);
      });
      environmentCard.appendChild(chips);
    }

    section.hidden = cards === 0;
    var runNav = document.getElementById('localMapRunNav');
    if (runNav) runNav.hidden = cards === 0;
  }

  function initSectionNav() {
    var nav = document.getElementById('localMapNav');
    if (!nav) return;

    var links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    var hashNavigationPending = false;
    var sections = links.map(function (link) {
      var id = link.getAttribute('href').slice(1);
      return document.getElementById(id);
    }).filter(Boolean);

    function setActive(id) {
      links.forEach(function (link) {
        var active = link.getAttribute('href') === '#' + id && !link.hidden;
        link.classList.toggle('active', active);
        if (active) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    links.forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (link.hidden) return;
        var id = link.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (!target || target.hidden) return;
        event.preventDefault();
        hashNavigationPending = true;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { history.replaceState(null, '', '#' + id); } catch (_) {}
        setActive(id);
        window.setTimeout(function () {
          hashNavigationPending = false;
          setActive(id);
        }, 260);
      });
    });

    function resolveHashSection() {
      var raw = String(window.location.hash || '').replace(/^#/, '');
      if (!raw) return null;

      var id;
      try { id = decodeURIComponent(raw); } catch (_) { id = raw; }

      var link = links.find(function (candidate) {
        return candidate.getAttribute('href') === '#' + id;
      });
      var target = link ? document.getElementById(id) : null;
      if (!link || link.hidden || !target || target.hidden) return null;
      return { id: id, link: link, target: target };
    }

    function restoreHashSection(shouldScroll) {
      var resolved = resolveHashSection();
      if (!resolved) return false;
      hashNavigationPending = true;
      setActive(resolved.id);
      if (shouldScroll) {
        requestAnimationFrame(function () {
          resolved.target.scrollIntoView({ behavior: 'auto', block: 'start' });
          requestAnimationFrame(function () {
            setActive(resolved.id);
            hashNavigationPending = false;
          });
        });
      } else {
        hashNavigationPending = false;
      }
      return true;
    }

    var firstVisible = links.find(function (link) { return !link.hidden; });
    if (!restoreHashSection(true) && firstVisible) {
      setActive(firstVisible.getAttribute('href').slice(1));
    }

    window.addEventListener('hashchange', function () {
      restoreHashSection(true);
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (hashNavigationPending) return;
        var visible = entries
          .filter(function (entry) {
            return entry.isIntersecting && !entry.target.hidden;
          })
          .sort(function (a, b) {
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });
        if (visible.length) setActive(visible[0].target.id);
      }, {
        rootMargin: '-15% 0px -70% 0px',
        threshold: [0, 0.01]
      });
      sections.forEach(function (section) { observer.observe(section); });
    }
  }

  function layoutModules(modules, edges, minimumWidth) {
    var names = new Set(modules.map(function (module) { return module.name; }));
    var outgoing = new Map();
    var incoming = new Map();
    var incomingCount = new Map();

    modules.forEach(function (module) {
      outgoing.set(module.name, []);
      incoming.set(module.name, []);
      incomingCount.set(module.name, 0);
    });

    edges.forEach(function (edge) {
      if (!names.has(edge.from) || !names.has(edge.to) || edge.from === edge.to) return;
      outgoing.get(edge.from).push({ name: edge.to, weight: Math.max(1, edge.count || 1) });
      incoming.get(edge.to).push({ name: edge.from, weight: Math.max(1, edge.count || 1) });
      incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
    });

    var entryRoots = Array.from(new Set(
      data.files
        .filter(function (file) { return file.entryPoint; })
        .map(function (file) { return file.module; })
        .filter(function (name) { return names.has(name); })
    ));
    var roots = entryRoots.slice();

    if (!roots.length) {
      roots = modules
        .filter(function (module) { return (incomingCount.get(module.name) || 0) === 0; })
        .map(function (module) { return module.name; });
    }
    if (!roots.length && modules.length) roots = [modules[0].name];

    var levels = new Map();
    var queue = roots.map(function (name) { return { name: name, level: 0 }; });
    while (queue.length) {
      var current = queue.shift();
      var knownLevel = levels.get(current.name);
      if (knownLevel !== undefined && knownLevel <= current.level) continue;
      levels.set(current.name, current.level);

      (outgoing.get(current.name) || []).forEach(function (next) {
        var nextLevel = current.level + 1;
        var existing = levels.get(next.name);
        if (existing === undefined || nextLevel < existing) {
          queue.push({ name: next.name, level: nextLevel });
        }
      });
    }

    var reachableMaxLevel = Math.max.apply(
      null,
      Array.from(levels.values()).concat([0])
    );
    var disconnectedLevel = null;
    var disconnected = modules.filter(function (module) {
      return !levels.has(module.name);
    });
    if (disconnected.length) {
      disconnectedLevel = reachableMaxLevel + 1;
      disconnected.forEach(function (module) {
        levels.set(module.name, disconnectedLevel);
      });
    }

    var maxLevel = Math.max.apply(null, Array.from(levels.values()).concat([0]));
    var groups = new Map();
    modules.forEach(function (module) {
      var level = levels.get(module.name) || 0;
      var group = groups.get(level) || [];
      group.push(module);
      groups.set(level, group);
    });

    function stableModuleSort(a, b) {
      return b.files - a.files ||
        b.lines - a.lines ||
        a.name.localeCompare(b.name);
    }
    groups.forEach(function (group) { group.sort(stableModuleSort); });

    function orderIndex(level) {
      var index = new Map();
      (groups.get(level) || []).forEach(function (module, position) {
        index.set(module.name, position);
      });
      return index;
    }

    function barycenter(moduleName, neighborLevel) {
      var neighborOrder = orderIndex(neighborLevel);
      var weighted = [];
      (incoming.get(moduleName) || []).concat(outgoing.get(moduleName) || [])
        .forEach(function (neighbor) {
          if ((levels.get(neighbor.name) || 0) !== neighborLevel) return;
          var position = neighborOrder.get(neighbor.name);
          if (position === undefined) return;
          weighted.push({
            position: position,
            weight: Math.max(1, neighbor.weight || 1)
          });
        });

      if (!weighted.length) return null;
      var totalWeight = weighted.reduce(function (sum, item) {
        return sum + item.weight;
      }, 0);
      return weighted.reduce(function (sum, item) {
        return sum + item.position * item.weight;
      }, 0) / totalWeight;
    }

    function reorderLevel(level, neighborLevel) {
      var group = groups.get(level);
      if (!group || group.length < 2 || !groups.has(neighborLevel)) return;
      group.sort(function (a, b) {
        var aCenter = barycenter(a.name, neighborLevel);
        var bCenter = barycenter(b.name, neighborLevel);
        if (aCenter === null && bCenter === null) return stableModuleSort(a, b);
        if (aCenter === null) return 1;
        if (bCenter === null) return -1;
        return aCenter - bCenter || stableModuleSort(a, b);
      });
    }

    for (var sweep = 0; sweep < 3; sweep++) {
      for (var forwardLevel = 1; forwardLevel <= maxLevel; forwardLevel++) {
        reorderLevel(forwardLevel, forwardLevel - 1);
      }
      for (var backwardLevel = maxLevel - 1; backwardLevel >= 0; backwardLevel--) {
        reorderLevel(backwardLevel, backwardLevel + 1);
      }
    }

    var nodeWidth = 184;
    var columnSpacing = 228;
    var sidePadding = 116;
    var width = Math.max(
      minimumWidth || 960,
      sidePadding * 2 + Math.max(0, maxLevel) * columnSpacing
    );
    var rowSpacing = 112;
    var topPadding = 96;
    var bottomPadding = 76;
    var maxRows = Math.max.apply(
      null,
      Array.from(groups.values()).map(function (group) { return group.length; }).concat([1])
    );
    var height = Math.max(
      420,
      topPadding + bottomPadding + Math.max(0, maxRows - 1) * rowSpacing
    );
    var positions = new Map();
    var columns = [];

    groups.forEach(function (group, level) {
      var x = maxLevel === 0
        ? width / 2
        : sidePadding + level * ((width - sidePadding * 2) / maxLevel);
      var groupSpan = Math.max(0, group.length - 1) * rowSpacing;
      var startY = Math.max(topPadding, (height - groupSpan) / 2);

      group.forEach(function (module, index) {
        positions.set(module.name, {
          x: x,
          y: startY + index * rowSpacing,
          level: level
        });
      });

      columns.push({
        level: level,
        x: x,
        disconnected: disconnectedLevel !== null && level === disconnectedLevel
      });
    });

    columns.sort(function (a, b) { return a.level - b.level; });

    return {
      positions: positions,
      height: height,
      width: width,
      columns: columns,
      maxLevel: maxLevel,
      hasEntryRoots: entryRoots.length > 0,
      nodeWidth: nodeWidth
    };
  }

  function clipModuleEdge(from, to) {
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var length = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / length;
    var uy = dy / length;
    var halfW = 96;
    var halfH = 41;
    var tx = Math.abs(ux) > 0.0001 ? halfW / Math.abs(ux) : Infinity;
    var ty = Math.abs(uy) > 0.0001 ? halfH / Math.abs(uy) : Infinity;
    var distance = Math.min(tx, ty);
    return {
      x: from.x + ux * distance,
      y: from.y + uy * distance
    };
  }

  function buildOpenArrowPath(start, end, control, arrowLength) {
    var length = arrowLength || 11;
    var angle;
    var shaft;
    if (control) {
      shaft =
        'M ' + start.x + ' ' + start.y +
        ' Q ' + control.x + ' ' + control.y +
        ' ' + end.x + ' ' + end.y;
      angle = Math.atan2(end.y - control.y, end.x - control.x);
    } else {
      shaft =
        'M ' + start.x + ' ' + start.y +
        ' L ' + end.x + ' ' + end.y;
      angle = Math.atan2(end.y - start.y, end.x - start.x);
    }

    var reverse = angle + Math.PI;
    var spread = 0.42;
    var left = {
      x: end.x + Math.cos(reverse + spread) * length,
      y: end.y + Math.sin(reverse + spread) * length
    };
    var right = {
      x: end.x + Math.cos(reverse - spread) * length,
      y: end.y + Math.sin(reverse - spread) * length
    };

    return (
      shaft +
      ' M ' + left.x + ' ' + left.y +
      ' L ' + end.x + ' ' + end.y +
      ' L ' + right.x + ' ' + right.y
    );
  }

  function quadraticMidpoint(start, control, end) {
    return {
      x: start.x * 0.25 + control.x * 0.5 + end.x * 0.25,
      y: start.y * 0.25 + control.y * 0.5 + end.y * 0.25
    };
  }

  function positionModuleTooltip(clientX, clientY) {
    var tooltip = document.getElementById('localMapModuleTooltip');
    if (!tooltip || !tooltip.classList.contains('show')) return;

    var margin = 12;
    var gap = 14;
    var width = tooltip.offsetWidth;
    var height = tooltip.offsetHeight;
    var left = Math.max(
      margin,
      Math.min(window.innerWidth - width - margin, clientX + gap)
    );
    var below = clientY + 16;
    var top = below + height <= window.innerHeight - margin
      ? below
      : Math.max(margin, clientY - height - 12);

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function showModuleTooltip(module, primaryFiles, clientX, clientY) {
    var tooltip = document.getElementById('localMapModuleTooltip');
    if (!tooltip) return;
    tooltip.innerHTML = '';

    var heading = document.createElement('code');
    heading.textContent = module.name;
    tooltip.appendChild(heading);

    if (module.description) {
      var description = document.createElement('p');
      description.textContent = module.description;
      tooltip.appendChild(description);
    }

    if (module.descriptionSource) {
      var source = document.createElement('small');
      source.textContent = 'Description source: ' + module.descriptionSource;
      tooltip.appendChild(source);
    }

    if (primaryFiles.length) {
      var start = document.createElement('p');
      start.textContent = 'Suggested start: ' + primaryFiles.join(', ');
      tooltip.appendChild(start);
    }

    tooltip.classList.add('show');
    tooltip.setAttribute('aria-hidden', 'false');
    positionModuleTooltip(clientX, clientY);
  }

  function showModuleTooltipForNode(module, primaryFiles, node) {
    var rect = node.getBoundingClientRect();
    showModuleTooltip(
      module,
      primaryFiles,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
  }

  function hideModuleTooltip() {
    var tooltip = document.getElementById('localMapModuleTooltip');
    if (!tooltip) return;
    tooltip.classList.remove('show');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function applyModulePalette(node, index) {
    if (!node || !node.style) return;
    var paletteIndex = Math.abs(index || 0) % 7;
    node.style.setProperty('--module-stroke', 'var(--map-s' + paletteIndex + ')');
    node.style.setProperty('--module-tint', 'var(--map-t' + paletteIndex + ')');
  }

  function renderModuleLegend() {
    var legend = document.getElementById('localMapModuleLegend');
    if (!legend) return;
    legend.innerHTML = '';

    (data.modules || []).forEach(function (module, index) {
      var item = document.createElement('li');
      applyModulePalette(item, index);

      var swatch = document.createElement('i');
      swatch.setAttribute('aria-hidden', 'true');
      item.appendChild(swatch);

      var body = document.createElement('div');
      var name = document.createElement('b');
      name.textContent = module.name;
      body.appendChild(name);

      var detail = document.createElement('small');
      detail.textContent =
        module.files + ' files · ' +
        formatNumber(module.lines) + ' lines' +
        (module.description ? ' · ' + module.description : '');
      body.appendChild(detail);
      item.appendChild(body);
      legend.appendChild(item);
    });
  }

  function renderModules() {
    var svg = document.getElementById('localMapModules');
    if (!svg) return;
    svg.innerHTML = '';

    var modules = data.modules || [];
    if (!modules.length) return;
    var edgeCounts = data.edges || [];
    var layout = layoutModules(modules, edgeCounts, 960);
    var width = layout.width;
    var height = layout.height;
    var positions = layout.positions;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

    var defs = makeSvg('defs', {}, svg);
    var sketchFilter = makeSvg('filter', {
      id: 'localMapSketch',
      x: '-8%',
      y: '-12%',
      width: '116%',
      height: '124%'
    }, defs);
    makeSvg('feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: '0.018',
      numOctaves: 1,
      seed: 11,
      result: 'noise'
    }, sketchFilter);
    makeSvg('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'noise',
      scale: 1.15,
      xChannelSelector: 'R',
      yChannelSelector: 'G'
    }, sketchFilter);

    (layout.columns || []).forEach(function (column) {
      makeSvg('line', {
        x1: column.x,
        x2: column.x,
        y1: 48,
        y2: height - 34,
        class: 'local-map-layer-guide'
      }, svg);

      var layerLabel = makeSvg('text', {
        x: column.x,
        y: 28,
        class: 'local-map-layer-label',
        'text-anchor': 'middle'
      }, svg);
      layerLabel.textContent = column.disconnected
        ? 'other modules'
        : column.level === 0
          ? (layout.hasEntryRoots ? 'entry layer' : 'root layer')
          : 'dependency layer ' + column.level;
    });

    edgeCounts.forEach(function (edge) {
      var a = positions.get(edge.from), b = positions.get(edge.to);
      if (!a || !b) return;

      var start = clipModuleEdge(a, b);
      var end = clipModuleEdge(b, a);
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / distance;
      var ny = dx / distance;
      var reciprocal = edgeCounts.some(function (candidate) {
        return candidate.from === edge.to && candidate.to === edge.from;
      });
      var reciprocalOffset = reciprocal
        ? (edge.from.localeCompare(edge.to) < 0 ? 8 : -8)
        : 0;
      var levelSpan = Math.abs((a.level || 0) - (b.level || 0));
      var control = null;

      if (levelSpan === 0) {
        var sameLevelDirection = edge.from.localeCompare(edge.to) < 0 ? -1 : 1;
        var sameLevelOffset = 118 * sameLevelDirection;
        control = {
          x: a.x + sameLevelOffset,
          y: (a.y + b.y) / 2
        };
        start = clipModuleEdge(a, control);
        end = clipModuleEdge(b, control);
      } else if (levelSpan > 1 && !reciprocal) {
        var curveDirection = edge.from.localeCompare(edge.to) < 0 ? -1 : 1;
        var curveOffset = Math.min(44, 18 + levelSpan * 7) * curveDirection;
        control = {
          x: (a.x + b.x) / 2 + nx * curveOffset,
          y: (a.y + b.y) / 2 + ny * curveOffset
        };
        start = clipModuleEdge(a, control);
        end = clipModuleEdge(b, control);
      }

      if (reciprocalOffset) {
        start.x += nx * reciprocalOffset;
        start.y += ny * reciprocalOffset;
        end.x += nx * reciprocalOffset;
        end.y += ny * reciprocalOffset;
      }

      var strengthClass =
        edge.count >= 5 ? ' strong' : edge.count >= 2 ? ' mid' : '';
      var path = makeSvg('path', {
        d: buildOpenArrowPath(start, end, control, edge.count >= 5 ? 12 : 10.5),
        class: 'local-map-module-edge' + strengthClass,
        filter: 'url(#localMapSketch)',
        'data-from': edge.from,
        'data-to': edge.to
      }, svg);
      var edgeTitle = makeSvg('title', {}, path);
      edgeTitle.textContent =
        edge.from + ' imports from ' + edge.to + ' · ' + edge.count +
        (edge.count === 1 ? ' cross-module import' : ' cross-module imports');

      if (edge.count >= 2) {
        var midpoint = control
          ? quadraticMidpoint(start, control, end)
          : {
              x: (start.x + end.x) / 2,
              y: (start.y + end.y) / 2
            };
        var label = makeSvg('g', {
          class: 'local-map-edge-label',
          'data-from': edge.from,
          'data-to': edge.to
        }, svg);
        makeSvg('circle', {
          cx: midpoint.x,
          cy: midpoint.y,
          r: edge.count >= 10 ? 12 : 10.5,
          class: 'local-map-edge-badge'
        }, label);
        var count = makeSvg('text', {
          x: midpoint.x,
          y: midpoint.y + 0.5,
          class: 'local-map-edge-count',
          'text-anchor': 'middle',
          'dominant-baseline': 'middle'
        }, label);
        count.textContent = String(edge.count);
      }
    });

    var entryModules = Array.from(new Set(
      data.files
        .filter(function (file) { return file.entryPoint; })
        .map(function (file) { return file.module; })
    ));
    var connectivity = new Map();
    modules.forEach(function (module) { connectivity.set(module.name, 0); });
    edgeCounts.forEach(function (edge) {
      connectivity.set(edge.from, (connectivity.get(edge.from) || 0) + edge.count);
      connectivity.set(edge.to, (connectivity.get(edge.to) || 0) + edge.count);
    });
    var mostConnected = modules.slice().sort(function (a, b) {
      return (connectivity.get(b.name) || 0) - (connectivity.get(a.name) || 0) ||
        a.name.localeCompare(b.name);
    })[0];
    var largestModule = modules.slice().sort(function (a, b) {
      return b.lines - a.lines || a.name.localeCompare(b.name);
    })[0];

    modules.forEach(function (module) {
      var pos = positions.get(module.name);
      var primaryFiles = Array.isArray(module.primaryFilePaths)
        ? module.primaryFilePaths
        : [];
      var startFile = primaryFiles[0] || '';
      var moduleAria =
        module.name +
        ', ' +
        module.files +
        ' files' +
        (module.description ? ', ' + module.description : '') +
        (startFile ? ', suggested start ' + startFile : '');
      var g = makeSvg('g', {
        class: 'local-map-module-node',
        'data-module': module.name,
        tabindex: 0,
        role: 'button',
        'aria-label': moduleAria
      }, svg);
      applyModulePalette(g, modules.indexOf(module));
      makeSvg('rect', {
        x: pos.x - 92,
        y: pos.y - 37,
        width: 184,
        height: 74,
        rx: 12,
        filter: 'url(#localMapSketch)'
      }, g);
      var title = makeSvg('text', {
        x: pos.x,
        y: pos.y - 10,
        'text-anchor': 'middle'
      }, g);
      title.textContent = module.name;
      var meta = makeSvg('text', {
        x: pos.x,
        y: pos.y + 7,
        class: 'local-map-module-meta',
        'text-anchor': 'middle'
      }, g);
      meta.textContent = module.files + ' files · ' + formatNumber(module.lines) + ' lines';
      if (startFile) {
        var start = makeSvg('text', {
          x: pos.x,
          y: pos.y + 23,
          class: 'local-map-module-start',
          'text-anchor': 'middle'
        }, g);
        start.textContent = 'start: ' + fileName(startFile);
      }

      function focusModule() {
        svg.classList.add('focused');
        var connected = new Set([module.name]);
        svg.querySelectorAll('.local-map-module-edge').forEach(function (edgeNode) {
          var from = edgeNode.getAttribute('data-from');
          var to = edgeNode.getAttribute('data-to');
          var on = from === module.name || to === module.name;
          edgeNode.classList.toggle('on', on);
          if (on) {
            if (from) connected.add(from);
            if (to) connected.add(to);
          }
        });
        svg.querySelectorAll('.local-map-edge-label').forEach(function (labelNode) {
          var from = labelNode.getAttribute('data-from');
          var to = labelNode.getAttribute('data-to');
          labelNode.classList.toggle(
            'on',
            from === module.name || to === module.name,
          );
        });
        svg.querySelectorAll('.local-map-module-node').forEach(function (node) {
          node.classList.toggle('on', connected.has(node.getAttribute('data-module')));
        });
      }
      function clearModuleFocus() {
        svg.classList.remove('focused');
        svg.querySelectorAll('.on').forEach(function (node) {
          node.classList.remove('on');
        });
      }
      function select() {
        setModuleFilter(module.name);
        var target = document.getElementById('localMapTreemap');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      g.addEventListener('mouseenter', function (event) {
        focusModule();
        showModuleTooltip(
          module,
          primaryFiles,
          event.clientX,
          event.clientY
        );
      });
      g.addEventListener('mousemove', function (event) {
        positionModuleTooltip(event.clientX, event.clientY);
      });
      g.addEventListener('mouseleave', function () {
        clearModuleFocus();
        hideModuleTooltip();
      });
      g.addEventListener('focus', function () {
        focusModule();
        showModuleTooltipForNode(module, primaryFiles, g);
      });
      g.addEventListener('blur', function () {
        clearModuleFocus();
        hideModuleTooltip();
      });
      g.addEventListener('click', function () {
        hideModuleTooltip();
        select();
      });
      g.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
    });

    function addNote(moduleName, text, offsetX, offsetY) {
      var pos = positions.get(moduleName);
      if (!pos || !text) return;
      var noteMargin = 14;
      var desiredX = pos.x + offsetX;
      var noteX = desiredX;
      var noteY = Math.max(20, Math.min(height - 16, pos.y + offsetY));
      var note = makeSvg('text', {
        x: noteX,
        y: noteY,
        class: 'local-map-note',
        'text-anchor': offsetX < 0 ? 'end' : 'start'
      }, svg);
      note.textContent = text;

      var noteWidth = 0;
      try { noteWidth = note.getComputedTextLength(); } catch (_) {}
      if (!Number.isFinite(noteWidth) || noteWidth <= 0) {
        noteWidth = text.length * 7.2;
      }
      noteWidth = Math.min(noteWidth, width - noteMargin * 2);
      noteX = offsetX < 0
        ? Math.max(noteMargin + noteWidth, Math.min(width - noteMargin, desiredX))
        : Math.max(noteMargin, Math.min(width - noteMargin - noteWidth, desiredX));
      note.setAttribute('x', String(noteX));

      var noteStart = {
        x: noteX + (offsetX < 0 ? 8 : -8),
        y: noteY + 4
      };
      var noteEnd = {
        x: pos.x + (offsetX < 0 ? -88 : 88),
        y: pos.y - 24
      };
      var noteControl = {
        x: (noteStart.x + noteEnd.x) / 2,
        y: (noteStart.y + noteEnd.y) / 2 - 9
      };
      makeSvg('path', {
        d: buildOpenArrowPath(noteStart, noteEnd, noteControl, 9),
        class: 'local-map-note-line',
        filter: 'url(#localMapSketch)'
      }, svg);
    }

    if (entryModules.length) {
      addNote(entryModules[0], 'detected entry module', -108, -52);
    }
    if (
      mostConnected &&
      (!entryModules.length || mostConnected.name !== entryModules[0])
    ) {
      addNote(
        mostConnected.name,
        'cross-module links: ' + (connectivity.get(mostConnected.name) || 0),
        104,
        -50
      );
    }
    if (
      largestModule &&
      (!entryModules.length || largestModule.name !== entryModules[0]) &&
      (!mostConnected || largestModule.name !== mostConnected.name)
    ) {
      addNote(
        largestModule.name,
        'largest module: ' + formatNumber(largestModule.lines) + ' lines',
        105,
        54
      );
    }
  }

  function splitLayout(items, x, y, w, h, vertical) {
    if (!items.length) return [];
    if (items.length === 1) return [{ item: items[0], x: x, y: y, w: w, h: h }];

    var total = items.reduce(function (sum, item) { return sum + Math.max(1, item.value); }, 0);
    var target = total / 2;
    var running = 0;
    var split = 1;
    for (var i = 0; i < items.length - 1; i++) {
      running += Math.max(1, items[i].value);
      split = i + 1;
      if (running >= target) break;
    }

    var first = items.slice(0, split);
    var second = items.slice(split);
    var firstTotal = first.reduce(function (sum, item) { return sum + Math.max(1, item.value); }, 0);
    var ratio = firstTotal / total;

    if (vertical) {
      var firstW = w * ratio;
      return splitLayout(first, x, y, firstW, h, !vertical)
        .concat(splitLayout(second, x + firstW, y, w - firstW, h, !vertical));
    }

    var firstH = h * ratio;
    return splitLayout(first, x, y, w, firstH, !vertical)
      .concat(splitLayout(second, x, y + firstH, w, h - firstH, !vertical));
  }

  function renderTreemap() {
    var box = document.getElementById('localMapTreemap');
    if (!box) return;
    box.innerHTML = '';

    var width = Math.max(320, box.clientWidth || 900);
    var height = Math.max(360, box.clientHeight || 520);
    var modules = (data.modules || []).filter(function (module) {
      return !moduleFilter || module.name === moduleFilter;
    }).map(function (module) {
      return { value: Math.max(1, module.lines), module: module };
    });

    var moduleRects = splitLayout(modules, 0, 0, width, height, true);
    moduleRects.forEach(function (rect) {
      var mod = rect.item.module;
      var wrapper = document.createElement('div');
      wrapper.className = 'local-map-module-box';
      applyModulePalette(
        wrapper,
        (data.modules || []).findIndex(function (candidate) {
          return candidate.name === mod.name;
        })
      );
      Object.assign(wrapper.style, {
        left: (rect.x + 2) + 'px',
        top: (rect.y + 2) + 'px',
        width: Math.max(1, rect.w - 4) + 'px',
        height: Math.max(1, rect.h - 4) + 'px'
      });

      var label = document.createElement('div');
      label.className = 'local-map-module-title';
      label.textContent = mod.name;
      wrapper.appendChild(label);

      var moduleFiles = data.files
        .filter(function (file) { return file.module === mod.name; })
        .map(function (file) { return { value: Math.max(1, file.lines), file: file }; });

      var top = rect.h > 55 ? 23 : 2;
      var fileRects = splitLayout(
        moduleFiles,
        4,
        top,
        Math.max(1, rect.w - 12),
        Math.max(1, rect.h - top - 8),
        rect.w >= rect.h
      );

      fileRects.forEach(function (fileRect) {
        var file = fileRect.item.file;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'local-map-file-tile';
        button.title = file.path + ' · ' + file.lines + ' lines';
        Object.assign(button.style, {
          left: fileRect.x + 'px',
          top: fileRect.y + 'px',
          width: Math.max(1, fileRect.w - 2) + 'px',
          height: Math.max(1, fileRect.h - 2) + 'px'
        });

        if (fileRect.w > 48 && fileRect.h > 21) {
          var name = document.createElement('span');
          name.textContent = fileName(file.path);
          button.appendChild(name);
        }
        if (fileRect.w > 66 && fileRect.h > 38) {
          var meta = document.createElement('small');
          meta.textContent = file.lines + ' lines';
          button.appendChild(meta);
        }

        button.addEventListener('click', function () {
          openFileAndReveal(file.path);
        });
        wrapper.appendChild(button);
      });

      box.appendChild(wrapper);
    });
  }

  function renderReadingPath() {
    var list = document.getElementById('localMapReading');
    if (!list) return;
    list.innerHTML = '';
    (data.readingPath || []).forEach(function (item, index) {
      var li = document.createElement('li');
      var step = document.createElement('span');
      step.className = 'local-map-step';
      step.textContent = String(index + 1);
      li.appendChild(step);

      var body = document.createElement('div');
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.path;
      button.addEventListener('click', function () { openFileAndReveal(item.path); });
      body.appendChild(button);
      var reason = document.createElement('p');
      reason.textContent = item.reason;
      body.appendChild(reason);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function renderScatter() {
    var svg = document.getElementById('localMapScatter');
    if (!svg) return;
    svg.innerHTML = '';

    var left = 58, right = 930, top = 25, bottom = 340;
    var maxLines = Math.max.apply(null, data.files.map(function (file) { return Math.max(2, file.lines || 0); }));
    var maxUsedBy = Math.max.apply(null, data.files.map(function (file) { return file.usedBy.length; }).concat([1]));
    var logMax = Math.log10(Math.max(10, maxLines));

    function x(value) {
      return left + (Math.log10(Math.max(2, value)) - Math.log10(2)) / (logMax - Math.log10(2) || 1) * (right - left);
    }
    function y(value) {
      return bottom - Math.sqrt(value / maxUsedBy) * (bottom - top);
    }

    [0, 0.25, 0.5, 0.75, 1].forEach(function (ratio) {
      var value = Math.round(maxUsedBy * ratio);
      var yy = y(value);
      makeSvg('line', { x1: left, x2: right, y1: yy, y2: yy, class: 'grid' }, svg);
      var tick = makeSvg('text', { x: left - 10, y: yy + 3, class: 'tick', 'text-anchor': 'end' }, svg);
      tick.textContent = String(value);
    });

    [10, 100, 1000, 10000].filter(function (value) { return value <= Math.max(10, maxLines * 1.2); }).forEach(function (value) {
      var xx = x(value);
      makeSvg('line', { x1: xx, x2: xx, y1: top, y2: bottom, class: 'grid' }, svg);
      var tick = makeSvg('text', { x: xx, y: bottom + 18, class: 'tick', 'text-anchor': 'middle' }, svg);
      tick.textContent = formatNumber(value);
    });

    var xLabel = makeSvg('text', { x: (left + right) / 2, y: 378, class: 'axis-label', 'text-anchor': 'middle' }, svg);
    xLabel.textContent = 'source lines (log scale)';
    var yLabel = makeSvg('text', { x: 16, y: (top + bottom) / 2, class: 'axis-label', 'text-anchor': 'middle', transform: 'rotate(-90 16 ' + ((top + bottom) / 2) + ')' }, svg);
    yLabel.textContent = 'used by project files';

    data.files.forEach(function (file) {
      var point = makeSvg('circle', {
        cx: x(file.lines),
        cy: y(file.usedBy.length),
        r: 5.5,
        class: 'point',
        tabindex: 0,
        role: 'button',
        'aria-label': file.path + ', ' + file.lines + ' lines, used by ' + file.usedBy.length
      }, svg);
      var title = makeSvg('title', {}, point);
      title.textContent = file.path + '\n' + file.lines + ' lines · used by ' + file.usedBy.length;
      function select() { openFileAndReveal(file.path); }
      point.addEventListener('click', select);
      point.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
    });
  }

  function closeResults() {
    var results = document.getElementById('localMapResults');
    var input = document.getElementById('localMapSearch');
    if (results) results.classList.remove('open');
    if (input) {
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
  }

  function chooseSearch(index) {
    if (index < 0 || index >= searchHits.length) return;
    openFileAndReveal(searchHits[index].file.path);
    var input = document.getElementById('localMapSearch');
    if (input) input.value = '';
    closeResults();
  }

  function renderSearch() {
    var input = document.getElementById('localMapSearch');
    var results = document.getElementById('localMapResults');
    if (!input || !results) return;

    var query = input.value.trim().toLowerCase();
    if (!query) {
      searchHits = [];
      searchIndex = -1;
      searchExpanded = false;
      closeResults();
      return;
    }
    var tokens = query.split(/\s+/).filter(Boolean);

    function containsAllTokens(text) {
      var haystack = String(text || '').toLowerCase();
      return tokens.every(function (token) {
        return haystack.includes(token);
      });
    }

    var rankedHits = data.files.map(function (file) {
      var name = fileName(file.path).toLowerCase();
      var pathText = file.path.toLowerCase();
      var descriptionRaw = String(file.description || '');
      var description = descriptionRaw.toLowerCase();
      var exports = Array.isArray(file.exports) ? file.exports : [];
      var internals = Array.isArray(file.internalSymbols)
        ? file.internalSymbols
        : [];
      var environments = Array.isArray(file.environmentVariables)
        ? file.environmentVariables
        : [];
      var todos = Array.isArray(file.todos) ? file.todos : [];
      var exportMatch = exports.find(function (item) {
        return containsAllTokens(item.name);
      });
      var internalMatch = internals.find(function (item) {
        return containsAllTokens(item.name);
      });
      var environmentMatch = environments.find(function (environmentName) {
        return containsAllTokens(environmentName);
      });
      var todoMatch = todos.find(function (todo) {
        return containsAllTokens(todo.text);
      });
      var combinedEvidence = [
        pathText,
        description,
        exports.map(function (item) { return item.name; }).join(' '),
        internals.map(function (item) { return item.name; }).join(' '),
        environments.join(' '),
        todos.map(function (todo) { return todo.text; }).join(' ')
      ].join(' ').toLowerCase();
      var score = 0;
      var match = '';

      if (!containsAllTokens(combinedEvidence)) {
        return { file: file, score: 0, match: '' };
      }

      if (name === query) {
        score = 100;
        match = 'Filename';
      } else if (tokens.length === 1 && name.startsWith(query)) {
        score = 80;
        match = 'Filename';
      } else if (containsAllTokens(name)) {
        score = 65;
        match = 'Filename';
      } else if (containsAllTokens(pathText)) {
        score = 50;
        match = 'Path';
      } else if (containsAllTokens(description)) {
        score = 35;
        match = descriptionRaw || 'Description';
      } else if (environmentMatch) {
        score = 28;
        match = 'Environment: ' + environmentMatch;
      } else if (exportMatch) {
        score = 25;
        match = 'Export: ' + exportMatch.name;
      } else if (internalMatch) {
        score = 23;
        match = 'Internal symbol: ' + internalMatch.name;
      } else if (todoMatch) {
        score = 21;
        match = 'Source note: ' + todoMatch.text;
      } else {
        score = 16;
        match = 'Matched across file facts';
      }

      return { file: file, score: score, match: match };
    }).filter(function (item) { return item.score > 0; })
      .sort(function (a, b) {
        return b.score - a.score || b.file.usedBy.length - a.file.usedBy.length || a.file.path.localeCompare(b.file.path);
      });

    searchHits = searchExpanded ? rankedHits : rankedHits.slice(0, 9);
    searchIndex = searchHits.length ? 0 : -1;
    results.innerHTML = '';

    if (!searchHits.length) {
      var empty = document.createElement('li');
      empty.textContent = 'No matching file.';
      empty.style.padding = '8px';
      empty.style.color = 'var(--text-muted)';
      results.appendChild(empty);
    } else {
      searchHits.forEach(function (hit, index) {
        var li = document.createElement('li');
        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', index === searchIndex ? 'true' : 'false');
        var code = document.createElement('code');
        code.textContent = hit.file.path;
        button.appendChild(code);
        var detailText = hit.match || hit.file.description || '';
        if (detailText) {
          var small = document.createElement('small');
          small.textContent = detailText;
          button.appendChild(small);
        }
        button.addEventListener('click', function () { chooseSearch(index); });
        li.appendChild(button);
        results.appendChild(li);
      });

      if (!searchExpanded && rankedHits.length > searchHits.length) {
        var moreItem = document.createElement('li');
        moreItem.className = 'local-map-result-more';
        var moreButton = document.createElement('button');
        moreButton.type = 'button';
        moreButton.textContent =
          'Show all ' + rankedHits.length + ' matches';
        moreButton.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          searchExpanded = true;
          renderSearch();
        });
        moreItem.appendChild(moreButton);
        results.appendChild(moreItem);
      }
    }

    results.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
    var selected = results.querySelector('button[aria-selected="true"]');
    if (selected) {
      if (!selected.id) selected.id = 'localMapResult-' + searchIndex;
      input.setAttribute('aria-activedescendant', selected.id);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function relationButton(path) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = path;
    button.title = path;
    button.addEventListener('click', function () { openFile(path); });
    return button;
  }

  function relationColumn(title, paths) {
    var box = document.createElement('div');
    box.className = 'local-map-relation';
    var heading = document.createElement('strong');
    heading.textContent = title;
    box.appendChild(heading);

    if (!paths.length) {
      var empty = document.createElement('span');
      empty.textContent = 'None inside the project';
      empty.style.color = 'var(--text-muted)';
      empty.style.fontSize = '10px';
      box.appendChild(empty);
      return box;
    }

    paths.slice(0, 12).forEach(function (path) {
      box.appendChild(relationButton(path));
    });

    if (paths.length > 12) {
      var details = document.createElement('details');
      details.className = 'local-map-relation-more';
      var summary = document.createElement('summary');
      summary.textContent = '+ ' + (paths.length - 12) + ' more';
      details.appendChild(summary);
      paths.slice(12).forEach(function (path) {
        details.appendChild(relationButton(path));
      });
      box.appendChild(details);
    }

    return box;
  }

  function renderCard() {
    var card = document.getElementById('localMapCard');
    var file = byPath.get(currentPath);
    if (!card || !file) return;
    card.innerHTML = '';

    var heading = document.createElement('h4');
    heading.textContent = file.path;
    card.appendChild(heading);

    var meta = document.createElement('p');
    meta.className = 'local-map-card-meta';
    meta.appendChild(document.createTextNode(
      file.lines + ' lines · ' + file.exports.length + ' exports · used by ' + file.usedBy.length + ' · '
    ));
    var sourceLink = document.createElement('a');
    sourceLink.className = 'local-map-source-link';
    sourceLink.href = relativeSourceHref(file.path);
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener';
    sourceLink.textContent = 'Open source';
    meta.appendChild(sourceLink);
    card.appendChild(meta);

    var actions = document.createElement('div');
    actions.className = 'local-map-card-actions';
    var fullDocs = document.createElement('button');
    fullDocs.type = 'button';
    fullDocs.textContent = 'Open full file documentation';
    fullDocs.addEventListener('click', function () {
      revealFullDocumentation(file.path);
    });
    actions.appendChild(fullDocs);

    var sourceLink = document.createElement('a');
    sourceLink.href = relativeSourceHref(file.path);
    sourceLink.textContent = 'Open source file';
    sourceLink.title = file.path;
    actions.appendChild(sourceLink);
    card.appendChild(actions);

    var desc = document.createElement('p');
    desc.className = 'local-map-card-desc';
    desc.textContent = file.description || 'No trusted module-level description found.';
    card.appendChild(desc);

    if (file.description && file.descriptionSource) {
      var source = document.createElement('p');
      source.className = 'local-map-card-meta';
      source.textContent = 'Description source: ' + file.descriptionSource;
      card.appendChild(source);
    }

    if (Array.isArray(file.environmentVariables) && file.environmentVariables.length) {
      var environment = document.createElement('p');
      environment.className = 'local-map-card-meta';
      environment.textContent =
        'Environment references: ' + file.environmentVariables.join(', ');
      card.appendChild(environment);
    }

    var relations = document.createElement('div');
    relations.className = 'local-map-relations';
    relations.appendChild(relationColumn('Uses', file.uses));
    relations.appendChild(relationColumn('Used by', file.usedBy));
    card.appendChild(relations);

    function appendSymbolTable(title, items) {
      if (!items.length) return;

      var heading = document.createElement('h5');
      heading.className = 'local-map-symbol-heading';
      heading.textContent = title;
      card.appendChild(heading);

      var table = document.createElement('table');
      table.className = 'local-map-exports';
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      ['Symbol', 'Kind', 'Line'].forEach(function (label) {
        var th = document.createElement('th');
        th.textContent = label;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      items.forEach(function (item) {
        var row = document.createElement('tr');
        var nameCell = document.createElement('td');
        var symbolLink = document.createElement('a');
        symbolLink.className = 'local-map-source-link';
        symbolLink.href = relativeSourceHref(file.path, item.line);
        symbolLink.target = '_blank';
        symbolLink.rel = 'noopener';
        symbolLink.textContent = item.name;
        nameCell.appendChild(symbolLink);
        row.appendChild(nameCell);

        var kindCell = document.createElement('td');
        kindCell.textContent = item.kind;
        row.appendChild(kindCell);

        var lineCell = document.createElement('td');
        var lineLink = document.createElement('a');
        lineLink.className = 'local-map-source-link';
        lineLink.href = relativeSourceHref(file.path, item.line);
        lineLink.target = '_blank';
        lineLink.rel = 'noopener';
        lineLink.textContent = String(item.line);
        lineCell.appendChild(lineLink);
        row.appendChild(lineCell);
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      card.appendChild(table);
    }

    var exportedSymbols = Array.isArray(file.exports) ? file.exports : [];
    appendSymbolTable('Exported API', exportedSymbols);

    var internalSymbols = Array.isArray(file.internalSymbols)
      ? file.internalSymbols
      : [];
    appendSymbolTable('Internal symbols', internalSymbols);

    var todos = Array.isArray(file.todos) ? file.todos : [];
    if (todos.length) {
      var notes = document.createElement('div');
      notes.className = 'local-map-source-notes';
      var notesHeading = document.createElement('strong');
      notesHeading.textContent = 'Source notes';
      notes.appendChild(notesHeading);

      todos.slice(0, 12).forEach(function (todo) {
        var note = document.createElement('div');
        note.className = 'local-map-source-note';
        var noteLink = document.createElement('a');
        noteLink.className = 'local-map-source-link';
        noteLink.href = relativeSourceHref(file.path, todo.line);
        noteLink.target = '_blank';
        noteLink.rel = 'noopener';
        noteLink.textContent = 'L' + todo.line;
        note.appendChild(noteLink);
        note.appendChild(document.createTextNode(' ' + todo.text));
        notes.appendChild(note);
      });

      if (todos.length > 12) {
        var moreNotes = document.createElement('div');
        moreNotes.className = 'local-map-source-note';
        moreNotes.textContent = '+ ' + (todos.length - 12) + ' more source notes';
        notes.appendChild(moreNotes);
      }

      card.appendChild(notes);
    }
  }

  renderFacts();
  renderOverview();
  renderOnboarding();
  renderModules();
  renderModuleLegend();
  renderTreemap();
  renderReadingPath();
  renderScatter();
  renderCard();
  initSectionNav();

  var clear = document.getElementById('localMapClearFilter');
  if (clear) clear.addEventListener('click', function () { setModuleFilter(null); });

  var input = document.getElementById('localMapSearch');
  var results = document.getElementById('localMapResults');

  document.addEventListener('keydown', function (event) {
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      event.key.toLowerCase() === 'k' &&
      input
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var lookup = document.getElementById('localMapLookupTitle');
      if (lookup) lookup.scrollIntoView({ behavior: 'smooth', block: 'start' });
      input.focus();
      input.select();
    }
  }, true);

  if (input && results) {
    input.addEventListener('input', function () {
      searchExpanded = false;
      renderSearch();
    });
    input.addEventListener('keydown', function (event) {
      if (!results.classList.contains('open')) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!searchHits.length) return;
        searchIndex = (searchIndex + (event.key === 'ArrowDown' ? 1 : -1) + searchHits.length) % searchHits.length;
        results.querySelectorAll('button[role="option"]').forEach(function (button, index) {
          var selected = index === searchIndex;
          button.setAttribute('aria-selected', selected ? 'true' : 'false');
          if (selected) {
            if (!button.id) button.id = 'localMapResult-' + index;
            input.setAttribute('aria-activedescendant', button.id);
            button.scrollIntoView({ block: 'nearest' });
          }
        });
      } else if (event.key === 'Enter' && searchIndex >= 0) {
        event.preventDefault();
        chooseSearch(searchIndex);
      } else if (event.key === 'Escape') {
        closeResults();
      }
    });
    document.addEventListener('click', function (event) {
      if (!event.target.closest('.local-map-search-wrap')) closeResults();
    });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderTreemap, 120);
  });
})();
</script>
`;
}


function escapeHtmlAttribute(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
