export const HTML_BASE_STYLES = String.raw`
    :root[data-theme="dark"] {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --bg-code: #161b22;
      --border: #30363d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --accent: #58a6ff;
      --accent-subtle: #1f6feb26;
      --success: #3fb950;
      --warning: #d29922;
      --danger: #f85149;
      --heading-1: #e6edf3;
      --heading-2: #58a6ff;
      --heading-3: #79b8ff;
      --code-inline: #e06c75;
      --sidebar-w: 320px;
      --topbar-h: 52px;
    }
    :root[data-theme="light"] {
      --bg-primary: #ffffff;
      --bg-secondary: #f6f8fa;
      --bg-tertiary: #eaeef2;
      --bg-code: #f6f8fa;
      --border: #d0d7de;
      --text-primary: #1f2328;
      --text-secondary: #636c76;
      --text-muted: #848d97;
      --accent: #0969da;
      --accent-subtle: #ddf4ff;
      --success: #1a7f37;
      --warning: #9a6700;
      --danger: #d1242f;
      --heading-1: #1f2328;
      --heading-2: #0969da;
      --heading-3: #0550ae;
      --code-inline: #cf222e;
      --sidebar-w: 320px;
      --topbar-h: 52px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.7;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    /* ─── TOP BAR ─── */
    .topbar {
      position: fixed; top: 0; left: 0; right: 0;
      height: var(--topbar-h);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 12px;
      padding: 0 16px;
      z-index: 1000;
    }
    .topbar-client {
      display: flex; align-items: center; gap: 8px;
      min-width: 0; max-width: 38vw;
      font-weight: 800; font-size: 15px; color: var(--accent);
      text-decoration: none; white-space: nowrap; flex-shrink: 0;
      overflow: hidden; text-overflow: ellipsis;
    }
    .topbar-client::before {
      content: '';
      width: 8px; height: 8px; border-radius: 999px;
      background: var(--accent); box-shadow: 0 0 0 4px var(--accent-subtle);
      flex-shrink: 0;
    }
    .topbar-sep { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }
    .topbar-project {
      font-size: 13px; color: var(--text-secondary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1;
    }
    .topbar-spacer { flex: 1; }

    /* Search */
    .search-wrap { position: relative; width: 260px; flex-shrink: 0; }
    .search-wrap svg.search-icon {
      position: absolute; left: 9px; top: 50%; transform: translateY(-50%);
      color: var(--text-muted); pointer-events: none;
    }
    .search-input {
      width: 100%; padding: 6px 34px 6px 30px;
      background: var(--bg-primary); border: 1px solid var(--border);
      border-radius: 6px; color: var(--text-primary); font-size: 13px; outline: none;
      transition: border-color 0.15s;
    }
    .search-input:focus { border-color: var(--accent); }
    .search-input::placeholder { color: var(--text-muted); }
    .search-kbd {
      position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      font-size: 11px; color: var(--text-muted); border: 1px solid var(--border);
      border-radius: 3px; padding: 1px 5px; pointer-events: none; font-family: monospace;
    }
    .search-dropdown {
      display: none; position: absolute; top: calc(100% + 6px); left: 0; right: 0;
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,.35);
      max-height: 380px; overflow-y: auto; z-index: 2000;
    }
    .search-dropdown.open { display: block; }
    .search-item {
      padding: 10px 14px; cursor: pointer;
      border-bottom: 1px solid var(--border); transition: background .1s;
    }
    .search-item:last-child { border-bottom: none; }
    .search-item:hover { background: var(--bg-tertiary); }
    .search-item-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .search-item-file { font-size: 11px; color: var(--accent); margin-top: 2px; }
    .search-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
    mark { background: rgba(248,231,28,.25); color: inherit; border-radius: 2px; }

    /* Theme toggle */
    .theme-btn {
      display: flex; align-items: center; gap: 5px; padding: 5px 10px;
      background: var(--bg-primary); border: 1px solid var(--border);
      border-radius: 6px; cursor: pointer; font-size: 12px; color: var(--text-secondary);
      transition: border-color .15s, color .15s; flex-shrink: 0; white-space: nowrap;
    }
    .theme-btn:hover { border-color: var(--accent); color: var(--text-primary); }

    /* ─── SIDEBAR ─── */
    .sidebar {
      position: fixed; top: var(--topbar-h); left: 0;
      width: var(--sidebar-w); height: calc(100vh - var(--topbar-h));
      background: var(--bg-secondary); border-right: 1px solid var(--border);
      overflow-y: auto; overflow-x: hidden; padding: 14px 0; z-index: 900;
    }
    .sidebar-shell { padding: 0 10px 16px; }
    .sidebar-head {
      padding: 12px 12px 14px;
      margin: 0 0 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-primary);
    }
    .sidebar-kicker {
      font-size: 10px; font-weight: 800; letter-spacing: .7px;
      text-transform: uppercase; color: var(--text-muted);
    }
    .sidebar-project-name {
      margin-top: 4px;
      color: var(--accent);
      font-size: 14px;
      font-weight: 850;
      line-height: 1.25;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sidebar-subtitle {
      margin-top: 4px;
      color: var(--text-secondary);
      font-size: 11px;
    }
    .sidebar-tools {
      display: grid;
      gap: 8px;
      margin-bottom: 10px;
    }
    .sidebar-filter {
      width: 100%;
      padding: 8px 9px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 12px;
      outline: none;
    }
    .sidebar-filter:focus { border-color: var(--accent); }
    .sidebar-label {
      padding: 0 16px 10px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .7px; color: var(--text-muted);
      border-bottom: 1px solid var(--border); margin-bottom: 8px;
    }
    .sidebar-label.legacy-hidden { display: none; }
    .toc-nav a { color: var(--text-secondary); text-decoration: none; }
    .toc-nav ul { list-style: none; padding: 0 6px; }
    .toc-nav li { margin: 0; position: relative; }
    .toc-nav.smart { padding: 0; }
    .smart-toc-group {
      margin-bottom: 8px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-primary);
      overflow: hidden;
    }
    .smart-toc-group[open] { box-shadow: inset 3px 0 0 var(--accent-subtle); }
    .smart-toc-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      padding: 8px 10px;
      cursor: pointer;
      list-style: none;
      color: var(--text-primary);
      font-size: 12px;
      font-weight: 800;
    }
    .smart-toc-summary::-webkit-details-marker { display: none; }
    .smart-toc-summary::after {
      content: '-';
      margin-left: auto;
      color: var(--text-muted);
      width: 12px;
      text-align: center;
      font-size: 13px;
      font-weight: 850;
      line-height: 1;
      flex-shrink: 0;
    }
    .smart-toc-group:not([open]) .smart-toc-summary::after { content: '+'; }
    .smart-toc-icon {
      width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      border-radius: 5px;
      background: var(--accent-subtle);
      color: var(--accent);
      font-size: 11px;
      flex-shrink: 0;
    }
    .smart-toc-count {
      margin-left: 2px;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 700;
    }
    .smart-toc-items {
      display: grid;
      gap: 1px;
      padding: 0 6px 8px;
    }
    .smart-toc-empty {
      padding: 12px 8px;
      color: var(--text-muted);
      font-size: 11px;
      text-align: center;
    }
    .smart-hidden { display: none !important; }
    .file-tree {
      display: grid;
      gap: 1px;
      padding: 0 2px;
    }
    .file-tree .toc-link.file-link {
      background: transparent;
      color: var(--text-secondary);
      font-size: 11.5px;
      font-weight: 650;
      margin-top: 0;
    }
    .file-tree .toc-link.file-link:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
    .file-tree-folder {
      margin-top: 2px;
    }
    .file-tree-summary {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      padding: 4px 7px;
      border-radius: 6px;
      cursor: pointer;
      list-style: none;
      color: var(--text-secondary);
      font-size: 11.5px;
      font-weight: 700;
    }
    .file-tree-summary::-webkit-details-marker { display: none; }
    .file-tree-summary:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .file-tree-summary::before {
      content: '-';
      display: inline-grid;
      place-items: center;
      width: 12px;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      flex-shrink: 0;
    }
    .file-tree-folder:not([open]) > .file-tree-summary::before { content: '+'; }
    .file-tree-node-icon {
      margin-left: 1px;
      margin-right: 1px;
    }
    .file-tree-folder-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-tree-folder-children {
      display: grid;
      gap: 1px;
      padding-left: 12px;
    }
    .file-tree-file {
      display: grid;
      gap: 1px;
    }

    /* ─── TREE SIDEBAR: 4-level hierarchy ─────────────────────────────────────
       → Level-1  path/path           (file — bold, file icon)
       →→ Level-2  Module             (section — indented, branch line)
       →→→ Level-3  Point             (sub-section — deeper, thinner)
       →→→→ Level-4  Sub-point        (leaf — deepest, muted)
    ─────────────────────────────────────────────────────────────────────────── */

    /* Level-1: file path */
    .toc-link.level-1 {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: 5px;
      text-decoration: none; font-size: 12px; font-weight: 700;
      color: var(--text-primary); line-height: 1.35;
      border-left: 2px solid transparent;
      margin-top: 8px; transition: background .1s, border-color .1s;
      overflow: hidden;
    }
    .toc-link.level-1:first-child { margin-top: 0; }
    .toc-link.level-1::before {
      content: '';
      display: inline-block; flex-shrink: 0;
      width: 13px; height: 13px; border-radius: 2px;
      background: var(--accent); opacity: .7;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpolyline points='14 2 14 8 20 8'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: center; background-size: 10px;
    }
    .toc-link.level-1 .toc-text {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
    }
    .toc-link.level-1:hover { background: var(--bg-tertiary); }

    /* Level-2: module / section — tree branch line */
    .toc-nav li:has(.toc-link.level-2) { padding-left: 10px; }
    .toc-link.level-2 {
      display: flex; align-items: center; gap: 5px;
      padding: 3px 8px 3px 0; text-decoration: none; font-size: 12px;
      color: var(--text-secondary); transition: all .1s; border-radius: 3px;
      position: relative;
    }
    .toc-link.level-2::before {
      content: ''; flex-shrink: 0;
      display: inline-block; width: 14px; height: 1px;
      border-top: 1.5px solid var(--border); border-left: 1.5px solid var(--border);
      border-radius: 0 0 0 3px; margin-bottom: 6px;
      transform: translateY(3px);
    }

    /* Level-3: point — deeper branch */
    .toc-nav li:has(.toc-link.level-3) { padding-left: 22px; }
    .toc-link.level-3 {
      display: flex; align-items: center; gap: 5px;
      padding: 2px 6px 2px 0; text-decoration: none; font-size: 11.5px;
      color: var(--text-secondary); transition: all .1s; border-radius: 3px;
    }
    .toc-link.level-3::before {
      content: ''; flex-shrink: 0;
      display: inline-block; width: 12px; height: 1px;
      border-top: 1px dashed var(--border); border-left: 1px dashed var(--border);
      border-radius: 0 0 0 3px; margin-bottom: 4px;
      transform: translateY(2px);
    }

    /* Level-4: sub-point — leaf */
    .toc-nav li:has(.toc-link.level-4) { padding-left: 34px; }
    .toc-link.level-4 {
      display: flex; align-items: center; gap: 4px;
      padding: 2px 6px 2px 0; text-decoration: none; font-size: 11px;
      color: var(--text-muted); transition: all .1s; border-radius: 3px;
    }
    .toc-link.level-4::before {
      content: '◦'; flex-shrink: 0; font-size: 9px;
      color: var(--text-muted); line-height: 1;
    }

    /* Level-5/6: rarely used */
    .toc-nav li:has(.toc-link.level-5) { padding-left: 44px; }
    .toc-nav li:has(.toc-link.level-6) { padding-left: 54px; }
    .toc-link.level-5, .toc-link.level-6 {
      display: block; padding: 1px 6px; text-decoration: none;
      font-size: 10px; color: var(--text-muted); font-style: italic;
      transition: all .1s; border-radius: 3px;
    }

    .toc-link:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .toc-link.active {
      background: var(--accent-subtle); border-left-color: var(--accent) !important;
      color: var(--accent) !important; font-weight: 600;
    }
    .smart-toc-items .toc-link {
      min-height: 28px;
      padding: 5px 8px;
      border-radius: 6px;
      border-left: 2px solid transparent;
    }
    .smart-toc-items .toc-link::before { display: none; }
    .smart-toc-items .toc-link.level-1 {
      margin-top: 0;
      color: var(--text-primary);
      background: var(--bg-secondary);
    }
    .smart-toc-items .toc-link.level-2,
    .smart-toc-items .toc-link.level-3,
    .smart-toc-items .toc-link.level-4,
    .smart-toc-items .toc-link.level-5,
    .smart-toc-items .toc-link.level-6 {
      padding-left: 8px;
      font-size: 11.5px;
    }
    .smart-toc-items .toc-link.visual-link {
      color: var(--accent);
      background: var(--accent-subtle);
    }
    .smart-toc-items .toc-link.file-link::before {
      display: none;
    }
    .smart-toc-items .toc-link.file-section-link {
      margin-left: 16px;
      color: var(--text-secondary);
      font-size: 11px;
    }
    .smart-toc-items .toc-link.file-section-link::before {
      content: '';
      display: inline-block;
      flex-shrink: 0;
      width: 10px;
      height: 1px;
      border-top: 1px dashed var(--border);
    }
    /* Wrap text in level-1 links so it doesn't overflow */
    .toc-link.level-2 .toc-text,
    .toc-link.level-3 .toc-text,
    .toc-link.level-4 .toc-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ─── MAIN ─── */
    .main {
      margin-left: var(--sidebar-w); margin-top: var(--topbar-h);
      padding: 36px 48px 100px;
      width: calc(100% - var(--sidebar-w));
      max-width: none;
      box-sizing: border-box;
    }

    /* Stats banner */
    .client-heading { margin-bottom: 18px; }
    .client-eyebrow {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .7px; color: var(--text-muted); margin-bottom: 4px;
    }
    .client-name-highlight {
      display: inline-block; font-size: 28px; font-weight: 850;
      line-height: 1.15; color: var(--accent);
      border-bottom: 2px solid var(--accent); padding-bottom: 3px;
    }
    .stats-banner {
      display: flex; gap: 20px; flex-wrap: wrap; align-items: center;
      padding: 14px 20px; background: var(--bg-secondary);
      border: 1px solid var(--border); border-radius: 8px; margin-bottom: 32px;
    }
    .stat-item { display: flex; flex-direction: column; gap: 1px; }
    .stat-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .6px; color: var(--text-muted);
    }
    .stat-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .stat-value.accent { color: var(--accent); }
    .stat-value.generated-date { font-size: 13px; font-weight: 400; color: var(--text-secondary); }
    .generated-stat {
      min-width: 0;
      flex: 1 1 360px;
    }
    .generated-stamp {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      margin-top: 0;
      max-width: 100%;
    }
    .calendar-chip {
      min-width: 0;
      height: 38px;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px;
      border: 1px solid var(--border);
      border-radius: 9px;
      overflow: hidden;
      background: var(--bg-primary);
      box-shadow: 0 8px 22px rgba(9, 105, 218, .08);
      text-align: center;
      flex-shrink: 0;
    }
    .calendar-month {
      display: grid;
      place-items: center;
      min-width: 38px;
      height: 30px;
      padding: 0 8px;
      border: 1px solid var(--accent);
      border-radius: 7px;
      background: var(--accent);
      color: #fff;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: .6px;
      line-height: 1;
    }
    .calendar-day {
      display: grid;
      place-items: center;
      min-width: 34px;
      height: 30px;
      padding: 0 8px;
      border: 1px solid rgba(9, 105, 218, .32);
      border-radius: 7px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 900;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .calendar-year {
      display: grid;
      place-items: center;
      min-width: 48px;
      height: 30px;
      padding: 0 8px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--bg-primary);
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 800;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .digital-clock {
      display: flex;
      align-items: center;
      gap: 2px;
      min-width: 0;
      flex: 0 1 auto;
      padding: 7px 9px;
      border: 1px solid rgba(9, 105, 218, .28);
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(9, 105, 218, .12), rgba(9, 105, 218, .05));
      color: var(--accent);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.16);
    }
    .clock-label {
      color: var(--text-muted);
      font-size: 9px;
      font-weight: 850;
      letter-spacing: .7px;
      text-transform: uppercase;
      line-height: 1;
      white-space: nowrap;
    }
    .clock-value {
      color: var(--accent);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 15px;
      font-weight: 900;
      line-height: 1.25;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      letter-spacing: 0;
    }
    .stat-divider { width: 1px; height: 32px; background: var(--border); align-self: center; }

    .project-tree-visual {
      margin: 14px 0 26px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--bg-secondary);
    }
    .project-tree-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-tertiary);
    }
    .project-tree-title {
      font-size: 13px; font-weight: 800; color: var(--text-primary);
    }
    .project-tree-summary {
      font-size: 11px; font-weight: 600; color: var(--text-secondary);
      white-space: nowrap;
    }
    .project-tree-body {
      max-height: 560px;
      overflow: auto;
      padding: 10px 0;
    }
    .project-tree-row {
      display: flex; align-items: center; gap: 8px;
      min-height: 28px;
      padding: 3px 14px;
      font-size: 12px;
      border-left: 3px solid transparent;
    }
    .project-tree-row:hover { background: var(--bg-tertiary); }
    .project-tree-row.root {
      font-size: 13px; font-weight: 800;
      color: var(--accent);
      border-left-color: var(--accent);
      background: var(--accent-subtle);
    }
    .tree-node-icon {
      width: 14px; height: 14px;
      flex-shrink: 0;
      display: inline-block;
      position: relative;
    }
    .project-tree-row.folder .tree-node-icon,
    .file-tree-node-icon.folder {
      border-radius: 3px;
      background: var(--accent-subtle);
      border: 1px solid var(--accent);
    }
    .project-tree-row.folder .tree-node-icon::before,
    .file-tree-node-icon.folder::before {
      content: '';
      position: absolute; left: 1px; top: -4px;
      width: 7px; height: 4px;
      background: var(--accent-subtle);
      border: 1px solid var(--accent);
      border-bottom: none;
      border-radius: 3px 3px 0 0;
    }
    .project-tree-row.file .tree-node-icon,
    .file-tree-node-icon.file {
      border: 1px solid var(--text-muted);
      border-radius: 2px;
      background: var(--bg-primary);
    }
    .project-tree-row.file .tree-node-icon::before,
    .file-tree-node-icon.file::before {
      content: '';
      position: absolute; right: -1px; top: -1px;
      width: 5px; height: 5px;
      border-left: 1px solid var(--text-muted);
      border-bottom: 1px solid var(--text-muted);
      background: var(--bg-secondary);
    }
    .tree-node-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-primary);
    }
    .project-tree-row.folder .tree-node-name { font-weight: 700; }
    .tree-node-meta {
      margin-left: auto;
      flex-shrink: 0;
      font-size: 10px;
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 1px 7px;
      background: var(--bg-primary);
    }

    .visual-blueprint,
    .d2-panel,
    .whiteboard-panel,
    .dependency-graph-panel {
      margin: 16px 0 30px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--bg-secondary);
    }
    .visual-panel-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-tertiary);
    }
    .visual-panel-title {
      font-size: 13px; font-weight: 800; color: var(--text-primary);
    }
    .visual-panel-meta {
      font-size: 11px; color: var(--text-secondary); white-space: nowrap;
    }
    .visual-panel-actions {
      display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;
    }
    .visual-action-btn {
      display: inline-flex; align-items: center; gap: 5px;
      border: 1px solid var(--border);
      background: var(--bg-primary);
      color: var(--text-secondary);
      border-radius: 5px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
    }
    .visual-action-btn:hover { color: var(--accent); border-color: var(--accent); }
    .architecture-dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      padding: 16px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, var(--bg-secondary), var(--bg-primary));
    }
    .architecture-widget {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: rgba(255, 255, 255, .025);
      padding: 11px 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .08);
    }
    .architecture-widget.modules { border-color: rgba(88, 166, 255, .35); }
    .architecture-widget.routes { border-color: rgba(245, 158, 11, .35); }
    .architecture-widget.files { border-color: rgba(34, 197, 94, .35); }
    .architecture-widget.languages { border-color: rgba(168, 85, 247, .35); }
    .architecture-widget-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .6px;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .architecture-widget-value {
      margin-top: 4px;
      font-size: 22px;
      font-weight: 850;
      color: var(--text-primary);
      line-height: 1;
    }
    .architecture-widget-note {
      margin-top: 6px;
      font-size: 11px;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .architecture-flow {
      display: grid;
      grid-template-columns: 1fr auto 1.2fr auto 1fr auto 1fr;
      align-items: stretch;
      gap: 10px;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }
    .flow-stage {
      min-width: 0;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-primary);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
    }
    .flow-stage-label {
      font-size: 10px; font-weight: 800; letter-spacing: .6px;
      text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;
    }
    .flow-chip {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-primary);
      font-size: 12px;
      padding: 4px 0;
    }
    .flow-arrow {
      align-self: center;
      display: grid;
      place-items: center;
      width: 38px;
      height: 30px;
      color: var(--accent);
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--bg-primary);
    }
    .sketch-arrow-svg {
      width: 28px;
      height: 22px;
      overflow: visible;
      display: block;
      color: currentColor;
      filter: drop-shadow(0 1px 0 rgba(255,255,255,.08));
    }
    .sketch-arrow-svg path {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .sketch-arrow-svg .sketch-arrow-shadow {
      opacity: .38;
      stroke-width: 1;
      transform: translate(.7px, .8px);
    }
    .architecture-chart-panel {
      padding: 14px 16px 16px;
      border-bottom: 1px solid var(--border);
    }
    .architecture-chart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .architecture-chart-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--text-primary);
    }
    .architecture-segmented {
      display: inline-flex;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-primary);
    }
    .architecture-segment {
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 11px;
      font-weight: 750;
      padding: 5px 9px;
    }
    .architecture-segment.active {
      color: var(--text-primary);
      background: var(--bg-tertiary);
      box-shadow: 0 1px 0 rgba(255,255,255,.04);
    }
    :root[data-theme="dark"] .architecture-chart-title,
    :root[data-theme="dark"] .architecture-segment.active,
    :root[data-theme="dark"] .architecture-pie-center-value,
    :root[data-theme="dark"] .architecture-pie-legend-name {
      color: #f8fafc;
    }
    .architecture-chart-body {
      display: block;
    }
    .architecture-pie-panel {
      display: grid;
      grid-template-columns: minmax(170px, 240px) minmax(0, 1fr);
      gap: 16px;
      align-items: center;
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-primary);
      padding: 14px;
    }
    .architecture-pie-wrap {
      position: relative;
      width: min(210px, 100%);
      aspect-ratio: 1;
      margin: 0 auto;
    }
    .architecture-pie-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      display: block;
    }
    .architecture-pie-svg text {
      fill: var(--text-primary);
    }
    .architecture-pie-segment {
      cursor: pointer;
      transition: opacity .15s ease, filter .15s ease, stroke-width .15s ease;
      stroke: var(--bg-primary);
      stroke-width: 1.4;
    }
    .architecture-pie-segment:hover,
    .architecture-pie-segment.active {
      filter: drop-shadow(0 6px 14px rgba(0,0,0,.22));
      stroke-width: 2.2;
    }
    .architecture-pie-segment.dimmed {
      opacity: .35;
    }
    .architecture-pie-center {
      position: absolute;
      inset: 28%;
      display: grid;
      place-items: center;
      align-content: center;
      text-align: center;
      pointer-events: none;
      border-radius: 999px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      color: var(--text-primary);
    }
    .architecture-pie-center-label {
      font-size: 9px;
      font-weight: 850;
      letter-spacing: .6px;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .architecture-pie-center-value {
      margin-top: 2px;
      font-size: 18px;
      font-weight: 900;
      color: var(--text-primary);
      line-height: 1;
    }
    .architecture-pie-legend {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .architecture-pie-legend-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      min-width: 0;
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 5px 6px;
      text-align: left;
    }
    .architecture-pie-legend-item:hover,
    .architecture-pie-legend-item.active {
      border-color: var(--border);
      background: var(--bg-secondary);
    }
    .architecture-pie-legend-item.dimmed {
      opacity: .45;
    }
    .architecture-pie-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 0 3px rgba(88, 166, 255, .12);
    }
    .architecture-pie-legend-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 800;
      color: var(--text-primary);
    }
    .architecture-pie-legend-value {
      font-size: 10px;
      font-weight: 800;
      color: var(--text-secondary);
      white-space: nowrap;
    }
    .architecture-board {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      gap: 0;
      border-bottom: 1px solid var(--border);
    }
    .architecture-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 12px;
      padding: 16px;
    }
    .architecture-card {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-primary);
      padding: 12px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease, opacity .15s ease;
      outline: none;
    }
    .architecture-card:hover,
    .architecture-card.active {
      border-color: var(--accent);
      box-shadow: 0 12px 32px rgba(0, 0, 0, .14);
      transform: translateY(-1px);
    }
    .architecture-card.dimmed {
      opacity: .48;
    }
    .architecture-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 0 999px 999px 0;
      background: var(--accent);
    }
    .architecture-card-head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .architecture-module-name {
      flex: 1 1 170px;
      min-width: 0;
      font-size: 13px; font-weight: 800; color: var(--text-primary);
      overflow-wrap: anywhere;
    }
    .architecture-role {
      flex: 0 0 auto;
      max-width: 100%;
      font-size: 10px; font-weight: 800; color: var(--accent);
      background: var(--accent-subtle);
      border: 1px solid var(--accent);
      border-radius: 999px;
      padding: 1px 7px;
      overflow-wrap: anywhere;
    }
    .role-provider,
    .role-provider::before { --accent: #a855f7; }
    .role-service,
    .role-service::before { --accent: #38bdf8; }
    .role-ui,
    .role-ui::before { --accent: #22c55e; }
    .role-analysis,
    .role-analysis::before { --accent: #f59e0b; }
    .role-configuration,
    .role-configuration::before { --accent: #f97316; }
    .role-assets,
    .role-assets::before { --accent: #ec4899; }
    .role-tests,
    .role-tests::before { --accent: #84cc16; }
    .role-module,
    .role-module::before { --accent: #58a6ff; }
    .architecture-metrics {
      min-width: 0;
      display: flex; gap: 8px; flex-wrap: wrap;
      font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;
    }
    .important-file-list { display: grid; gap: 6px; }
    .important-file-node {
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-secondary);
      padding: 7px 8px;
    }
    .important-file-node.primary {
      border-color: var(--accent);
      background: var(--accent-subtle);
    }
    .important-file-name {
      display: block;
      max-width: 100%;
      font-size: 11px; font-weight: 700; color: var(--text-primary);
      line-height: 1.35;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    .important-file-meta {
      margin-top: 5px;
      display: flex; flex-wrap: wrap; gap: 5px;
    }
    .meta-chip,
    .file-meta-chip {
      display: inline-flex; align-items: center;
      max-width: 100%;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 750;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-chip.language,
    .file-meta-language {
      color: #22c55e;
      background: rgba(34, 197, 94, .11);
      border-color: rgba(34, 197, 94, .35);
    }
    .meta-chip.lines,
    .file-meta-lines {
      color: #38bdf8;
      background: rgba(56, 189, 248, .11);
      border-color: rgba(56, 189, 248, .35);
    }
    .meta-chip.files,
    .meta-chip.links {
      color: #f59e0b;
      background: rgba(245, 158, 11, .12);
      border-color: rgba(245, 158, 11, .35);
    }
    .file-meta-line {
      display: flex; flex-wrap: wrap; gap: 8px;
      margin: -4px 0 18px;
    }
    .file-meta-path {
      min-width: 0;
      max-width: 100%;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border-color: var(--border);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .architecture-edges {
      display: flex; gap: 8px; flex-wrap: wrap;
      padding: 0 16px 16px;
    }
    .architecture-edge {
      font-size: 11px;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      background: var(--bg-primary);
      border-radius: 999px;
      padding: 4px 9px;
      transition: opacity .15s ease, border-color .15s ease, color .15s ease, background .15s ease;
    }
    .architecture-edge.active {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-subtle);
    }
    .architecture-edge.dimmed { opacity: .38; }
    .architecture-details {
      border-left: 1px solid var(--border);
      background: var(--bg-primary);
      padding: 16px;
      min-width: 0;
    }
    .architecture-detail-kicker {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .6px;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .architecture-detail-title {
      margin-top: 4px;
      font-size: 16px;
      font-weight: 850;
      color: var(--text-primary);
      overflow-wrap: anywhere;
    }
    .architecture-detail-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin: 10px 0 12px;
    }
    .architecture-detail-files {
      display: grid;
      gap: 7px;
    }
    .architecture-detail-file {
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--bg-secondary);
      padding: 8px;
      min-width: 0;
    }
    .architecture-detail-file-name {
      font-size: 11px;
      font-weight: 750;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .architecture-detail-file-meta {
      margin-top: 3px;
      font-size: 10px;
      color: var(--text-muted);
    }
    .d2-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, .9fr);
      gap: 0;
    }
    .d2-preview {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 16px;
      border-right: 1px solid var(--border);
    }
    .d2-preview-node {
      border: 1px solid var(--accent);
      border-radius: 8px;
      background: var(--accent-subtle);
      color: var(--text-primary);
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 700;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .d2-preview-arrow { color: var(--accent); font-weight: 800; }
    .d2-source {
      margin: 0;
      border: none;
      border-radius: 0;
      max-height: 360px;
      overflow: auto;
    }
    .whiteboard-canvas {
      padding: 16px;
      background:
        linear-gradient(var(--bg-secondary), var(--bg-secondary)),
        radial-gradient(circle, var(--border) 1px, transparent 1px);
      background-size: auto, 18px 18px;
    }
    .whiteboard-canvas svg {
      width: 100%;
      height: auto;
      min-height: 260px;
      display: block;
    }
    .dependency-graph-body {
      display: grid;
      grid-template-columns: minmax(560px, 1fr) minmax(240px, 300px);
      min-height: clamp(480px, 46vw, 680px);
    }
    .dependency-graph-stage {
      position: relative;
      min-height: clamp(480px, 46vw, 680px);
      overflow: hidden;
      background: var(--bg-primary);
      border-right: 1px solid var(--border);
      touch-action: none;
    }
    .dependency-graph-canvas {
      position: absolute;
      left: 50%;
      top: 50%;
      width: min(920px, calc(100% - 48px));
      height: min(620px, calc(100% - 48px));
      transform-origin: center center;
      transition: transform .12s ease-out;
    }
    .dependency-graph-canvas svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .dependency-edge {
      transition: opacity .15s, stroke-width .15s;
    }
    .dependency-edge.dimmed { opacity: .08 !important; }
    .dependency-edge.active {
      opacity: .72 !important;
      stroke-width: .7;
      color: var(--accent);
    }
    .dependency-node {
      position: absolute;
      transform: translate(-50%, -50%);
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-radius: 7px;
      padding: 7px 9px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(0,0,0,.18);
    }
    .dependency-node:hover,
    .dependency-node.active {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-subtle);
    }
    .dependency-node.dimmed { opacity: .2; }
    .dependency-details {
      padding: 14px;
      overflow: auto;
    }
    .dependency-search {
      width: 100%;
      margin-bottom: 12px;
      padding: 7px 9px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 12px;
    }
    .dependency-detail-title {
      font-size: 13px;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 8px;
      overflow-wrap: anywhere;
    }
    .dependency-detail-line {
      font-size: 11px;
      color: var(--text-secondary);
      margin: 4px 0;
      overflow-wrap: anywhere;
    }
    @media (max-width: 920px) {
      .dependency-graph-body {
        grid-template-columns: 1fr;
      }
      .dependency-graph-stage {
        min-height: 420px;
        border-right: none;
        border-bottom: 1px solid var(--border);
      }
      .dependency-details {
        min-height: 0;
      }
    }
    .code-workflow-panel {
      margin: 16px 0 30px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--bg-secondary);
    }
    .workflow-lanes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      padding: 16px;
      position: relative;
    }
    .workflow-lane {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-primary);
      overflow: hidden;
    }
    .workflow-lane-header {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-tertiary);
    }
    .workflow-lane-title {
      font-size: 12px; font-weight: 800; color: var(--text-primary);
    }
    .workflow-lane-role {
      margin-top: 2px;
      font-size: 10px; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: .5px;
    }
    .workflow-step {
      position: relative;
      margin: 10px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--bg-secondary);
    }
    .workflow-step::before {
      content: attr(data-step-index);
      position: absolute;
      top: -8px;
      left: 10px;
      width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      font-size: 10px;
      font-weight: 800;
    }
    .workflow-step-title {
      margin-top: 3px;
      font-size: 12px;
      font-weight: 800;
      color: var(--text-primary);
    }
    .workflow-step-detail {
      margin-top: 5px;
      font-size: 11px;
      line-height: 1.45;
      color: var(--text-secondary);
    }
    .workflow-file-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }
    .workflow-file {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: var(--bg-primary);
      color: var(--text-muted);
      font-size: 10px;
      padding: 3px 6px;
    }
    .workflow-edge-list {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      padding: 0 16px 16px;
    }
    .workflow-edge {
      font-size: 11px;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      background: var(--bg-primary);
      border-radius: 999px;
      padding: 4px 9px;
    }

    /* Typography — 4-level hierarchy matching sidebar tree */
    /* → h1: file path */
    .main h1 {
      font-size: 22px; font-weight: 800; letter-spacing: -.3px;
      color: var(--heading-1);
      padding: 10px 14px 10px 14px;
      margin: 48px 0 20px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-left: 4px solid var(--accent);
      border-radius: 0 6px 6px 0;
      display: flex; align-items: center; gap: 10px;
    }
    .main h1::before {
      content: '';
      display: inline-block; flex-shrink: 0;
      width: 16px; height: 16px;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2358a6ff' stroke-width='2'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpolyline points='14 2 14 8 20 8'/%3E%3C/svg%3E") no-repeat center;
      background-size: 16px;
    }
    /* →→ h2: module / section */
    .main h2 {
      font-size: 17px; font-weight: 700; color: var(--heading-2);
      margin: 28px 0 10px; padding: 6px 0 6px 12px;
      border-left: 3px solid var(--accent);
      border-bottom: none;
    }
    /* →→→ h3: point under module */
    .main h3 {
      font-size: 14px; font-weight: 600; color: var(--heading-3);
      margin: 18px 0 6px; padding-left: 24px;
      position: relative;
    }
    .main h3::before {
      content: ''; position: absolute; left: 10px; top: 50%;
      width: 8px; height: 1px; background: var(--border);
    }
    /* →→→→ h4: sub-point */
    .main h4 {
      font-size: 13px; font-weight: 600; color: var(--text-secondary);
      margin: 12px 0 4px; padding-left: 36px;
      position: relative;
    }
    .main h4::before {
      content: '◦'; position: absolute; left: 24px;
      color: var(--text-muted); font-size: 10px; top: 2px;
    }
    .main p { margin: 0 0 14px; }
    .main ul, .main ol { margin: 0 0 14px 22px; }
    .main li { margin: 3px 0; }
    .main a { color: var(--accent); text-decoration: none; }
    .main a:hover { text-decoration: underline; }
    .main strong { font-weight: 600; }
    .main hr { border: none; border-top: 2px solid var(--border); margin: 36px 0; }
    .main blockquote {
      margin: 14px 0; padding: 10px 18px;
      border-left: 4px solid var(--accent); background: var(--accent-subtle);
      border-radius: 0 5px 5px 0;
    }
    .main blockquote p { margin: 0; color: var(--text-secondary); }

    /* Inline code */
    .main code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 13px; background: var(--bg-tertiary);
      border: 1px solid var(--border); border-radius: 4px;
      padding: 1px 5px; color: var(--code-inline);
    }

    /* Code blocks */
    .main pre {
      position: relative; margin: 14px 0; border-radius: 8px;
      border: 1px solid var(--border); overflow: hidden;
    }
    .code-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 14px; background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border); font-size: 12px; color: var(--text-muted);
    }
    .copy-btn {
      display: flex; align-items: center; gap: 4px; padding: 3px 8px;
      background: transparent; border: 1px solid var(--border); border-radius: 4px;
      color: var(--text-muted); cursor: pointer; font-size: 12px; transition: all .15s;
    }
    .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
    .copy-btn.done { border-color: var(--success); color: var(--success); }
    .main pre code {
      display: block; padding: 16px 18px; overflow-x: auto;
      font-size: 13px; line-height: 1.6; background: var(--bg-code);
      border: none; border-radius: 0; color: var(--text-primary);
    }

    /* Tables */
    .main table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
    .main th {
      background: var(--bg-tertiary); padding: 9px 13px; text-align: left;
      font-weight: 600; font-size: 11px; text-transform: uppercase;
      letter-spacing: .5px; color: var(--text-secondary); border: 1px solid var(--border);
    }
    .main td { padding: 9px 13px; border: 1px solid var(--border); vertical-align: top; }
    .main tr:nth-child(even) td { background: var(--bg-secondary); }

    /* Heading anchor links */
    .anchor { opacity: 0; margin-left: 6px; color: var(--text-muted); font-size: .8em; text-decoration: none; }
    .main h1:hover .anchor,
    .main h2:hover .anchor,
    .main h3:hover .anchor,
    .main h4:hover .anchor { opacity: 1; }

    /* Back to top */
    .btt {
      position: fixed; bottom: 28px; right: 28px;
      width: 38px; height: 38px; border-radius: 50%;
      background: var(--bg-secondary); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-secondary);
      transition: all .2s; opacity: 0; pointer-events: none; z-index: 500;
    }
    .btt.show { opacity: 1; pointer-events: all; }
    .btt:hover { background: var(--accent); border-color: var(--accent); color: #fff; }

    /* Keyboard hint bar */
    .kb-hints {
      position: fixed; bottom: 28px; left: calc(var(--sidebar-w) + 24px);
      font-size: 11px; color: var(--text-muted);
    }
    kbd {
      display: inline-block; padding: 1px 5px; background: var(--bg-tertiary);
      border: 1px solid var(--border); border-radius: 3px;
      font-family: monospace; font-size: 11px;
    }

    /* Print */
    @media print {
      .topbar, .sidebar, .btt, .kb-hints, .copy-btn { display: none !important; }
      .main { margin: 0; padding: 20px; max-width: 100%; }
      .main pre { white-space: pre-wrap; }
    }

    /* Mobile */
    @media (max-width: 768px) {
      :root,
      :root[data-theme="dark"],
      :root[data-theme="light"] {
        --sidebar-w: 0px;
      }
      .sidebar { display: none; }
      .main { margin-left: 0; padding: 20px 16px 60px; max-width: none; width: auto; }
      .search-wrap { width: auto; flex: 1; }
      .topbar-project { display: none; }
      .architecture-flow,
      .architecture-board,
      .architecture-chart-body,
      .architecture-pie-panel {
        grid-template-columns: 1fr;
      }
      .flow-arrow {
        width: 100%;
        height: 22px;
      }
      .flow-arrow .sketch-arrow-svg {
        transform: rotate(90deg);
      }
      .architecture-details {
        border-left: none;
        border-top: 1px solid var(--border);
      }
    }

    /* Mermaid diagrams */
    .diagram-container { margin: 14px 0; }
    .diagram-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 14px; background: var(--bg-tertiary);
      border: 1px solid var(--border); border-bottom: none;
      border-radius: 8px 8px 0 0; font-size: 11px;
    }
    .diagram-toolbar-title {
      color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
      display: flex; align-items: center; gap: 6px;
    }
    .diagram-toolbar-actions { display: flex; gap: 5px; }
    .diagram-btn {
      display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px;
      border: 1px solid var(--border); border-radius: 4px;
      background: var(--bg-secondary); color: var(--text-secondary);
      font-size: 11px; cursor: pointer; text-decoration: none; transition: all .15s;
    }
    .diagram-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }
    .diagram-btn.done { border-color: var(--success); color: var(--success); }
    .mermaid-wrap {
      padding: 28px 24px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px; overflow-x: auto; text-align: center;
      /* draw.io-style canvas: subtle dot grid */
      background-image:
        radial-gradient(circle, var(--border) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    :root[data-theme="light"] .mermaid-wrap {
      background-color: #fafbfc;
      background-image: radial-gradient(circle, #d0d7de 1px, transparent 1px);
    }
    .mermaid-wrap.toolbar-attached { border-radius: 0 0 8px 8px; margin-top: 0; }
    .mermaid-wrap svg {
      max-width: 100%; height: auto;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,.18));
      border-radius: 4px;
    }
    .mermaid-error {
      font-size: 11px; color: var(--warning); margin-bottom: 8px;
      padding: 4px 8px; background: rgba(204,167,0,.08);
      border-radius: 4px; text-align: left;
    }

    /* Confluence-style callout panels */
    .callout {
      display: flex; gap: 14px; padding: 14px 18px; margin: 16px 0;
      border-radius: 6px; border-left: 4px solid; border-top: 1px solid;
      border-right: 1px solid; border-bottom: 1px solid;
    }
    .callout-icon { font-size: 18px; flex-shrink: 0; line-height: 1.5; }
    .callout-body { flex: 1; min-width: 0; font-size: 14px; }
    .callout-title { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 5px; }
    .callout-info  { background: rgba(88,166,255,.07); border-color: rgba(88,166,255,.35); }
    .callout-info  .callout-title { color: var(--accent); }
    .callout-warning { background: rgba(210,153,34,.07); border-color: rgba(210,153,34,.35); }
    .callout-warning .callout-title { color: var(--warning); }
    .callout-danger { background: rgba(248,81,73,.07); border-color: rgba(248,81,73,.35); }
    .callout-danger .callout-title { color: var(--danger); }
    .callout-tip { background: rgba(63,185,80,.07); border-color: rgba(63,185,80,.35); }
    .callout-tip .callout-title { color: var(--success); }

    /* Status badges */
    .badge {
      display: inline-block; padding: 1px 7px; border-radius: 3px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; vertical-align: middle;
    }
    .badge-stable     { background: rgba(63,185,80,.12);  color: var(--success); border: 1px solid rgba(63,185,80,.3); }
    .badge-beta       { background: rgba(210,153,34,.12); color: var(--warning); border: 1px solid rgba(210,153,34,.3); }
    .badge-experimental { background: rgba(88,166,255,.12); color: var(--accent); border: 1px solid rgba(88,166,255,.3); }
    .badge-deprecated { background: rgba(248,81,73,.12);  color: var(--danger);  border: 1px solid rgba(248,81,73,.3); }

    /* Fullscreen diagram modal */
    .diagram-modal {
      display: none; position: fixed; inset: 0; z-index: 9000;
      background: rgba(0,0,0,.88); align-items: center; justify-content: center;
    }
    .diagram-modal.open { display: flex; }
    .diagram-modal-inner {
      position: relative; max-width: 92vw; max-height: 90vh;
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 12px; padding: 48px 24px 24px; overflow: auto;
    }
    .diagram-modal-close {
      position: absolute; top: 10px; right: 10px;
      background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 5px;
      padding: 4px 10px; cursor: pointer; color: var(--text-secondary);
      font-size: 12px; transition: all .15s; display: flex; align-items: center; gap: 4px;
    }
    .diagram-modal-close:hover { background: var(--danger); border-color: var(--danger); color: #fff; }
    .diagram-modal-inner svg { max-width: 80vw; max-height: 75vh; height: auto; }

    .doc-footer {
      margin-left: var(--sidebar-w);
      padding: 20px 48px 28px;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--border);
      text-align: center;
    }
    .doc-footer-inner {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    }
    .footer-logo-img {
      width: 18px; height: 18px; border-radius: 4px; display: block;
    }
    .doc-footer strong { color: var(--text-secondary); }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* ─── DOCUMINT JELLY UI ───────────────────────────────────────────────
       A soft, floating visual layer that preserves the existing document
       structure and behavior while reducing hard borders and dense surfaces.
    ─────────────────────────────────────────────────────────────────────── */
    :root[data-theme="dark"] {
      --topbar-h: 58px;
      --jelly-surface: rgba(22, 27, 34, .78);
      --jelly-surface-strong: rgba(24, 30, 39, .94);
      --jelly-surface-soft: rgba(255, 255, 255, .035);
      --jelly-surface-hover: rgba(255, 255, 255, .055);
      --jelly-border: rgba(148, 163, 184, .16);
      --jelly-border-accent: rgba(88, 166, 255, .32);
      --jelly-shadow: 0 20px 54px rgba(0, 0, 0, .24);
      --jelly-shadow-soft: 0 8px 26px rgba(0, 0, 0, .16);
      --jelly-highlight: inset 0 1px 0 rgba(255, 255, 255, .055);
      --jelly-glow: rgba(88, 166, 255, .09);
      --jelly-table-row: rgba(255, 255, 255, .024);
    }

    :root[data-theme="light"] {
      --topbar-h: 58px;
      --jelly-surface: rgba(255, 255, 255, .82);
      --jelly-surface-strong: rgba(255, 255, 255, .96);
      --jelly-surface-soft: rgba(9, 105, 218, .035);
      --jelly-surface-hover: rgba(9, 105, 218, .055);
      --jelly-border: rgba(71, 85, 105, .14);
      --jelly-border-accent: rgba(9, 105, 218, .24);
      --jelly-shadow: 0 18px 48px rgba(15, 23, 42, .10);
      --jelly-shadow-soft: 0 8px 24px rgba(15, 23, 42, .075);
      --jelly-highlight: inset 0 1px 0 rgba(255, 255, 255, .9);
      --jelly-glow: rgba(9, 105, 218, .075);
      --jelly-table-row: rgba(15, 23, 42, .018);
    }

    .documint-jelly-ui {
      background:
        radial-gradient(circle at 9% 8%, var(--jelly-glow), transparent 24rem),
        radial-gradient(circle at 92% 24%, var(--jelly-glow), transparent 28rem),
        var(--bg-primary);
      letter-spacing: -.005em;
    }

    .documint-jelly-ui::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      background:
        linear-gradient(135deg, transparent 0 36%, var(--jelly-surface-soft) 58%, transparent 78%);
      opacity: .75;
    }

    .documint-jelly-ui .topbar {
      top: 10px;
      left: 12px;
      right: 12px;
      height: var(--topbar-h);
      padding: 0 16px;
      border: 1px solid var(--jelly-border);
      border-radius: 18px;
      background: var(--jelly-surface);
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
      backdrop-filter: blur(18px) saturate(1.12);
      -webkit-backdrop-filter: blur(18px) saturate(1.12);
    }

    .documint-jelly-ui .topbar-client {
      padding: 6px 10px 6px 8px;
      border-radius: 10px;
      transition: background .16s ease, transform .16s ease;
    }

    .documint-jelly-ui .topbar-client:hover {
      background: var(--jelly-surface-hover);
      text-decoration: none;
      transform: translateY(-1px);
    }

    .documint-jelly-ui .topbar-client::before {
      width: 9px;
      height: 9px;
      box-shadow: 0 0 0 5px var(--accent-subtle);
    }

    .documint-jelly-ui .topbar-sep {
      opacity: .65;
    }

    .documint-jelly-ui .search-wrap {
      width: min(300px, 32vw);
    }

    .documint-jelly-ui .search-input,
    .documint-jelly-ui .sidebar-filter,
    .documint-jelly-ui .dependency-search {
      border-color: var(--jelly-border);
      border-radius: 12px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-highlight);
      transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
    }

    .documint-jelly-ui .search-input:focus,
    .documint-jelly-ui .sidebar-filter:focus,
    .documint-jelly-ui .dependency-search:focus {
      border-color: var(--jelly-border-accent);
      box-shadow: 0 0 0 3px var(--accent-subtle), var(--jelly-highlight);
    }

    .documint-jelly-ui .search-dropdown {
      margin-top: 4px;
      border-color: var(--jelly-border);
      border-radius: 16px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-shadow);
      overflow: hidden;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    .documint-jelly-ui .search-item {
      border-bottom-color: var(--jelly-border);
      transition: background .14s ease, padding-left .14s ease;
    }

    .documint-jelly-ui .search-item:hover {
      background: var(--jelly-surface-hover);
      padding-left: 17px;
    }

    .documint-jelly-ui .theme-btn,
    .documint-jelly-ui .diagram-btn,
    .documint-jelly-ui .visual-action-btn,
    .documint-jelly-ui .copy-btn {
      border-color: var(--jelly-border);
      border-radius: 11px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-highlight);
      transition:
        transform .16s ease,
        border-color .16s ease,
        background .16s ease,
        color .16s ease,
        box-shadow .16s ease;
    }

    .documint-jelly-ui .theme-btn:hover,
    .documint-jelly-ui .diagram-btn:hover,
    .documint-jelly-ui .visual-action-btn:hover,
    .documint-jelly-ui .copy-btn:hover {
      transform: translateY(-1px);
      border-color: var(--jelly-border-accent);
      background: var(--jelly-surface-hover);
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
    }

    /* Professional soft sidebar: keep the strong 1.0.4 navigation geometry,
       while using the softer 1.0.5 surface language. */
    .documint-jelly-ui .sidebar {
      top: 78px;
      bottom: 0;
      left: 0;
      width: var(--sidebar-w);
      height: auto;
      padding: 14px 0 20px;
      border: 0;
      border-right: 1px solid var(--jelly-border);
      border-radius: 0;
      background:
        linear-gradient(180deg, var(--jelly-surface-strong), var(--jelly-surface));
      box-shadow:
        12px 0 34px rgba(0, 0, 0, .08),
        var(--jelly-highlight);
      backdrop-filter: blur(18px) saturate(1.06);
      -webkit-backdrop-filter: blur(18px) saturate(1.06);
    }

    .documint-jelly-ui .sidebar-shell {
      padding: 0 12px 22px;
    }

    .documint-jelly-ui .sidebar-head {
      padding: 13px 13px 14px;
      margin: 0 0 11px;
      border: 1px solid var(--jelly-border);
      border-radius: 12px;
      background:
        linear-gradient(145deg, var(--jelly-surface-strong), var(--jelly-surface-soft));
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .sidebar-kicker {
      letter-spacing: .78px;
    }

    .documint-jelly-ui .sidebar-project-name {
      margin-top: 5px;
      font-size: 14px;
      letter-spacing: -.01em;
    }

    .documint-jelly-ui .sidebar-subtitle {
      margin-top: 5px;
      line-height: 1.4;
    }

    .documint-jelly-ui .sidebar-filter {
      min-height: 34px;
      border-radius: 9px;
      background: var(--jelly-surface-strong);
    }

    .documint-jelly-ui .smart-toc-group {
      margin-bottom: 8px;
      border: 1px solid var(--jelly-border);
      border-radius: 11px;
      background: color-mix(in srgb, var(--jelly-surface-strong) 66%, transparent);
      box-shadow: var(--jelly-highlight);
      overflow: hidden;
      transition:
        border-color .16s ease,
        background .16s ease,
        box-shadow .16s ease;
    }

    .documint-jelly-ui .smart-toc-group:hover {
      border-color: color-mix(in srgb, var(--jelly-border-accent) 58%, var(--jelly-border));
      background: var(--jelly-surface-soft);
    }

    .documint-jelly-ui .smart-toc-group[open] {
      border-color: var(--jelly-border-accent);
      background: var(--jelly-surface-soft);
      box-shadow:
        inset 3px 0 0 var(--accent),
        var(--jelly-highlight);
    }

    .documint-jelly-ui .smart-toc-summary {
      min-height: 37px;
      padding: 8px 10px;
      border-radius: 0;
      letter-spacing: -.005em;
    }

    .documint-jelly-ui .file-tree-summary,
    .documint-jelly-ui .smart-toc-items .toc-link {
      border-radius: 7px;
      transition:
        background .14s ease,
        color .14s ease,
        border-color .14s ease;
    }

    .documint-jelly-ui .smart-toc-summary:hover,
    .documint-jelly-ui .file-tree-summary:hover,
    .documint-jelly-ui .smart-toc-items .toc-link:hover {
      background: var(--jelly-surface-hover);
    }

    .documint-jelly-ui .smart-toc-items {
      padding: 0 7px 8px;
    }

    .documint-jelly-ui .smart-toc-items .toc-link.active,
    .documint-jelly-ui .toc-link.active {
      background: linear-gradient(90deg, var(--accent-subtle), transparent 92%);
      border-left-color: var(--accent) !important;
      box-shadow: none;
    }

    .documint-jelly-ui .smart-toc-icon {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .smart-toc-count {
      border-color: var(--jelly-border);
      background: var(--jelly-surface-strong);
    }

    .documint-jelly-ui .file-tree {
      padding: 0 1px;
    }

    .documint-jelly-ui .file-tree-folder-children {
      border-left: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
      margin-left: 8px;
      padding-left: 10px;
    }

    .documint-jelly-ui .main {
      margin-left: var(--sidebar-w);
      margin-top: calc(var(--topbar-h) + 32px);
      width: calc(100% - var(--sidebar-w));
      padding: 30px clamp(28px, 4vw, 58px) 110px;
    }

    .documint-jelly-ui .main p,
    .documint-jelly-ui .main > ul,
    .documint-jelly-ui .main > ol,
    .documint-jelly-ui .main blockquote {
      max-width: 105ch;
    }

    .documint-jelly-ui .client-heading {
      margin-bottom: 22px;
    }

    .documint-jelly-ui .client-name-highlight {
      padding-bottom: 5px;
      font-size: clamp(27px, 3vw, 36px);
      letter-spacing: -.035em;
      border-bottom: 0;
      background: linear-gradient(135deg, var(--text-primary), var(--accent));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .documint-jelly-ui .stats-banner,
    .documint-jelly-ui .project-tree-visual,
    .documint-jelly-ui .visual-blueprint,
    .documint-jelly-ui .d2-panel,
    .documint-jelly-ui .whiteboard-panel,
    .documint-jelly-ui .dependency-graph-panel,
    .documint-jelly-ui .code-workflow-panel {
      border-color: var(--jelly-border);
      border-radius: 18px;
      background:
        linear-gradient(145deg, var(--jelly-surface), var(--jelly-surface-soft));
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
    }

    .documint-jelly-ui .stats-banner {
      gap: 14px;
      padding: 15px 18px;
      margin-bottom: 34px;
    }

    /* Keep the 1.0.4 module-scale pie chart prominent inside the soft UI.
       The chart is source-derived and must remain visible in both AI and Local output. */
    .documint-jelly-ui .architecture-chart-panel {
      display: block;
      padding: 18px;
      background: transparent;
    }

    .documint-jelly-ui .architecture-chart-head {
      margin-bottom: 14px;
    }

    .documint-jelly-ui .architecture-chart-title {
      font-size: 13px;
      letter-spacing: -.01em;
    }

    .documint-jelly-ui .architecture-segmented {
      border-color: var(--jelly-border);
      border-radius: 10px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .architecture-segment {
      border-radius: 8px;
    }

    .documint-jelly-ui .architecture-segment.active {
      background: var(--jelly-surface-hover);
      box-shadow: inset 0 0 0 1px var(--jelly-border-accent);
    }

    .documint-jelly-ui .architecture-pie-panel {
      display: grid;
      grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
      gap: 20px;
      align-items: center;
      min-height: 250px;
      border-color: var(--jelly-border);
      border-radius: 16px;
      background:
        linear-gradient(145deg, var(--jelly-surface-strong), var(--jelly-surface-soft));
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
      padding: 18px;
    }

    .documint-jelly-ui .architecture-pie-wrap {
      width: min(220px, 100%);
    }

    .documint-jelly-ui .architecture-pie-center {
      border-color: var(--jelly-border);
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .architecture-pie-legend-item {
      min-height: 32px;
      border-radius: 9px;
      transition:
        border-color .14s ease,
        background .14s ease,
        transform .14s ease,
        opacity .14s ease;
    }

    .documint-jelly-ui .architecture-pie-legend-item:hover,
    .documint-jelly-ui .architecture-pie-legend-item.active {
      border-color: var(--jelly-border-accent);
      background: var(--jelly-surface-hover);
      transform: translateX(2px);
    }

    .documint-jelly-ui .stat-item {
      min-width: 88px;
      padding: 5px 8px;
      border-radius: 10px;
    }

    .documint-jelly-ui .stat-value {
      letter-spacing: -.02em;
    }

    .documint-jelly-ui .calendar-chip,
    .documint-jelly-ui .digital-clock {
      border-color: var(--jelly-border);
      border-radius: 12px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .project-tree-header,
    .documint-jelly-ui .visual-panel-header {
      padding: 13px 16px;
      border-bottom-color: var(--jelly-border);
      background: var(--jelly-surface-soft);
    }

    .documint-jelly-ui .project-tree-row {
      margin: 1px 7px;
      padding: 5px 10px;
      border-radius: 9px;
      border-left: 0;
      transition: background .14s ease, transform .14s ease;
    }

    .documint-jelly-ui .project-tree-row:hover {
      background: var(--jelly-surface-hover);
      transform: translateX(2px);
    }

    .documint-jelly-ui .project-tree-row.root {
      background: var(--accent-subtle);
      box-shadow: inset 0 0 0 1px var(--jelly-border-accent);
    }

    .documint-jelly-ui .architecture-widget,
    .documint-jelly-ui .architecture-card,
    .documint-jelly-ui .flow-stage,
    .documint-jelly-ui .important-file-node,
    .documint-jelly-ui .architecture-detail-file,
    .documint-jelly-ui .d2-preview-node {
      border-color: var(--jelly-border);
      border-radius: 14px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .architecture-widget {
      padding: 13px 14px;
    }

    .documint-jelly-ui .architecture-card {
      padding: 14px;
      transition:
        transform .16s ease,
        border-color .16s ease,
        box-shadow .16s ease,
        opacity .16s ease;
    }

    .documint-jelly-ui .architecture-card:hover,
    .documint-jelly-ui .architecture-card.active {
      transform: translateY(-2px);
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
    }

    .documint-jelly-ui .architecture-pie-panel,
    .documint-jelly-ui .architecture-details,
    .documint-jelly-ui .dependency-details {
      background: var(--jelly-surface-soft);
    }

    .documint-jelly-ui .architecture-pie-panel,
    .documint-jelly-ui .architecture-segmented,
    .documint-jelly-ui .architecture-edge,
    .documint-jelly-ui .workflow-edge,
    .documint-jelly-ui .meta-chip,
    .documint-jelly-ui .file-meta-chip {
      border-color: var(--jelly-border);
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .main h1 {
      margin: 50px 0 22px;
      padding: 14px 17px;
      border: 1px solid var(--jelly-border);
      border-left: 3px solid var(--accent);
      border-radius: 16px;
      background:
        linear-gradient(135deg, var(--jelly-surface), var(--jelly-surface-soft));
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
      letter-spacing: -.025em;
    }

    .documint-jelly-ui .main h2 {
      margin: 34px 0 13px;
      padding: 7px 0 7px 14px;
      border-left-width: 3px;
      letter-spacing: -.015em;
    }

    .documint-jelly-ui .main h3 {
      margin-top: 22px;
    }

    .documint-jelly-ui .main hr {
      margin: 42px 0;
      border-top: 1px solid var(--jelly-border);
    }

    .documint-jelly-ui .main blockquote,
    .documint-jelly-ui .callout {
      border-color: var(--jelly-border);
      border-left-color: var(--accent);
      border-radius: 14px;
      background: var(--jelly-surface-soft);
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .main pre {
      border-color: var(--jelly-border);
      border-radius: 15px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
    }

    .documint-jelly-ui .code-bar {
      padding: 8px 14px;
      border-bottom-color: var(--jelly-border);
      background: var(--jelly-surface-soft);
    }

    .documint-jelly-ui .main pre code {
      padding: 18px 20px;
      background: transparent;
    }

    .documint-jelly-ui .main table {
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border: 1px solid var(--jelly-border);
      border-radius: 14px;
      background: var(--jelly-surface);
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
    }

    .documint-jelly-ui .main th {
      border: 0;
      border-right: 1px solid var(--jelly-border);
      border-bottom: 1px solid var(--jelly-border);
      background: var(--jelly-surface-soft);
    }

    .documint-jelly-ui .main td {
      border: 0;
      border-right: 1px solid var(--jelly-border);
      border-bottom: 1px solid var(--jelly-border);
    }

    .documint-jelly-ui .main tr:last-child td {
      border-bottom: 0;
    }

    .documint-jelly-ui .main th:last-child,
    .documint-jelly-ui .main td:last-child {
      border-right: 0;
    }

    .documint-jelly-ui .main tr:nth-child(even) td {
      background: var(--jelly-table-row);
    }

    .documint-jelly-ui .main tbody tr {
      transition: background .14s ease;
    }

    .documint-jelly-ui .main tbody tr:hover td {
      background: var(--jelly-surface-hover);
    }

    .documint-jelly-ui .diagram-toolbar {
      padding: 9px 13px;
      border-color: var(--jelly-border);
      border-radius: 14px 14px 0 0;
      background: var(--jelly-surface-soft);
    }

    .documint-jelly-ui .mermaid-wrap {
      padding: 30px 24px;
      border-color: var(--jelly-border);
      border-radius: 15px;
      background-color: var(--jelly-surface);
      background-image: radial-gradient(circle, var(--jelly-border) .8px, transparent .8px);
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .mermaid-wrap.toolbar-attached {
      border-radius: 0 0 15px 15px;
    }

    .documint-jelly-ui .dependency-node {
      border-color: var(--jelly-border);
      border-radius: 12px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
      transition:
        transform .14s ease,
        opacity .14s ease,
        border-color .14s ease,
        background .14s ease;
    }

    .documint-jelly-ui .dependency-node:hover,
    .documint-jelly-ui .dependency-node.active {
      transform: translate(-50%, calc(-50% - 2px));
      border-color: var(--jelly-border-accent);
    }

    .documint-jelly-ui .diagram-modal {
      background: rgba(5, 10, 18, .78);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .documint-jelly-ui .diagram-modal-inner {
      border-color: var(--jelly-border);
      border-radius: 22px;
      background: var(--jelly-surface-strong);
      box-shadow: var(--jelly-shadow), var(--jelly-highlight);
    }

    .documint-jelly-ui .btt {
      width: 42px;
      height: 42px;
      bottom: 22px;
      right: 22px;
      border-color: var(--jelly-border);
      background: var(--jelly-surface);
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .documint-jelly-ui .doc-footer {
      margin-left: calc(var(--sidebar-w) + 28px);
      border-top: 0;
      padding: 16px 42px 30px;
    }

    .documint-jelly-ui :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }

    .documint-jelly-ui ::selection {
      background: var(--accent-subtle);
      color: var(--text-primary);
    }

    .documint-jelly-ui ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .documint-jelly-ui ::-webkit-scrollbar-thumb {
      border: 2px solid transparent;
      border-radius: 999px;
      background: color-mix(in srgb, var(--text-muted) 58%, transparent);
      background-clip: padding-box;
    }

    .documint-jelly-ui ::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--accent) 58%, transparent);
      background-clip: padding-box;
    }

    @media (max-width: 920px) {
      .documint-jelly-ui .topbar {
        left: 8px;
        right: 8px;
      }

      .documint-jelly-ui .sidebar {
        left: 0;
      }

      .documint-jelly-ui .main {
        padding-left: 24px;
        padding-right: 24px;
      }
    }

    @media (max-width: 768px) {
      .documint-jelly-ui .topbar {
        top: 8px;
        left: 8px;
        right: 8px;
        padding: 0 10px;
        border-radius: 15px;
      }

      .documint-jelly-ui .sidebar {
        display: none;
      }

      .documint-jelly-ui .main {
        margin-left: 0;
        margin-top: calc(var(--topbar-h) + 24px);
        width: auto;
        padding: 20px 14px 64px;
      }

      .documint-jelly-ui .search-wrap {
        width: auto;
      }

      .documint-jelly-ui .stats-banner,
      .documint-jelly-ui .project-tree-visual,
      .documint-jelly-ui .visual-blueprint,
      .documint-jelly-ui .d2-panel,
      .documint-jelly-ui .whiteboard-panel,
      .documint-jelly-ui .dependency-graph-panel,
      .documint-jelly-ui .code-workflow-panel,
      .documint-jelly-ui .main h1 {
        border-radius: 15px;
      }

      .documint-jelly-ui .architecture-pie-panel {
        grid-template-columns: 1fr;
      }

      .documint-jelly-ui .main table {
        display: block;
        overflow-x: auto;
        white-space: normal;
      }

      .documint-jelly-ui .doc-footer {
        margin-left: 0;
        padding-left: 16px;
        padding-right: 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .documint-jelly-ui *,
      .documint-jelly-ui *::before,
      .documint-jelly-ui *::after {
        scroll-behavior: auto !important;
        transition-duration: .001ms !important;
        animation-duration: .001ms !important;
        animation-iteration-count: 1 !important;
      }
    }
    `;
