import type { LocalCodeMapData } from "./localCodeMapData";

export interface LocalCodeMapFragments {
  styles: string;
  markup: string;
  script: string;
}

export function renderLocalCodeMapFragments(
  data: LocalCodeMapData | undefined,
): LocalCodeMapFragments {
  if (!data || data.files.length === 0) {
    return { styles: "", markup: "", script: "" };
  }

  return {
    styles: LOCAL_CODE_MAP_STYLES,
    markup: LOCAL_CODE_MAP_MARKUP,
    script: buildLocalCodeMapScript(data),
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
    font-size: 13px;
    font-style: italic;
  }
  .local-map-hint {
    max-width: 540px;
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
  .local-map-panel {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
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
  .local-map-module-node .local-map-module-meta {
    fill: var(--text-muted);
    font-size: 10px;
    font-weight: 500;
  }
  .local-map-module-edge {
    stroke: color-mix(in srgb, var(--text-muted) 58%, transparent);
    stroke-width: 1.35;
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
  @media (max-width: 820px) {
    .local-code-map { padding: 17px; border-radius: 16px; }
    .local-map-hero { align-items: flex-start; flex-direction: column; }
    .local-map-lookup { grid-template-columns: 1fr; }
    .local-map-treemap { height: 620px; }
  }
`;

const LOCAL_CODE_MAP_MARKUP = String.raw`
<section class="local-code-map" id="documint-local-code-map" data-documint-local-code-map>
  <div class="local-map-hero">
    <div>
      <div class="local-map-kicker">Local project map</div>
      <h2>Find your way through the code</h2>
      <p>Every view below is generated from the same source-analysis model: files, exports, resolved imports, descriptions, and entry points.</p>
    </div>
    <span class="local-map-badge" id="localMapFacts"></span>
  </div>

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
        <span class="local-map-filter-state" id="localMapFilterState">Showing all modules</span>
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
      <p class="local-map-hint">Search matches file paths, trusted descriptions, and exported symbol names.</p>
    </div>
    <div class="local-map-lookup">
      <div class="local-map-search-wrap">
        <input class="local-map-search" id="localMapSearch" type="search" autocomplete="off" placeholder="Search files, descriptions, exports…" role="combobox" aria-expanded="false" aria-controls="localMapResults">
        <ul class="local-map-results" id="localMapResults" role="listbox"></ul>
      </div>
      <article class="local-map-card" id="localMapCard" aria-live="polite"></article>
    </div>
  </section>
</section>

<script type="application/json" id="documintLocalCodeMapData"></script>
`;

function buildLocalCodeMapScript(data: LocalCodeMapData): string {
  const json = JSON.stringify(data)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return String.raw`
<script>
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

  function setModuleFilter(name) {
    moduleFilter = name || null;
    renderTreemap();
    var state = document.getElementById('localMapFilterState');
    var clear = document.getElementById('localMapClearFilter');
    if (state) state.textContent = moduleFilter ? 'Showing ' + moduleFilter : 'Showing all modules';
    if (clear) clear.hidden = !moduleFilter;
  }

  function renderFacts() {
    var facts = document.getElementById('localMapFacts');
    if (!facts) return;
    var lines = data.files.reduce(function (sum, file) { return sum + Number(file.lines || 0); }, 0);
    facts.textContent = formatNumber(data.files.length) + ' files · ' + formatNumber(lines) + ' lines';
  }

  function renderModules() {
    var svg = document.getElementById('localMapModules');
    if (!svg) return;
    svg.innerHTML = '';

    var modules = data.modules || [];
    if (!modules.length) return;
    var edgeCounts = data.edges || [];
    var cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(modules.length))));
    var rows = Math.ceil(modules.length / cols);
    var width = 960, height = Math.max(360, rows * 118 + 70);
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

    var positions = new Map();
    modules.forEach(function (module, index) {
      var col = index % cols;
      var row = Math.floor(index / cols);
      var cellW = width / cols;
      var x = cellW * col + cellW / 2;
      var y = 60 + row * 118;
      positions.set(module.name, { x: x, y: y });
    });

    var defs = makeSvg('defs', {}, svg);
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
      var line = makeSvg('line', {
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        class: 'local-map-module-edge' + (edge.count >= 3 ? ' strong' : ''),
        'marker-end': 'url(#localMapArrow)'
      }, svg);
      line.style.color = 'var(--text-muted)';

      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2;
      var label = makeSvg('text', {
        x: mx,
        y: my - 5,
        class: 'local-map-edge-label',
        'text-anchor': 'middle'
      }, svg);
      label.textContent = String(edge.count);
    });

    modules.forEach(function (module) {
      var pos = positions.get(module.name);
      var g = makeSvg('g', {
        class: 'local-map-module-node',
        tabindex: 0,
        role: 'button',
        'aria-label': module.name + ', ' + module.files + ' files'
      }, svg);
      makeSvg('rect', {
        x: pos.x - 92,
        y: pos.y - 31,
        width: 184,
        height: 62,
        rx: 12
      }, g);
      var title = makeSvg('text', {
        x: pos.x,
        y: pos.y - 2,
        'text-anchor': 'middle'
      }, g);
      title.textContent = module.name;
      var meta = makeSvg('text', {
        x: pos.x,
        y: pos.y + 16,
        class: 'local-map-module-meta',
        'text-anchor': 'middle'
      }, g);
      meta.textContent = module.files + ' files · ' + formatNumber(module.lines) + ' lines';

      function select() {
        setModuleFilter(module.name);
        var target = document.getElementById('localMapTreemap');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      g.addEventListener('click', select);
      g.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
    });
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
          openFile(file.path);
          var card = document.getElementById('localMapCard');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      button.addEventListener('click', function () { openFile(item.path); });
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
      function select() { openFile(file.path); }
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
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function chooseSearch(index) {
    if (index < 0 || index >= searchHits.length) return;
    openFile(searchHits[index].file.path);
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
      var description = String(file.description || '').toLowerCase();
      var exportText = file.exports.map(function (item) { return item.name; }).join(' ').toLowerCase();
      var score = 0;
      if (name === query) score = 100;
      else if (name.startsWith(query)) score = 80;
      else if (name.includes(query)) score = 60;
      else if (file.path.toLowerCase().includes(query)) score = 45;
      else if (description.includes(query)) score = 30;
      else if (exportText.includes(query)) score = 20;
      return { file: file, score: score };
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
        if (hit.file.description) {
          var small = document.createElement('small');
          small.textContent = hit.file.description;
          button.appendChild(small);
        }
        button.addEventListener('click', function () { chooseSearch(index); });
        li.appendChild(button);
        results.appendChild(li);
      });
    }

    results.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
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
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = path;
      button.title = path;
      button.addEventListener('click', function () { openFile(path); });
      box.appendChild(button);
    });

    if (paths.length > 12) {
      var more = document.createElement('span');
      more.textContent = '+ ' + (paths.length - 12) + ' more';
      more.style.color = 'var(--text-muted)';
      more.style.fontSize = '10px';
      box.appendChild(more);
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
    meta.textContent = file.lines + ' lines · ' + file.exports.length + ' exports · used by ' + file.usedBy.length;
    card.appendChild(meta);

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

    var relations = document.createElement('div');
    relations.className = 'local-map-relations';
    relations.appendChild(relationColumn('Uses', file.uses));
    relations.appendChild(relationColumn('Used by', file.usedBy));
    card.appendChild(relations);

    if (file.exports.length) {
      var table = document.createElement('table');
      table.className = 'local-map-exports';
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      ['Export', 'Kind', 'Line'].forEach(function (label) {
        var th = document.createElement('th');
        th.textContent = label;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      file.exports.forEach(function (item) {
        var row = document.createElement('tr');
        [item.name, item.kind, String(item.line)].forEach(function (value) {
          var cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      card.appendChild(table);
    }
  }

  renderFacts();
  renderModules();
  renderTreemap();
  renderReadingPath();
  renderScatter();
  renderCard();

  var clear = document.getElementById('localMapClearFilter');
  if (clear) clear.addEventListener('click', function () { setModuleFilter(null); });

  var input = document.getElementById('localMapSearch');
  var results = document.getElementById('localMapResults');
  if (input && results) {
    input.addEventListener('input', renderSearch);
    input.addEventListener('keydown', function (event) {
      if (!results.classList.contains('open')) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!searchHits.length) return;
        searchIndex = (searchIndex + (event.key === 'ArrowDown' ? 1 : -1) + searchHits.length) % searchHits.length;
        results.querySelectorAll('button').forEach(function (button, index) {
          button.setAttribute('aria-selected', index === searchIndex ? 'true' : 'false');
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
