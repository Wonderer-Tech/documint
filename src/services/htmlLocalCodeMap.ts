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
  .local-code-map {
    margin: 22px 0 34px;
    padding: 24px;
    border: 1px solid var(--border);
    border-radius: 22px;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 88%, transparent), color-mix(in srgb, var(--bg-primary) 96%, transparent));
    box-shadow: 0 20px 60px rgba(0, 0, 0, .12);
  }
  .local-code-map * { box-sizing: border-box; }
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
    gap: 18px;
    align-items: flex-end;
    justify-content: space-between;
    padding: 2px 2px 20px;
  }
  .local-map-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
    color: var(--accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .12em;
    text-transform: uppercase;
  }
  .local-map-hero h2 {
    margin: 0;
    font-size: clamp(26px, 4vw, 40px);
    line-height: 1.06;
    letter-spacing: -.035em;
  }
  .local-map-hero p {
    max-width: 690px;
    margin: 9px 0 0;
    color: var(--text-secondary);
    font-size: 14px;
  }
  .local-map-badge {
    flex: none;
    padding: 7px 11px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 700;
  }
  .local-map-section {
    padding: 22px 0;
    border-top: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  }
  .local-map-section:first-of-type { border-top: 0; }
  .local-map-section-head {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 13px;
  }
  .local-map-section h3 {
    margin: 0;
    font-size: 19px;
    line-height: 1.2;
  }
  .local-map-question {
    margin: 4px 0 0;
    color: var(--accent);
    font-family: "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive;
    font-size: 13px;
    font-style: normal;
    transform: rotate(-.25deg);
    transform-origin: left center;
  }
  .local-map-hint {
    max-width: 540px;
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
  .local-map-overview {
    display: grid;
    gap: 12px;
  }
  .local-map-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
    gap: 8px;
  }
  .local-map-stat {
    min-width: 0;
    padding: 11px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
  }
  .local-map-stat strong {
    display: block;
    color: var(--text-primary);
    font-size: 16px;
    line-height: 1.1;
  }
  .local-map-stat span {
    display: block;
    margin-top: 3px;
    color: var(--text-muted);
    font-size: 9.5px;
  }
  .local-map-overview-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
  }
  .local-map-overview-card {
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg-primary);
  }
  .local-map-overview-card h4 {
    margin: 0 0 7px;
    font-size: 11px;
  }
  .local-map-overview-card p {
    margin: 0;
    color: var(--text-muted);
    font-size: 10px;
    line-height: 1.45;
  }
  .local-map-overview-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .local-map-overview-list code,
  .local-map-overview-list button {
    max-width: 100%;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 7px;
    overflow: hidden;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 9.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-overview-list button {
    color: var(--accent);
    cursor: pointer;
  }
  .local-map-overview-list button:hover,
  .local-map-overview-list button:focus {
    border-color: var(--accent);
    outline: none;
  }
  .local-map-panel {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
  }
  .local-map-onboarding {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
  }
  .local-map-fact-card {
    min-width: 0;
    padding: 13px;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
  }
  .local-map-fact-card h4 {
    margin: 0 0 8px;
    font-size: 12px;
  }
  .local-map-fact-source {
    margin: -3px 0 9px;
    color: var(--text-muted);
    font-size: 9.5px;
    overflow-wrap: anywhere;
  }
  .local-map-fact-row {
    display: grid;
    grid-template-columns: minmax(78px, .42fr) minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    padding: 5px 0;
    border-top: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
    font-size: 10.5px;
  }
  .local-map-fact-row:first-of-type { border-top: 0; }
  .local-map-fact-label {
    color: var(--text-muted);
    font-weight: 700;
  }
  .local-map-fact-value,
  .local-map-fact-row code {
    min-width: 0;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }
  .local-map-command-row {
    padding: 6px 0;
    border-top: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  }
  .local-map-command-row:first-of-type { border-top: 0; }
  .local-map-command-row code {
    display: block;
    color: var(--accent);
    font-size: 10.5px;
    overflow-wrap: anywhere;
  }
  .local-map-command-row small {
    display: block;
    margin-top: 2px;
    color: var(--text-muted);
    font-size: 9.5px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .local-map-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .local-map-chip-list code {
    padding: 3px 6px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 9.5px;
  }
  .local-map-module-canvas {
    display: block;
    width: 100%;
    min-height: 360px;
  }
  .local-map-module-node { cursor: pointer; }
  .local-map-module-node rect {
    fill: var(--bg-secondary);
    stroke: var(--border);
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .local-map-module-node:hover rect,
  .local-map-module-node:focus rect {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .local-map-module-node text {
    fill: var(--text-primary);
    font-size: 12px;
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
    opacity: .32;
  }
  .local-map-module-node .local-map-module-meta {
    fill: var(--text-muted);
    font-size: 10px;
    font-weight: 500;
  }
  .local-map-module-node .local-map-module-start {
    fill: var(--accent);
    font-size: 9px;
    font-weight: 600;
  }
  .local-map-module-edge {
    stroke: color-mix(in srgb, var(--text-muted) 58%, transparent);
    stroke-width: 1.35;
    stroke-linecap: round;
    fill: none;
  }
  .local-map-module-edge.strong {
    stroke: color-mix(in srgb, var(--accent) 72%, var(--text-muted));
    stroke-width: 2.2;
  }
  .local-map-edge-label {
    fill: var(--text-muted);
    font-size: 10px;
  }
  .local-map-note {
    fill: var(--accent);
    font-family: "Segoe Print", "Bradley Hand", cursive;
    font-size: 13px;
    font-weight: 600;
  }
  .local-map-note-line {
    stroke: var(--accent);
    stroke-width: 1.1;
    fill: none;
    opacity: .78;
  }
  .local-map-filter-row {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  .local-map-filter-state {
    min-height: 24px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .local-map-clear {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 9px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 11px;
  }
  .local-map-clear[hidden] { display: none; }
  .local-map-treemap {
    position: relative;
    height: 520px;
    min-height: 360px;
    background: var(--bg-primary);
  }
  .local-map-module-box {
    position: absolute;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent-subtle) 30%, var(--bg-secondary));
  }
  .local-map-module-title {
    position: absolute;
    z-index: 2;
    top: 5px;
    left: 7px;
    max-width: calc(100% - 14px);
    overflow: hidden;
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }
  .local-map-file-tile {
    position: absolute;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
    border-radius: 5px;
    background: color-mix(in srgb, var(--bg-secondary) 90%, var(--accent-subtle));
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
  }
  .local-map-file-tile:hover,
  .local-map-file-tile:focus {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent-subtle) 65%, var(--bg-secondary));
    outline: none;
  }
  .local-map-file-tile span {
    display: block;
    overflow: hidden;
    padding: 4px 5px 0;
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: 9.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-file-tile small {
    display: block;
    padding: 1px 5px 4px;
    color: var(--text-muted);
    font-size: 9px;
  }
  .local-map-reading {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .local-map-reading li {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
  }
  .local-map-step {
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--bg-secondary);
    color: var(--accent);
    font-size: 11px;
    font-weight: 800;
  }
  .local-map-reading button {
    display: block;
    width: 100%;
    border: 0;
    padding: 0;
    background: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: 12px;
  }
  .local-map-reading button:hover { color: var(--accent); }
  .local-map-reading p {
    margin: 3px 0 0;
    color: var(--text-muted);
    font-size: 11px;
  }
  .local-map-scatter {
    display: block;
    width: 100%;
    min-width: 620px;
    min-height: 390px;
  }
  .local-map-scatter .grid {
    stroke: color-mix(in srgb, var(--border) 72%, transparent);
    stroke-dasharray: 3 5;
  }
  .local-map-scatter .axis-label,
  .local-map-scatter .tick {
    fill: var(--text-muted);
    font-size: 10px;
  }
  .local-map-scatter .point {
    cursor: pointer;
    fill: color-mix(in srgb, var(--accent) 45%, var(--bg-secondary));
    stroke: var(--accent);
    stroke-width: 1.4;
  }
  .local-map-scatter .point:hover,
  .local-map-scatter .point:focus {
    stroke-width: 3;
    outline: none;
  }
  .local-map-scroll { overflow-x: auto; }
  .local-map-lookup {
    display: grid;
    grid-template-columns: minmax(220px, 350px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .local-map-search-wrap { position: relative; }
  .local-map-shortcut {
    position: absolute;
    top: 10px;
    right: 10px;
    color: var(--text-muted);
    font-size: 9px;
    pointer-events: none;
  }
  .local-map-search {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 11px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
  }
  .local-map-search:focus {
    border-color: var(--accent);
    outline: none;
    box-shadow: 0 0 0 2px var(--accent-subtle);
  }
  .local-map-results {
    position: absolute;
    z-index: 8;
    top: calc(100% + 5px);
    right: 0;
    left: 0;
    display: none;
    max-height: 300px;
    overflow: auto;
    margin: 0;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg-secondary);
    box-shadow: 0 14px 34px rgba(0, 0, 0, .22);
    list-style: none;
  }
  .local-map-results.open { display: block; }
  .local-map-results button {
    width: 100%;
    border: 0;
    border-radius: 7px;
    padding: 7px 8px;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
  }
  .local-map-results button:hover,
  .local-map-results button[aria-selected="true"] {
    background: var(--accent-subtle);
  }
  .local-map-results code {
    display: block;
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-results small {
    display: block;
    overflow: hidden;
    margin-top: 2px;
    color: var(--text-muted);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-card {
    min-height: 220px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg-primary);
  }
  .local-map-card h4 {
    margin: 0;
    overflow-wrap: anywhere;
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: 15px;
  }
  .local-map-card-meta {
    margin: 5px 0 0;
    color: var(--text-muted);
    font-size: 10.5px;
  }
  .local-map-source-link {
    color: var(--accent);
    text-decoration: none;
  }
  .local-map-source-link:hover { text-decoration: underline; }
  .local-map-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 10px;
  }
  .local-map-card-actions button,
  .local-map-card-actions a {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 5px 9px;
    background: var(--bg-secondary);
    color: var(--accent);
    cursor: pointer;
    font-size: 10.5px;
    font-weight: 700;
    text-decoration: none;
  }
  .local-map-card-actions button:hover,
  .local-map-card-actions button:focus,
  .local-map-card-actions a:hover,
  .local-map-card-actions a:focus {
    border-color: var(--accent);
    outline: none;
  }
  .local-map-card-desc {
    margin: 12px 0;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.55;
  }
  .local-map-relations {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .local-map-relation {
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg-secondary);
  }
  .local-map-relation strong {
    display: block;
    margin-bottom: 6px;
    color: var(--text-secondary);
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
    color: var(--accent);
    cursor: pointer;
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .local-map-relation-more {
    margin-top: 4px;
    border-top: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
    padding-top: 4px;
  }
  .local-map-relation-more summary {
    color: var(--text-muted);
    cursor: pointer;
    font-size: 10px;
    user-select: none;
  }
  .local-map-relation-more[open] summary {
    margin-bottom: 3px;
    color: var(--text-secondary);
  }
  .local-map-exports {
    width: 100%;
    margin-top: 12px;
    border-collapse: collapse;
    font-size: 10.5px;
  }
  .local-map-exports th,
  .local-map-exports td {
    padding: 5px 7px;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  .local-map-exports th { color: var(--text-muted); }
  .local-map-symbol-heading {
    margin: 14px 0 5px;
    color: var(--text-secondary);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .local-map-source-notes {
    margin-top: 12px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg-secondary);
  }
  .local-map-source-notes strong {
    display: block;
    margin-bottom: 6px;
    color: var(--text-secondary);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .local-map-source-note {
    color: var(--text-secondary);
    font-size: 10.5px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .local-map-source-note + .local-map-source-note { margin-top: 4px; }
  @media (max-width: 820px) {
    .local-code-map { padding: 17px; border-radius: 16px; }
    .local-map-hero { align-items: flex-start; flex-direction: column; }
    .local-map-lookup { grid-template-columns: 1fr; }
    .local-map-relations { grid-template-columns: 1fr; }
    .local-map-treemap { height: 620px; }
  }
`;

const LOCAL_CODE_MAP_MARKUP = String.raw`
<section class="local-code-map" id="documint-local-code-map" data-documint-local-code-map>
  <div class="local-map-hero">
    <div>
      <div class="local-map-kicker">Local project map</div>
      <h2>Find your way through the code</h2>
      <p>Every view below is generated from the same source-analysis model: files, exports, resolved imports, descriptions, entry points, and detected build metadata.</p>
    </div>
    <span class="local-map-badge" id="localMapFacts"></span>
  </div>

  <section class="local-map-section" aria-labelledby="localMapOverviewTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapOverviewTitle">At a glance</h3>
        <p class="local-map-question">What is this project made of?</p>
      </div>
      <p class="local-map-hint">Counts, languages, entry points, and external dependencies come directly from the canonical Local analysis model.</p>
    </div>
    <div class="local-map-overview" id="localMapOverview"></div>
  </section>

  <section class="local-map-section" aria-labelledby="localMapBigTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapBigTitle">Big picture</h3>
        <p class="local-map-question">How do the parts fit together?</p>
      </div>
      <p class="local-map-hint">Boxes are structural modules. Arrows are resolved cross-module imports. Click a module to filter the size map.</p>
    </div>
    <div class="local-map-panel local-map-scroll">
      <svg class="local-map-module-canvas" id="localMapModules" viewBox="0 0 960 360" role="img" aria-label="Project modules and resolved imports between them"></svg>
    </div>
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

  <section class="local-map-section" aria-labelledby="localMapSizeTitle">
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

  <section class="local-map-section" aria-labelledby="localMapReadTitle">
    <div class="local-map-section-head">
      <div>
        <h3 id="localMapReadTitle">Start here</h3>
        <p class="local-map-question">I'm new. What should I read first?</p>
      </div>
      <p class="local-map-hint">Suggested from detected entry points and dependency reach. It is a reading aid, not a claim about the only correct order.</p>
    </div>
    <ol class="local-map-reading" id="localMapReading"></ol>
  </section>

  <section class="local-map-section" aria-labelledby="localMapReachTitle">
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

  <section class="local-map-section" aria-labelledby="localMapLookupTitle">
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

    if (details.childNodes.length) {
      root.appendChild(details);
    }
  }

  function renderFacts() {
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
  }

  function layoutModules(modules, edges, width) {
    var names = new Set(modules.map(function (module) { return module.name; }));
    var outgoing = new Map();
    var incomingCount = new Map();
    modules.forEach(function (module) {
      outgoing.set(module.name, []);
      incomingCount.set(module.name, 0);
    });
    edges.forEach(function (edge) {
      if (!names.has(edge.from) || !names.has(edge.to) || edge.from === edge.to) return;
      outgoing.get(edge.from).push(edge.to);
      incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
    });

    var roots = Array.from(new Set(
      data.files
        .filter(function (file) { return file.entryPoint; })
        .map(function (file) { return file.module; })
        .filter(function (name) { return names.has(name); })
    ));
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
      if (levels.has(current.name)) continue;
      levels.set(current.name, current.level);
      (outgoing.get(current.name) || []).forEach(function (next) {
        if (!levels.has(next)) queue.push({ name: next, level: current.level + 1 });
      });
    }

    modules.forEach(function (module) {
      if (!levels.has(module.name)) levels.set(module.name, 0);
    });

    var maxLevel = Math.max.apply(null, Array.from(levels.values()).concat([0]));
    var groups = new Map();
    modules.forEach(function (module) {
      var level = levels.get(module.name) || 0;
      var group = groups.get(level) || [];
      group.push(module);
      groups.set(level, group);
    });
    groups.forEach(function (group) {
      group.sort(function (a, b) {
        return b.files - a.files || a.name.localeCompare(b.name);
      });
    });

    var maxRows = Math.max.apply(
      null,
      Array.from(groups.values()).map(function (group) { return group.length; }).concat([1])
    );
    var height = Math.max(360, maxRows * 92 + 80);
    var positions = new Map();

    groups.forEach(function (group, level) {
      var x = maxLevel === 0
        ? width / 2
        : 115 + level * ((width - 230) / maxLevel);
      var gap = height / (group.length + 1);
      group.forEach(function (module, index) {
        positions.set(module.name, {
          x: x,
          y: gap * (index + 1),
          level: level
        });
      });
    });

    return { positions: positions, height: height };
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

  function renderModules() {
    var svg = document.getElementById('localMapModules');
    if (!svg) return;
    svg.innerHTML = '';

    var modules = data.modules || [];
    if (!modules.length) return;
    var edgeCounts = data.edges || [];
    var width = 960;
    var layout = layoutModules(modules, edgeCounts, width);
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

    var marker = makeSvg('marker', {
      id: 'localMapArrow',
      markerWidth: 8,
      markerHeight: 8,
      refX: 7,
      refY: 3,
      orient: 'auto',
      markerUnits: 'strokeWidth'
    }, defs);
    makeSvg('path', { d: 'M0,0 L0,6 L7,3 z', fill: 'currentColor' }, marker);

    edgeCounts.forEach(function (edge) {
      var a = positions.get(edge.from), b = positions.get(edge.to);
      if (!a || !b) return;
      var start = clipModuleEdge(a, b);
      var end = clipModuleEdge(b, a);
      var line = makeSvg('line', {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        class: 'local-map-module-edge' + (edge.count >= 3 ? ' strong' : ''),
        filter: 'url(#localMapSketch)',
        'data-from': edge.from,
        'data-to': edge.to,
        'marker-end': 'url(#localMapArrow)'
      }, svg);
      line.style.color = 'var(--text-muted)';

      var mx = (start.x + end.x) / 2;
      var my = (start.y + end.y) / 2;
      var label = makeSvg('text', {
        x: mx,
        y: my - 5,
        class: 'local-map-edge-label',
        'data-from': edge.from,
        'data-to': edge.to,
        'text-anchor': 'middle'
      }, svg);
      label.textContent = String(edge.count);
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
      if (module.description || startFile) {
        var tooltip = makeSvg('title', {}, g);
        var tooltipLines = [module.name];
        if (module.description) {
          tooltipLines.push(
            module.description +
            (module.descriptionSource
              ? ' [' + module.descriptionSource + ']'
              : '')
          );
        }
        if (primaryFiles.length) {
          tooltipLines.push('Suggested start: ' + primaryFiles.join(', '));
        }
        tooltip.textContent = tooltipLines.join('\n');
      }
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
      g.addEventListener('mouseenter', focusModule);
      g.addEventListener('mouseleave', clearModuleFocus);
      g.addEventListener('focus', focusModule);
      g.addEventListener('blur', clearModuleFocus);
      g.addEventListener('click', select);
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
      var noteX = Math.max(55, Math.min(width - 55, pos.x + offsetX));
      var noteY = Math.max(20, Math.min(height - 16, pos.y + offsetY));
      var note = makeSvg('text', {
        x: noteX,
        y: noteY,
        class: 'local-map-note',
        'text-anchor': offsetX < 0 ? 'end' : 'start'
      }, svg);
      note.textContent = text;
      makeSvg('line', {
        x1: noteX + (offsetX < 0 ? 8 : -8),
        y1: noteY + 4,
        x2: pos.x + (offsetX < 0 ? -88 : 88),
        y2: pos.y - 24,
        class: 'local-map-note-line'
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
      closeResults();
      return;
    }

    searchHits = data.files.map(function (file) {
      var name = fileName(file.path).toLowerCase();
      var pathText = file.path.toLowerCase();
      var description = String(file.description || '').toLowerCase();
      var exports = Array.isArray(file.exports) ? file.exports : [];
      var internals = Array.isArray(file.internalSymbols)
        ? file.internalSymbols
        : [];
      var environments = Array.isArray(file.environmentVariables)
        ? file.environmentVariables
        : [];
      var todos = Array.isArray(file.todos) ? file.todos : [];
      var exportMatch = exports.find(function (item) {
        return String(item.name || '').toLowerCase().includes(query);
      });
      var internalMatch = internals.find(function (item) {
        return String(item.name || '').toLowerCase().includes(query);
      });
      var environmentMatch = environments.find(function (name) {
        return String(name || '').toLowerCase().includes(query);
      });
      var todoMatch = todos.find(function (todo) {
        return String(todo.text || '').toLowerCase().includes(query);
      });
      var score = 0;
      var match = '';
      if (name === query) {
        score = 100;
        match = 'Filename';
      } else if (name.startsWith(query)) {
        score = 80;
        match = 'Filename';
      } else if (name.includes(query)) {
        score = 60;
        match = 'Filename';
      } else if (pathText.includes(query)) {
        score = 45;
        match = 'Path';
      } else if (description.includes(query)) {
        score = 30;
        match = file.description || 'Description';
      } else if (environmentMatch) {
        score = 25;
        match = 'Environment: ' + environmentMatch;
      } else if (exportMatch) {
        score = 22;
        match = 'Export: ' + exportMatch.name;
      } else if (internalMatch) {
        score = 20;
        match = 'Internal symbol: ' + internalMatch.name;
      } else if (todoMatch) {
        score = 18;
        match = 'Source note: ' + todoMatch.text;
      }
      return { file: file, score: score, match: match };
    }).filter(function (item) { return item.score > 0; })
      .sort(function (a, b) {
        return b.score - a.score || b.file.usedBy.length - a.file.usedBy.length || a.file.path.localeCompare(b.file.path);
      })
      .slice(0, 9);

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
  renderTreemap();
  renderReadingPath();
  renderScatter();
  renderCard();

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
    input.addEventListener('input', renderSearch);
    input.addEventListener('keydown', function (event) {
      if (!results.classList.contains('open')) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!searchHits.length) return;
        searchIndex = (searchIndex + (event.key === 'ArrowDown' ? 1 : -1) + searchHits.length) % searchHits.length;
        results.querySelectorAll('button').forEach(function (button, index) {
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
