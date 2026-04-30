export interface HtmlTemplateOptions {
  title: string;
  tocHtml: string;
  contentHtml: string;
  projectName: string;
  fileCount: number;
  generationDate: string;
  languages?: string[];
  totalLines?: number;
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateHtmlTemplate(options: HtmlTemplateOptions): string {
  const safeTitle = escapeHtmlAttr(options.title);
  const safeDate = escapeHtmlAttr(options.generationDate);

  const languagesStr = options.languages?.length
    ? options.languages.join(", ")
    : "Mixed";

  const totalLinesStr = options.totalLines
    ? options.totalLines.toLocaleString()
    : null;

  const statsDivider = '<div class="stat-divider"></div>';

  const statsHtml = [
    `<div class="stat-item"><span class="stat-label">Files</span><span class="stat-value accent">${options.fileCount}</span></div>`,
    statsDivider,
    `<div class="stat-item"><span class="stat-label">Languages</span><span class="stat-value">${languagesStr}</span></div>`,
    totalLinesStr
      ? statsDivider +
        `<div class="stat-item"><span class="stat-label">Lines of Code</span><span class="stat-value">${totalLinesStr}</span></div>`
      : "",
    statsDivider,
    `<div class="stat-item"><span class="stat-label">Generated</span><span class="stat-value generated-date">${safeDate}</span></div>`,
  ].join("");

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="AI Documentation Generator">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" id="hljs-theme">
  <style>
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
      --sidebar-w: 280px;
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
      --sidebar-w: 280px;
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
    .topbar-logo {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: 15px; color: var(--text-primary);
      text-decoration: none; white-space: nowrap; flex-shrink: 0;
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
      overflow-y: auto; overflow-x: hidden; padding: 16px 0; z-index: 900;
    }
    .sidebar-label {
      padding: 0 16px 10px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .7px; color: var(--text-muted);
      border-bottom: 1px solid var(--border); margin-bottom: 8px;
    }
    .toc-nav ul { list-style: none; padding: 0 6px; }
    .toc-nav li { margin: 0; position: relative; }

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
    /* Wrap text in level-1 links so it doesn't overflow */
    .toc-link.level-2 .toc-text,
    .toc-link.level-3 .toc-text,
    .toc-link.level-4 .toc-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ─── MAIN ─── */
    .main {
      margin-left: var(--sidebar-w); margin-top: var(--topbar-h);
      padding: 36px 48px 100px; max-width: 960px;
    }

    /* Stats banner */
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
    .stat-divider { width: 1px; height: 32px; background: var(--border); align-self: center; }

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
      :root { --sidebar-w: 0px; }
      .sidebar { display: none; }
      .main { padding: 20px 16px 60px; }
      .search-wrap { width: auto; flex: 1; }
      .topbar-project { display: none; }
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

    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  </style>
</head>
<body>

  <nav class="topbar">
    <a class="topbar-logo" href="#">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      DocuMint
    </a>
    <div class="topbar-sep"></div>
    <span class="topbar-project">${options.projectName}</span>
    <div class="topbar-spacer"></div>

    <div class="search-wrap">
      <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" class="search-input" id="searchInput" placeholder="Search docs..." autocomplete="off" spellcheck="false">
      <span class="search-kbd">/</span>
      <div class="search-dropdown" id="searchDropdown"></div>
    </div>

    <button class="theme-btn" id="themeBtn">
      <svg id="themeIcon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <span id="themeLabel">Light</span>
    </button>
  </nav>

  <aside class="sidebar">
    <div class="sidebar-label">Contents</div>
    <nav class="toc-nav">${options.tocHtml}</nav>
  </aside>

  <main class="main" id="mainContent">
    <div class="stats-banner">${statsHtml}</div>
    ${options.contentHtml}
  </main>

  <!-- Fullscreen diagram modal -->
  <div class="diagram-modal" id="diagramModal">
    <div class="diagram-modal-inner" id="diagramModalInner">
      <button class="diagram-modal-close" id="diagramModalClose">✕ Close</button>
      <div id="diagramModalContent"></div>
    </div>
  </div>

  <button class="btt" id="btt" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Back to top">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  </button>

  <div class="kb-hints"><kbd>/</kbd> Search &nbsp; <kbd>T</kbd> Theme</div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.0/mermaid.min.js"></script>
  <script>
  (function () {
    'use strict';

    // ── Mermaid diagrams — draw.io-inspired theme ─────────────────────────────
    function mermaidConfig(isDark) {
      // Neutral/base theme with draw.io-like variable overrides
      return {
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif',
        fontSize: 13,
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'orthogonal', padding: 18 },
        sequence:  { useMaxWidth: true, boxMargin: 10, messageMargin: 40 },
        er:        { useMaxWidth: true },
        themeVariables: isDark ? {
          // draw.io dark: charcoal nodes, blue accents
          background:        '#1e2124',
          primaryColor:      '#2d3748',
          primaryBorderColor:'#4a6fa5',
          primaryTextColor:  '#e2e8f0',
          secondaryColor:    '#374151',
          secondaryBorderColor:'#6b7280',
          secondaryTextColor:'#d1d5db',
          tertiaryColor:     '#252d3d',
          tertiaryBorderColor:'#4a6fa5',
          tertiaryTextColor: '#93c5fd',
          noteBkgColor:      '#1e3a5f',
          noteTextColor:     '#bfdbfe',
          edgeLabelBackground:'#1e2124',
          lineColor:         '#6b7280',
          titleColor:        '#93c5fd',
          clusterBkg:        '#252d3d',
          clusterBorder:     '#4a6fa5',
          fillType0: '#2d3748', fillType1: '#1e3a5f', fillType2: '#374151',
          fillType3: '#1a3a2a', fillType4: '#2d1b2e', fillType5: '#3d2020',
        } : {
          // draw.io light: white nodes, blue borders, clean
          background:        '#ffffff',
          primaryColor:      '#dae8fc',
          primaryBorderColor:'#6c8ebf',
          primaryTextColor:  '#1a1a2e',
          secondaryColor:    '#d5e8d4',
          secondaryBorderColor:'#82b366',
          secondaryTextColor:'#1a1a2e',
          tertiaryColor:     '#fff2cc',
          tertiaryBorderColor:'#d6b656',
          tertiaryTextColor: '#1a1a2e',
          noteBkgColor:      '#fff2cc',
          noteTextColor:     '#1a1a2e',
          edgeLabelBackground:'#ffffff',
          lineColor:         '#6c8ebf',
          titleColor:        '#1a1a2e',
          clusterBkg:        '#f5f5f5',
          clusterBorder:     '#999999',
          fillType0: '#dae8fc', fillType1: '#d5e8d4', fillType2: '#fff2cc',
          fillType3: '#f8cecc', fillType4: '#e1d5e7', fillType5: '#dae8fc',
        },
      };
    }

    // Render a single mermaid source string into wrap.
    // Passes a hidden sandbox as the third arg to mermaid.render() so Mermaid
    // never appends anything to document.body (which caused the "error in text"
    // block visible at the bottom of the page).
    async function renderOneDiagram(wrap, src, uid, index) {
      var sandbox = document.createElement('div');
      sandbox.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;';
      document.body.appendChild(sandbox);
      try {
        var result = await mermaid.render(uid, src, sandbox);
        wrap.innerHTML = result.svg;
        addDiagramToolbar(wrap, src, index);
      } catch (err) {
        var badge = document.createElement('div');
        badge.className = 'mermaid-error';
        badge.textContent = 'Diagram syntax error — showing source';
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        code.textContent = src;
        pre.appendChild(code);
        wrap.appendChild(badge);
        wrap.appendChild(pre);
      } finally {
        sandbox.remove();
      }
    }

    // ── Diagram toolbar (draw.io / SVG export / fullscreen) ───────────────────
    function addDiagramToolbar(wrap, src, index) {
      var container = document.createElement('div');
      container.className = 'diagram-container';

      var toolbar = document.createElement('div');
      toolbar.className = 'diagram-toolbar';

      var titleEl = document.createElement('span');
      titleEl.className = 'diagram-toolbar-title';
      titleEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> Diagram';
      toolbar.appendChild(titleEl);

      var actions = document.createElement('div');
      actions.className = 'diagram-toolbar-actions';

      // Download SVG
      var svgBtn = makeToolbarBtn('⬇ SVG', 'Download as SVG');
      svgBtn.addEventListener('click', function () {
        var svg = wrap.querySelector('svg');
        if (!svg) return;
        var blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
        triggerDownload(blob, 'diagram-' + index + '.svg');
      });
      actions.appendChild(svgBtn);

      // Export .drawio
      var drawioBtn = makeToolbarBtn('↗ draw.io', 'Export as .drawio file (open in draw.io / diagrams.net)');
      drawioBtn.addEventListener('click', function () { exportToDrawio(src, index); });
      actions.appendChild(drawioBtn);

      // Copy Mermaid source
      var cpBtn = makeToolbarBtn('📋 Source', 'Copy Mermaid source (paste into draw.io · tldraw · Confluence)');
      cpBtn.addEventListener('click', function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(src).then(function () {
          cpBtn.innerHTML = '✓ Copied!';
          cpBtn.classList.add('done');
          setTimeout(function () { cpBtn.innerHTML = '📋 Source'; cpBtn.classList.remove('done'); }, 2000);
        });
      });
      actions.appendChild(cpBtn);

      // Fullscreen
      var fsBtn = makeToolbarBtn('⛶ Full', 'View fullscreen');
      fsBtn.addEventListener('click', function () { openDiagramModal(wrap); });
      actions.appendChild(fsBtn);

      toolbar.appendChild(actions);
      wrap.classList.add('toolbar-attached');

      wrap.parentNode.insertBefore(container, wrap);
      container.appendChild(toolbar);
      container.appendChild(wrap);
    }

    function makeToolbarBtn(label, title) {
      var btn = document.createElement('button');
      btn.className = 'diagram-btn';
      btn.innerHTML = label;
      btn.title = title || label;
      return btn;
    }

    function triggerDownload(blob, filename) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function exportToDrawio(mermaidSrc, index) {
      // draw.io XML with mermaid source as a mermaid-shape cell
      var esc = mermaidSrc
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      var xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<mxfile host="app.diagrams.net">\n' +
        '  <diagram name="Diagram">\n' +
        '    <mxGraphModel><root>\n' +
        '      <mxCell id="0"/><mxCell id="1" parent="0"/>\n' +
        '      <mxCell id="2" value="&lt;mermaid&gt;' + esc + '&lt;/mermaid&gt;" ' +
        'style="shape=mxgraph.mermaid.general;whiteSpace=wrap;html=1;" ' +
        'vertex="1" parent="1">' +
        '<mxGeometry x="40" y="40" width="640" height="480" as="geometry"/>' +
        '</mxCell>\n    </root></mxGraphModel>\n  </diagram>\n</mxfile>';
      var blob = new Blob([xml], { type: 'application/xml' });
      triggerDownload(blob, 'diagram-' + index + '.drawio');
    }

    function openDiagramModal(wrap) {
      var modal = document.getElementById('diagramModal');
      var content = document.getElementById('diagramModalContent');
      var svg = wrap.querySelector('svg');
      if (!modal || !content || !svg) return;
      content.innerHTML = svg.outerHTML;
      modal.classList.add('open');
    }

    // ── Confluence-style callout panels ───────────────────────────────────────
    function enhanceCallouts() {
      var PATTERNS = [
        { re: /^(⚠️\s*\*?\*?DANGER\*?\*?:?|⚠️\s*\[DANGER\]:?|\*\*\[DANGER\]\*\*:?)/i,  type: 'danger',  icon: '🚫', label: 'DANGER' },
        { re: /^(⚠️\s*\*?\*?WARNING\*?\*?:?|⚠️\s*\[WARNING\]:?|\*\*\[WARNING\]\*\*:?)/i, type: 'warning', icon: '⚠️', label: 'WARNING' },
        { re: /^(ℹ️\s*\*?\*?NOTE\*?\*?:?|\*\*\[NOTE\]\*\*:?|\*\*NOTE:\*\*)/i,            type: 'info',    icon: 'ℹ️', label: 'NOTE' },
        { re: /^(💡\s*\*?\*?TIP\*?\*?:?|\*\*\[TIP\]\*\*:?|\*\*TIP:\*\*)/i,              type: 'tip',     icon: '💡', label: 'TIP' },
      ];
      document.querySelectorAll('.main > *').forEach(function (el) {
        if (el.tagName !== 'P' && el.tagName !== 'BLOCKQUOTE') return;
        var raw = el.textContent.trim();
        for (var i = 0; i < PATTERNS.length; i++) {
          var p = PATTERNS[i];
          if (!p.re.test(raw)) continue;
          var body = raw.replace(p.re, '').replace(/^[:\s]+/, '');
          var callout = document.createElement('div');
          callout.className = 'callout callout-' + p.type;
          callout.innerHTML =
            '<div class="callout-icon">' + p.icon + '</div>' +
            '<div class="callout-body"><div class="callout-title">' + p.label + '</div>' +
            '<div class="callout-content">' + body + '</div></div>';
          el.parentNode.replaceChild(callout, el);
          break;
        }
      });

      // Auto-badge stability values in tables
      document.querySelectorAll('.main td').forEach(function (td) {
        var t = td.textContent.trim();
        var map = { 'Stable': 'stable', 'Beta': 'beta', 'Experimental': 'experimental', 'Deprecated': 'deprecated' };
        if (map[t]) td.innerHTML = '<span class="badge badge-' + map[t] + '">' + t + '</span>';
      });
    }

    async function initMermaid() {
      if (typeof mermaid === 'undefined') return;
      var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      mermaid.initialize(mermaidConfig(isDark));

      var blocks = document.querySelectorAll('pre code.language-mermaid');
      for (var i = 0; i < blocks.length; i++) {
        var code = blocks[i];
        var pre  = code.closest('pre');
        if (!pre) continue;
        var src  = code.textContent || '';
        var wrap = document.createElement('div');
        wrap.className = 'mermaid-wrap';
        wrap.setAttribute('data-mermaid-src', src);
        await renderOneDiagram(wrap, src, 'mmd-' + i, i + 1);
        pre.parentNode.replaceChild(wrap, pre);
      }
    }

    async function reinitMermaid() {
      if (typeof mermaid === 'undefined') return;
      var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      mermaid.initialize(mermaidConfig(isDark));
      var wraps = document.querySelectorAll('.mermaid-wrap');
      for (var i = 0; i < wraps.length; i++) {
        var wrap = wraps[i];
        var src  = wrap.getAttribute('data-mermaid-src');
        if (!src) continue;
        wrap.innerHTML = '';
        await renderOneDiagram(wrap, src, 'mmd-ri-' + i);
      }
    }


    // ── Syntax highlighting ──────────────────────────────────────────────────
    function applyHighlighting() {
      if (typeof hljs === 'undefined') return;
      document.querySelectorAll('pre code:not(.language-mermaid)').forEach(function (block) {
        hljs.highlightElement(block);
      });
    }

    // ── Code block enhancements (header bar + copy button) ───────────────────
    function enhanceCodeBlocks() {
      document.querySelectorAll('.main pre').forEach(function (pre) {
        var code = pre.querySelector('code');
        if (!code) return;

        var cls = Array.from(code.classList).find(function (c) { return c.startsWith('language-'); });
        var lang = cls ? cls.replace('language-', '') : 'code';

        var bar = document.createElement('div');
        bar.className = 'code-bar';

        var langSpan = document.createElement('span');
        langSpan.textContent = lang;
        bar.appendChild(langSpan);

        var btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
        btn.addEventListener('click', function () {
          if (!navigator.clipboard) return;
          navigator.clipboard.writeText(code.innerText).then(function () {
            btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
            btn.classList.add('done');
            setTimeout(function () {
              btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
              btn.classList.remove('done');
            }, 2000);
          });
        });
        bar.appendChild(btn);
        pre.insertBefore(bar, code);
      });
    }

    // ── Heading anchor links ─────────────────────────────────────────────────
    function addAnchors() {
      document.querySelectorAll('.main h1,.main h2,.main h3,.main h4').forEach(function (h) {
        if (!h.id) return;
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.className = 'anchor';
        a.textContent = '#';
        a.title = 'Copy link to section';
        a.addEventListener('click', function (e) {
          e.preventDefault();
          if (navigator.clipboard) navigator.clipboard.writeText(location.href.split('#')[0] + '#' + h.id);
          history.pushState(null, '', '#' + h.id);
        });
        h.appendChild(a);
      });
    }

    // ── Theme ────────────────────────────────────────────────────────────────
    var theme = localStorage.getItem('doc-theme') || 'dark';
    setTheme(theme);

    function setTheme(t) {
      theme = t;
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('doc-theme', t);
      var label = document.getElementById('themeLabel');
      var hljsLink = document.getElementById('hljs-theme');
      if (label) label.textContent = t === 'dark' ? 'Light' : 'Dark';
      if (hljsLink) {
        hljsLink.href = t === 'dark'
          ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
          : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
      }
    }

    document.getElementById('themeBtn').addEventListener('click', function () {
      setTheme(theme === 'dark' ? 'light' : 'dark');
      reinitMermaid();
    });

    // ── Back to top ──────────────────────────────────────────────────────────
    var btt = document.getElementById('btt');
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) btt.classList.add('show');
      else btt.classList.remove('show');
    }, { passive: true });

    // ── Active TOC tracking ──────────────────────────────────────────────────
    function initTocTracking() {
      var headings = document.querySelectorAll('.main h2, .main h3, .main h4, .main h5, .main h6');
      var tocLinks = document.querySelectorAll('.toc-link');
      if (!headings.length || !tocLinks.length) return;

      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            tocLinks.forEach(function (link) {
              link.classList.toggle('active', link.getAttribute('href') === '#' + id);
            });
          }
        });
      }, { rootMargin: '-8% 0px -80% 0px' });

      headings.forEach(function (h) { if (h.id) obs.observe(h); });
    }

    // ── Search ───────────────────────────────────────────────────────────────
    var searchIndex = [];

    function buildIndex() {
      var currentH2 = '';
      document.querySelectorAll('.main h2, .main h3, .main h4, .main p').forEach(function (el) {
        var tag = el.tagName;
        var text = el.textContent.replace(/#$/, '').trim();
        if (!text || text.length < 3) return;
        if (tag === 'H2') currentH2 = text;
        searchIndex.push({ text: text, id: el.getAttribute('id'), tag: tag, file: currentH2 });
      });
    }

    var inp = document.getElementById('searchInput');
    var drop = document.getElementById('searchDropdown');

    function escRe(s) { return s.replace(/[.*+?^{}()|[\]\\$]/g, '\\$&'); }

    inp.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (q.length < 2) { drop.classList.remove('open'); drop.innerHTML = ''; return; }

      var hits = searchIndex.filter(function (it) {
        return it.text.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 10);

      if (!hits.length) {
        drop.innerHTML = '<div class="search-empty">No results for &ldquo;' + q + '&rdquo;</div>';
        drop.classList.add('open');
        return;
      }

      var re = new RegExp('(' + escRe(q) + ')', 'gi');
      drop.innerHTML = hits.map(function (it) {
        var hi = it.text.replace(re, '<mark>$1</mark>');
        var fileNote = it.file && it.file !== it.text
          ? '<div class="search-item-file">' + it.file + '</div>' : '';
        return '<div class="search-item" data-id="' + (it.id || '') + '">'
          + '<div class="search-item-title">' + hi + '</div>' + fileNote + '</div>';
      }).join('');
      drop.classList.add('open');

      drop.querySelectorAll('.search-item').forEach(function (item) {
        item.addEventListener('click', function () {
          var id = this.getAttribute('data-id');
          var el = id ? document.getElementById(id) : null;
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          drop.classList.remove('open');
          inp.value = '';
        });
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-wrap')) drop.classList.remove('open');
    });

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea')) {
        if (e.key === 'Escape') { drop.classList.remove('open'); inp.blur(); }
        return;
      }
      if (e.key === '/') { e.preventDefault(); inp.focus(); inp.select(); }
      if (e.key === 't' || e.key === 'T') { setTheme(theme === 'dark' ? 'light' : 'dark'); }
    });

    // ── Init ─────────────────────────────────────────────────────────────────
    function runInit() {
      initMermaid();          // async — fire and forget
      applyHighlighting();
      enhanceCodeBlocks();
      addAnchors();
      buildIndex();
      initTocTracking();
      enhanceCallouts();

      // Modal close button
      var modalClose = document.getElementById('diagramModalClose');
      var modal = document.getElementById('diagramModal');
      if (modalClose && modal) {
        modalClose.addEventListener('click', function () { modal.classList.remove('open'); });
        modal.addEventListener('click', function (e) {
          if (e.target === modal) modal.classList.remove('open');
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') modal.classList.remove('open');
        });
      }
    }

    document.addEventListener('DOMContentLoaded', runInit);
    if (document.readyState !== 'loading') { runInit(); }
  })();
  </script>
  <footer style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px; border-top: 1px solid var(--border); margin-top: 40px;">
    Generated by <strong>DocuMint</strong> - AI-Powered Documentation Generator
  </footer>
</body>
</html>`;
}
