export interface HtmlTemplateOptions {
  title: string;
  tocHtml: string;
  contentHtml: string;
  projectName: string;
  fileCount: number;
  generationDate: string;
  languages?: string[];
  totalLines?: number;
  logoSrc?: string;
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatGeneratedTimestamp(value: string): {
  month: string;
  day: string;
  year: string;
  time: string;
} {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      month: new Intl.DateTimeFormat("en-US", { month: "short" })
        .format(parsed)
        .toUpperCase(),
      day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(parsed),
      year: new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(parsed),
      time: new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(parsed),
    };
  }

  const [datePart, timePart] = value.split(",").map((part) => part.trim());
  return {
    month: "DATE",
    day: datePart || value,
    year: "",
    time: timePart || value,
  };
}

export function generateHtmlTemplate(options: HtmlTemplateOptions): string {
  const safeTitle = escapeHtmlAttr(options.title);
  const safeDate = escapeHtmlAttr(options.generationDate);
  const generatedTimestamp = formatGeneratedTimestamp(options.generationDate);
  const safeGeneratedMonth = escapeHtmlAttr(generatedTimestamp.month);
  const safeGeneratedDay = escapeHtmlAttr(generatedTimestamp.day);
  const safeGeneratedYear = escapeHtmlAttr(generatedTimestamp.year);
  const safeGeneratedTime = escapeHtmlAttr(generatedTimestamp.time);
  const safeProjectName = escapeHtmlAttr(options.projectName);
  const safeLogoSrc = options.logoSrc ? escapeHtmlAttr(options.logoSrc) : "";
  const footerLogoHtml = safeLogoSrc
    ? `<img class="footer-logo-img" src="${safeLogoSrc}" alt="DocuMint logo">`
    : "";

  const languagesStr = options.languages?.length
    ? options.languages.map(escapeHtmlAttr).join(", ")
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
    `<div class="stat-item generated-stat"><div class="generated-stamp" aria-label="Generated ${safeDate}"><div class="calendar-chip"><span class="calendar-month">${safeGeneratedMonth}</span><span class="calendar-day">${safeGeneratedDay}</span>${safeGeneratedYear ? `<span class="calendar-year">${safeGeneratedYear}</span>` : ""}</div><div class="digital-clock"><span class="clock-label">Generated</span><span class="clock-value">${safeGeneratedTime}</span></div></div></div>`,
  ].join("");

  return String.raw`<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Documentation Generator">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" id="hljs-theme">
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

    .documint-jelly-ui .sidebar {
      top: 80px;
      bottom: 12px;
      left: 12px;
      width: var(--sidebar-w);
      height: auto;
      padding: 12px 0;
      border: 1px solid var(--jelly-border);
      border-radius: 20px;
      background: var(--jelly-surface);
      box-shadow: var(--jelly-shadow-soft), var(--jelly-highlight);
      backdrop-filter: blur(18px) saturate(1.08);
      -webkit-backdrop-filter: blur(18px) saturate(1.08);
    }

    .documint-jelly-ui .sidebar-shell {
      padding: 0 10px 18px;
    }

    .documint-jelly-ui .sidebar-head {
      padding: 14px;
      margin: 0 0 12px;
      border-color: var(--jelly-border);
      border-radius: 16px;
      background:
        linear-gradient(145deg, var(--jelly-surface-strong), var(--jelly-surface-soft));
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .sidebar-project-name {
      margin-top: 6px;
      font-size: 15px;
      letter-spacing: -.015em;
    }

    .documint-jelly-ui .smart-toc-group {
      margin-bottom: 8px;
      border-color: transparent;
      border-radius: 13px;
      background: transparent;
      box-shadow: none;
      transition: background .16s ease, border-color .16s ease;
    }

    .documint-jelly-ui .smart-toc-group:hover,
    .documint-jelly-ui .smart-toc-group[open] {
      border-color: var(--jelly-border);
      background: var(--jelly-surface-soft);
      box-shadow: none;
    }

    .documint-jelly-ui .smart-toc-summary,
    .documint-jelly-ui .file-tree-summary,
    .documint-jelly-ui .smart-toc-items .toc-link {
      border-radius: 10px;
      transition:
        background .14s ease,
        color .14s ease,
        transform .14s ease,
        border-color .14s ease;
    }

    .documint-jelly-ui .smart-toc-summary:hover,
    .documint-jelly-ui .file-tree-summary:hover,
    .documint-jelly-ui .smart-toc-items .toc-link:hover {
      background: var(--jelly-surface-hover);
    }

    .documint-jelly-ui .smart-toc-items .toc-link.active,
    .documint-jelly-ui .toc-link.active {
      background:
        linear-gradient(90deg, var(--accent-subtle), transparent);
      border-left-color: var(--accent) !important;
      box-shadow: inset 0 0 0 1px var(--jelly-border);
    }

    .documint-jelly-ui .smart-toc-icon {
      border-radius: 7px;
      box-shadow: var(--jelly-highlight);
    }

    .documint-jelly-ui .main {
      margin-left: calc(var(--sidebar-w) + 28px);
      margin-top: calc(var(--topbar-h) + 32px);
      width: calc(100% - var(--sidebar-w) - 40px);
      padding: 30px clamp(24px, 4vw, 58px) 110px;
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
        left: 8px;
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
  </style>
</head>
<body class="documint-jelly-ui">

  <nav class="topbar">
    <a class="topbar-client" href="#" title="${safeProjectName}">${safeProjectName}</a>
    <div class="topbar-sep"></div>
    <span class="topbar-project">Documentation</span>
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
      <span id="themeLabel">Dark</span>
    </button>
  </nav>

  <aside class="sidebar">
    <div class="sidebar-shell">
      <div class="sidebar-head">
        <div class="sidebar-kicker">Documentation</div>
        <div class="sidebar-project-name" title="${safeProjectName}">${safeProjectName}</div>
        <div class="sidebar-subtitle">Structured navigation</div>
      </div>
      <div class="sidebar-tools">
        <input class="sidebar-filter" id="sidebarFilter" type="search" placeholder="Filter sections..." autocomplete="off" spellcheck="false">
      </div>
      <div class="sidebar-label legacy-hidden">Contents</div>
      <nav class="toc-nav" id="tocNav">${options.tocHtml}</nav>
    </div>
  </aside>

  <main class="main" id="mainContent">
    <header class="client-heading">
      <div class="client-name-highlight">${safeProjectName}</div>
    </header>
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
        securityLevel: 'strict',
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif',
        fontSize: 13,
        flowchart: { useMaxWidth: true, htmlLabels: false, curve: 'orthogonal', padding: 18 },
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
      var container = wrap.parentNode && wrap.parentNode.classList &&
        wrap.parentNode.classList.contains('diagram-container')
        ? wrap.parentNode
        : document.createElement('div');

      if (!container.classList.contains('diagram-container')) {
        container.className = 'diagram-container';
      }

      Array.from(container.children).forEach(function (child) {
        if (child.classList && child.classList.contains('diagram-toolbar')) {
          child.remove();
        }
      });

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

      if (wrap.parentNode !== container) {
        wrap.parentNode.insertBefore(container, wrap);
        container.appendChild(wrap);
      }
      container.insertBefore(toolbar, wrap);
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
      var xml = buildDrawioXmlFromMermaid(mermaidSrc);
      var blob = new Blob([xml], { type: 'application/xml' });
      triggerDownload(blob, 'diagram-' + index + '.drawio');
    }

    function escapeXmlAttr(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    function parseMermaidFlowchart(mermaidSrc) {
      var nodes = new Map();
      var edges = [];

      function addNode(id, label) {
        if (!id) return;
        if (!nodes.has(id)) {
          nodes.set(id, {
            id: id,
            label: label || id,
            incoming: 0,
            outgoing: 0,
          });
        } else if (label && nodes.get(id).label === id) {
          nodes.get(id).label = label;
        }
      }

      function cleanLabel(value) {
        return String(value || '')
          .replace(/^["']|["']$/g, '')
          .replace(/<br\s*\/?>/gi, '\\n')
          .trim();
      }

      mermaidSrc.split(/\r?\n/).forEach(function (rawLine) {
        var line = rawLine.trim();
        if (!line || /^flowchart\b|^graph\b|^subgraph\b|^end$/i.test(line)) {
          return;
        }

        var nodeMatch = line.match(/^([A-Za-z0-9_:-]+)\s*\[(?:"([^"]*)"|'([^']*)'|([^\]]+))\]/);
        if (nodeMatch) {
          addNode(nodeMatch[1], cleanLabel(nodeMatch[2] || nodeMatch[3] || nodeMatch[4]));
        }

        var edgeMatch = line.match(/^([A-Za-z0-9_:-]+)\s*-->\s*(?:\|([^|]*)\|\s*)?([A-Za-z0-9_:-]+)/);
        if (edgeMatch) {
          addNode(edgeMatch[1], edgeMatch[1]);
          addNode(edgeMatch[3], edgeMatch[3]);
          edges.push({
            from: edgeMatch[1],
            to: edgeMatch[3],
            label: cleanLabel(edgeMatch[2] || ''),
          });
        }
      });

      edges.forEach(function (edge) {
        if (nodes.has(edge.from)) nodes.get(edge.from).outgoing++;
        if (nodes.has(edge.to)) nodes.get(edge.to).incoming++;
      });

      return { nodes: Array.from(nodes.values()), edges: edges };
    }

    function buildDrawioXmlFromMermaid(mermaidSrc) {
      var parsed = parseMermaidFlowchart(mermaidSrc);
      var nodeLevels = new Map();
      var outgoing = new Map();
      parsed.nodes.forEach(function (node) {
        outgoing.set(node.id, []);
        nodeLevels.set(node.id, node.incoming === 0 ? 0 : 1);
      });
      parsed.edges.forEach(function (edge) {
        if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
        outgoing.get(edge.from).push(edge.to);
      });

      var queue = parsed.nodes
        .filter(function (node) { return node.incoming === 0; })
        .map(function (node) { return node.id; });
      if (!queue.length && parsed.nodes.length) queue.push(parsed.nodes[0].id);

      for (var qi = 0; qi < queue.length; qi++) {
        var from = queue[qi];
        var nextLevel = (nodeLevels.get(from) || 0) + 1;
        (outgoing.get(from) || []).forEach(function (to) {
          if ((nodeLevels.get(to) || 0) < nextLevel) {
            nodeLevels.set(to, nextLevel);
            queue.push(to);
          }
        });
      }

      var rowsByLevel = new Map();
      parsed.nodes.forEach(function (node) {
        var level = nodeLevels.get(node.id) || 0;
        if (!rowsByLevel.has(level)) rowsByLevel.set(level, 0);
        node.x = 60 + level * 220;
        node.y = 70 + rowsByLevel.get(level) * 100;
        rowsByLevel.set(level, rowsByLevel.get(level) + 1);
      });

      var cells = ['      <mxCell id="0"/>', '      <mxCell id="1" parent="0"/>'];

      if (!parsed.nodes.length) {
        cells.push(
          '      <mxCell id="2" value="' + escapeXmlAttr(mermaidSrc) + '" ' +
          'style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">' +
          '<mxGeometry x="40" y="40" width="720" height="360" as="geometry"/></mxCell>',
        );
      } else {
        parsed.nodes.forEach(function (node, index) {
          var id = 'n' + (index + 2);
          node.drawioId = id;
          cells.push(
            '      <mxCell id="' + id + '" value="' + escapeXmlAttr(node.label) + '" ' +
            'style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#1a1a2e;" vertex="1" parent="1">' +
            '<mxGeometry x="' + node.x + '" y="' + node.y + '" width="160" height="54" as="geometry"/></mxCell>',
          );
        });

        var nodeById = new Map(parsed.nodes.map(function (node) { return [node.id, node]; }));
        parsed.edges.forEach(function (edge, index) {
          var source = nodeById.get(edge.from);
          var target = nodeById.get(edge.to);
          if (!source || !target) return;
          cells.push(
            '      <mxCell id="e' + (index + 1) + '" value="' + escapeXmlAttr(edge.label) + '" ' +
            'style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#6c8ebf;fontColor=#1a1a2e;" ' +
            'edge="1" parent="1" source="' + source.drawioId + '" target="' + target.drawioId + '">' +
            '<mxGeometry relative="1" as="geometry"/></mxCell>',
          );
        });
      }

      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<mxfile host="app.diagrams.net">',
        '  <diagram name="DocuMint Diagram">',
        '    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="850" math="0" shadow="0"><root>',
        cells.join('\n'),
        '    </root></mxGraphModel>',
        '  </diagram>',
        '</mxfile>',
      ].join('\n');
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
        pre.parentNode.replaceChild(wrap, pre);
        await renderOneDiagram(wrap, src, 'mmd-' + i, i + 1);
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
        await renderOneDiagram(wrap, src, 'mmd-ri-' + i, i + 1);
      }
    }


    // ── Syntax highlighting ──────────────────────────────────────────────────
    function enhanceProjectTreeVisuals() {
      document.querySelectorAll('pre code.language-project-tree').forEach(function (block) {
        var pre = block.closest('pre');
        if (!pre || !pre.parentNode) return;

        function escapeTreeHtml(value) {
          return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }

        function parseLine(rawLine) {
          var rest = rawLine.replace(/\t/g, '    ').replace(/\s+$/g, '');
          if (!rest.trim()) return null;

          var depth = 0;
          while (rest.indexOf('|   ') === 0 || rest.indexOf('    ') === 0) {
            depth++;
            rest = rest.slice(4);
          }

          var connectorPattern = new RegExp('^(?:\\|-- |' + String.fromCharCode(96) + '-- )');
          var hasConnector = connectorPattern.test(rest);
          if (hasConnector) {
            depth++;
            rest = rest.replace(connectorPattern, '');
          }

          var meta = '';
          var metaMatch = rest.match(/\s+\[([^\]]+)\]$/);
          if (metaMatch) {
            meta = metaMatch[1];
            rest = rest.slice(0, metaMatch.index).trim();
          } else {
            rest = rest.trim();
          }

          var isFolder = /\/$/.test(rest);
          var name = isFolder ? rest.replace(/\/$/, '') : rest;
          return {
            depth: depth,
            name: name,
            meta: meta,
            type: isFolder ? 'folder' : 'file',
          };
        }

        var rows = (block.textContent || '')
          .split(/\r?\n/)
          .map(parseLine)
          .filter(Boolean);

        if (!rows.length) return;

        var fileCount = rows.filter(function (row) { return row.type === 'file'; }).length;
        var folderCount = Math.max(
          rows.filter(function (row) { return row.type === 'folder'; }).length - 1,
          0,
        );

        var visual = document.createElement('div');
        visual.className = 'project-tree-visual';

        var header = document.createElement('div');
        header.className = 'project-tree-header';
        header.innerHTML =
          '<div class="project-tree-title">Project Tree</div>' +
          '<div class="project-tree-summary">' + folderCount + ' folders | ' + fileCount + ' files</div>';

        var body = document.createElement('div');
        body.className = 'project-tree-body';

        rows.forEach(function (row, index) {
          var item = document.createElement('div');
          item.className = 'project-tree-row ' + row.type + (index === 0 ? ' root' : '');
          item.setAttribute('data-tree-depth', String(row.depth));
          item.setAttribute('data-tree-type', row.type);
          item.setAttribute('data-tree-name', row.name);
          if (row.meta) item.setAttribute('data-tree-meta', row.meta);
          item.style.paddingLeft = Math.max(14, 14 + row.depth * 18) + 'px';
          item.innerHTML =
            '<span class="tree-node-icon" aria-hidden="true"></span>' +
            '<span class="tree-node-name" title="' + escapeTreeHtml(row.name) + '">' + escapeTreeHtml(row.name) + '</span>' +
            (row.meta ? '<span class="tree-node-meta">' + escapeTreeHtml(row.meta) + '</span>' : '');
          body.appendChild(item);
        });

        visual.appendChild(header);
        visual.appendChild(body);
        pre.parentNode.replaceChild(visual, pre);
      });
    }

    function escapeVisualHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function formatCountLabel(count, singular, plural) {
      var numeric = Number(count) || 0;
      return numeric.toLocaleString() + ' ' + (numeric === 1 ? singular : plural);
    }

    function formatLanguageLabel(language) {
      var raw = String(language == null ? '' : language).trim();
      var key = raw.toLowerCase().replace(/[\s_-]+/g, '');
      var labels = {
        csharp: 'C#',
        cpp: 'C++',
        css: 'CSS',
        go: 'Go',
        html: 'HTML',
        java: 'Java',
        javascript: 'JavaScript',
        javascriptreact: 'JavaScript React',
        json: 'JSON',
        markdown: 'Markdown',
        php: 'PHP',
        python: 'Python',
        ruby: 'Ruby',
        rust: 'Rust',
        scss: 'SCSS',
        shellscript: 'Shell Script',
        typescript: 'TypeScript',
        typescriptreact: 'TypeScript React',
        vue: 'Vue',
        yaml: 'YAML',
      };
      if (labels[key]) return labels[key];
      return raw
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Code';
    }

    function metaChip(className, label, title) {
      return '<span class="meta-chip ' + className + '"' +
        (title ? ' title="' + escapeVisualHtml(title) + '"' : '') +
        '>' + escapeVisualHtml(label) + '</span>';
    }

    function parseVisualJsonBlock(block) {
      try {
        return JSON.parse(block.textContent || '{}');
      } catch (_err) {
        return null;
      }
    }

    function replaceCodeBlock(block, element) {
      var pre = block.closest('pre');
      if (!pre || !pre.parentNode) return false;
      pre.parentNode.replaceChild(element, pre);
      return true;
    }

    function makeVisualButton(label, title) {
      var btn = document.createElement('button');
      btn.className = 'visual-action-btn';
      btn.type = 'button';
      btn.textContent = label;
      btn.title = title || label;
      return btn;
    }

    function downloadText(filename, text, type) {
      triggerDownload(new Blob([text], { type: type || 'text/plain' }), filename);
    }

    function copyText(text, btn) {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        if (!btn) return;
        var old = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = old; }, 1600);
      });
    }

    function visualHeader(title, meta, actions) {
      var header = document.createElement('div');
      header.className = 'visual-panel-header';
      header.innerHTML =
        '<div><div class="visual-panel-title">' + escapeVisualHtml(title) + '</div>' +
        (meta ? '<div class="visual-panel-meta">' + escapeVisualHtml(meta) + '</div>' : '') +
        '</div>';
      if (actions) header.appendChild(actions);
      return header;
    }

    function sketchArrowSvg() {
      return '' +
        '<svg class="sketch-arrow-svg" viewBox="0 0 32 22" aria-hidden="true" focusable="false">' +
        '<path class="sketch-arrow-shadow" d="M2 13 C8 5, 17 5, 26 10"></path>' +
        '<path d="M2 12 C8 4, 17 4, 26 9"></path>' +
        '<path d="M22 5 L27 9 L22 14"></path>' +
        '<path d="M21.5 6.4 L26 9 L21.4 12.5"></path>' +
        '</svg>';
    }

    function previousHeadingText(element) {
      var cursor = element ? element.previousElementSibling : null;
      while (cursor) {
        if (/^H[1-6]$/.test(cursor.tagName)) {
          return cursor.textContent.replace(/#$/, '').trim();
        }
        cursor = cursor.previousElementSibling;
      }
      return '';
    }

    function moduleNameById(data, id) {
      var modules = data.modules || [];
      for (var i = 0; i < modules.length; i++) {
        if (modules[i].id === id) return modules[i].name;
      }
      return id;
    }

    function moduleById(data, id) {
      var modules = data.modules || [];
      for (var i = 0; i < modules.length; i++) {
        if (modules[i].id === id || modules[i].name === id) return modules[i];
      }
      return null;
    }

    function moduleDomId(module) {
      return String((module && (module.id || module.name)) || '');
    }

    function roleClassName(role) {
      var value = String(role || 'Module').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var known = {
        provider: true,
        service: true,
        ui: true,
        analysis: true,
        configuration: true,
        assets: true,
        tests: true,
        module: true,
      };
      return 'role-' + (known[value] ? value : 'module');
    }

    function roleColor(role) {
      var roleClass = roleClassName(role);
      var colors = {
        'role-provider': '#a855f7',
        'role-service': '#38bdf8',
        'role-ui': '#22c55e',
        'role-analysis': '#f59e0b',
        'role-configuration': '#f97316',
        'role-assets': '#ec4899',
        'role-tests': '#84cc16',
        'role-module': '#58a6ff',
      };
      return colors[roleClass] || colors['role-module'];
    }

    function modulePieColor(index) {
      var palette = [
        '#22c55e',
        '#3b82f6',
        '#ef4444',
        '#8b5cf6',
        '#f97316',
        '#06b6d4',
        '#ec4899',
        '#64748b',
        '#14b8a6',
        '#f59e0b',
        '#6366f1',
      ];
      return palette[index % palette.length];
    }

    function polarPoint(cx, cy, radius, angleDegrees) {
      var angleRadians = (angleDegrees - 90) * Math.PI / 180;
      return {
        x: cx + radius * Math.cos(angleRadians),
        y: cy + radius * Math.sin(angleRadians),
      };
    }

    function donutSlicePath(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
      var end = Math.min(endAngle, startAngle + 359.99);
      var largeArc = end - startAngle > 180 ? 1 : 0;
      var outerStart = polarPoint(cx, cy, outerRadius, startAngle);
      var outerEnd = polarPoint(cx, cy, outerRadius, end);
      var innerStart = polarPoint(cx, cy, innerRadius, end);
      var innerEnd = polarPoint(cx, cy, innerRadius, startAngle);
      return [
        'M', outerStart.x, outerStart.y,
        'A', outerRadius, outerRadius, 0, largeArc, 1, outerEnd.x, outerEnd.y,
        'L', innerStart.x, innerStart.y,
        'A', innerRadius, innerRadius, 0, largeArc, 0, innerEnd.x, innerEnd.y,
        'Z',
      ].join(' ');
    }

    function uniqueLanguageLabels(modules) {
      var seen = {};
      var labels = [];
      (modules || []).forEach(function (module) {
        (module.languages || []).forEach(function (language) {
          var label = formatLanguageLabel(language);
          var key = label.toLowerCase();
          if (!seen[key]) {
            seen[key] = true;
            labels.push(label);
          }
        });
      });
      return labels;
    }

    function enhanceArchitectureBlueprints() {
      document.querySelectorAll('pre code.language-architecture-blueprint').forEach(function (block) {
        var data = parseVisualJsonBlock(block);
        if (!data) return;
        var modules = data.modules || [];
        var moduleEdges = data.moduleEdges || [];
        var languageLabels = uniqueLanguageLabels(modules);
        var importantFileCount = modules.reduce(function (sum, module) {
          return sum + ((module.importantFiles || []).length);
        }, 0);
        var activeModuleId = modules[0] ? moduleDomId(modules[0]) : '';

        var panel = document.createElement('section');
        panel.className = 'visual-blueprint';
        var isLocalBlueprint = data.source === 'local';
        panel.appendChild(visualHeader(
          isLocalBlueprint ? 'Local Architecture Blueprint' : 'Auto Architecture Blueprint',
          modules.length + ' modules | ' + moduleEdges.length + ' dependency routes' +
            (isLocalBlueprint ? ' | source-derived' : ''),
          null,
        ));

        function dashboardWidget(kind, label, value, note) {
          var widget = document.createElement('article');
          widget.className = 'architecture-widget ' + kind;
          widget.innerHTML =
            '<div class="architecture-widget-label">' + escapeVisualHtml(label) + '</div>' +
            '<div class="architecture-widget-value">' + escapeVisualHtml(value) + '</div>' +
            '<div class="architecture-widget-note" title="' + escapeVisualHtml(note || '') + '">' + escapeVisualHtml(note || '') + '</div>';
          return widget;
        }

        var dashboard = document.createElement('div');
        dashboard.className = 'architecture-dashboard';
        dashboard.appendChild(dashboardWidget(
          'modules',
          'Modules',
          modules.length.toLocaleString(),
          isLocalBlueprint ? 'structural path clusters' : 'clustered by folder and role',
        ));
        dashboard.appendChild(dashboardWidget('routes', 'Routes', moduleEdges.length.toLocaleString(), 'detected internal dependency paths'));
        dashboard.appendChild(dashboardWidget(
          'files',
          'Key Files',
          importantFileCount.toLocaleString(),
          isLocalBlueprint ? 'ranked by entry points, exports, and dependency links' : 'highest-signal files surfaced',
        ));
        dashboard.appendChild(dashboardWidget('languages', 'Languages', languageLabels.length.toLocaleString(), languageLabels.slice(0, 4).join(', ') || 'mixed'));
        panel.appendChild(dashboard);

        var flow = document.createElement('div');
        flow.className = 'architecture-flow';

        function stage(label, items) {
          var el = document.createElement('div');
          el.className = 'flow-stage';
          el.innerHTML = '<div class="flow-stage-label">' + escapeVisualHtml(label) + '</div>';
          (items && items.length ? items : ['none detected']).slice(0, 5).forEach(function (item) {
            el.innerHTML += '<span class="flow-chip" title="' + escapeVisualHtml(item) + '">' + escapeVisualHtml(item) + '</span>';
          });
          return el;
        }

        function appendArrow(target) {
          var arrow = document.createElement('div');
          arrow.className = 'flow-arrow';
          arrow.innerHTML = sketchArrowSvg();
          target.appendChild(arrow);
        }

        var coreModules = modules.slice(0, 5).map(function (module) { return module.name; });
        var providers = modules
          .filter(function (module) { return module.role === 'Provider' || module.role === 'Service'; })
          .slice(0, 5)
          .map(function (module) { return module.name; });
        var connectedModuleIds = {};
        moduleEdges.forEach(function (edge) {
          connectedModuleIds[edge.from] = true;
          connectedModuleIds[edge.to] = true;
        });
        var connectedModules = modules
          .filter(function (module) { return connectedModuleIds[moduleDomId(module)]; })
          .slice(0, 5)
          .map(function (module) { return module.name; });
        flow.appendChild(stage('Entry Points', data.entryPoints || []));
        appendArrow(flow);
        flow.appendChild(stage('Module Clusters', coreModules));
        appendArrow(flow);
        flow.appendChild(stage(
          isLocalBlueprint ? 'Connected Modules' : 'Services / Providers',
          isLocalBlueprint ? connectedModules : providers,
        ));
        appendArrow(flow);
        flow.appendChild(stage('Output', ['Markdown documentation', 'HTML documentation', 'Editable diagrams']));
        panel.appendChild(flow);

        var chartPanel = document.createElement('section');
        chartPanel.className = 'architecture-chart-panel';
        chartPanel.innerHTML =
          '<div class="architecture-chart-head">' +
          '<div class="architecture-chart-title">Module Scale Chart</div>' +
          '<div class="architecture-segmented" role="group" aria-label="Chart metric">' +
          '<button class="architecture-segment active" type="button" data-metric="files">Files</button>' +
          '<button class="architecture-segment" type="button" data-metric="lines">Lines</button>' +
          '</div>' +
          '</div>';
        var chartBody = document.createElement('div');
        chartBody.className = 'architecture-chart-body';
        var piePanel = document.createElement('div');
        piePanel.className = 'architecture-pie-panel';
        chartBody.appendChild(piePanel);
        chartPanel.appendChild(chartBody);
        panel.appendChild(chartPanel);

        var board = document.createElement('div');
        board.className = 'architecture-board';

        var grid = document.createElement('div');
        grid.className = 'architecture-grid';
        modules.forEach(function (module) {
          var card = document.createElement('article');
          var id = moduleDomId(module);
          card.className = 'architecture-card ' + roleClassName(module.role);
          card.setAttribute('data-module-id', id);
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          card.setAttribute('aria-pressed', id === activeModuleId ? 'true' : 'false');
          card.innerHTML =
            '<div class="architecture-card-head">' +
            '<div class="architecture-module-name">' + escapeVisualHtml(module.name) + '</div>' +
            '<div class="architecture-role">' + escapeVisualHtml(module.role) + '</div>' +
            '</div>' +
            '<div class="architecture-metrics">' +
            metaChip('files', formatCountLabel(module.fileCount, 'file', 'files')) +
            metaChip('lines', formatCountLabel(module.lineCount, 'line', 'lines')) +
            metaChip('language', (module.languages || []).map(formatLanguageLabel).join(', ') || 'Mixed') +
            '</div>';
          var list = document.createElement('div');
          list.className = 'important-file-list';
          (module.importantFiles || []).slice(0, 4).forEach(function (file, index) {
            var fileEl = document.createElement('div');
            fileEl.className = 'important-file-node' + (index === 0 ? ' primary' : '');
            fileEl.innerHTML =
              '<div class="important-file-name" title="' + escapeVisualHtml(file.path) + '">' + escapeVisualHtml(file.path) + '</div>' +
              '<div class="important-file-meta">' +
              metaChip('language', formatLanguageLabel(file.language)) +
              metaChip('lines', formatCountLabel(file.lineCount, 'line', 'lines')) +
              metaChip('links', formatCountLabel(file.dependencyCount, 'link', 'links')) +
              '</div>';
            list.appendChild(fileEl);
          });
          card.appendChild(list);
          card.addEventListener('click', function () { selectModule(module); });
          card.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectModule(module);
            }
          });
          grid.appendChild(card);
        });

        var details = document.createElement('aside');
        details.className = 'architecture-details';
        board.appendChild(grid);
        board.appendChild(details);
        panel.appendChild(board);

        function connectedModuleIds(id) {
          var related = {};
          if (!id) return related;
          related[id] = true;
          moduleEdges.forEach(function (edge) {
            if (edge.from === id) related[edge.to] = true;
            if (edge.to === id) related[edge.from] = true;
          });
          return related;
        }

        function renderDetails(module) {
          if (!module) {
            details.innerHTML =
              '<div class="architecture-detail-kicker">Module Details</div>' +
              '<div class="architecture-detail-title">Select a module</div>' +
              '<div class="architecture-detail-meta">' +
              metaChip('files', '0 files') +
              metaChip('lines', '0 lines') +
              '</div>';
            return;
          }

          var files = (module.importantFiles || []).slice(0, 5);
          details.innerHTML =
            '<div class="architecture-detail-kicker">' + escapeVisualHtml(module.role || 'Module') + '</div>' +
            '<div class="architecture-detail-title">' + escapeVisualHtml(module.name || 'Module') + '</div>' +
            '<div class="architecture-detail-meta">' +
            metaChip('files', formatCountLabel(module.fileCount, 'file', 'files')) +
            metaChip('lines', formatCountLabel(module.lineCount, 'line', 'lines')) +
            metaChip('language', (module.languages || []).map(formatLanguageLabel).join(', ') || 'Mixed') +
            '</div>' +
            '<div class="architecture-detail-files"></div>';

          var fileWrap = details.querySelector('.architecture-detail-files');
          if (!fileWrap) return;
          if (!files.length) {
            fileWrap.innerHTML = '<div class="architecture-detail-file"><div class="architecture-detail-file-name">No important files detected</div></div>';
            return;
          }
          files.forEach(function (file) {
            var item = document.createElement('div');
            item.className = 'architecture-detail-file';
            item.innerHTML =
              '<div class="architecture-detail-file-name" title="' + escapeVisualHtml(file.path) + '">' + escapeVisualHtml(file.path) + '</div>' +
              '<div class="architecture-detail-file-meta">' +
              escapeVisualHtml(formatLanguageLabel(file.language)) + ' | ' +
              escapeVisualHtml(formatCountLabel(file.lineCount, 'line', 'lines')) + ' | ' +
              escapeVisualHtml(formatCountLabel(file.dependencyCount, 'link', 'links')) +
              '</div>';
            fileWrap.appendChild(item);
          });
        }

        function moduleMetricValue(module, metric) {
          return metric === 'lines' ? Number(module.lineCount) || 0 : Number(module.fileCount) || 0;
        }

        function moduleMetricLabel(value, metric) {
          return metric === 'lines'
            ? formatCountLabel(value, 'line', 'lines')
            : formatCountLabel(value, 'file', 'files');
        }

        function sortedChartRows(metric) {
          return modules
            .slice()
            .sort(function (a, b) {
              var av = moduleMetricValue(a, metric);
              var bv = moduleMetricValue(b, metric);
              return bv - av || String(a.name || '').localeCompare(String(b.name || ''));
            })
            .slice(0, 8);
        }

        function renderPie(rows, metric) {
          var total = rows.reduce(function (sum, module) {
            return sum + moduleMetricValue(module, metric);
          }, 0);
          var centerLabel = metric === 'lines' ? 'Lines' : 'Files';
          var centerValue = metric === 'lines'
            ? total.toLocaleString()
            : total.toLocaleString();
          piePanel.innerHTML = '';

          var pieWrap = document.createElement('div');
          pieWrap.className = 'architecture-pie-wrap';
          var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'architecture-pie-svg');
          svg.setAttribute('viewBox', '0 0 120 120');
          svg.setAttribute('role', 'img');
          svg.setAttribute('aria-label', centerLabel + ' distribution by module');

          var angle = 0;
          if (total <= 0) {
            var empty = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            empty.setAttribute('cx', '60');
            empty.setAttribute('cy', '60');
            empty.setAttribute('r', '45');
            empty.setAttribute('fill', 'none');
            empty.setAttribute('stroke', 'currentColor');
            empty.setAttribute('stroke-width', '18');
            empty.setAttribute('opacity', '.18');
            svg.appendChild(empty);
          } else {
            rows.forEach(function (module, index) {
              var value = moduleMetricValue(module, metric);
              var sweep = index === rows.length - 1 ? 360 - angle : (value / total) * 360;
              var color = modulePieColor(index);
              var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('class', 'architecture-pie-segment ' + roleClassName(module.role));
              path.setAttribute('data-module-id', moduleDomId(module));
              path.setAttribute('d', donutSlicePath(60, 60, 52, 32, angle, angle + sweep));
              path.setAttribute('fill', color);
              path.setAttribute('tabindex', '0');
              path.setAttribute('role', 'button');
              path.setAttribute('aria-label', module.name + ' ' + moduleMetricLabel(value, metric));
              var title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
              title.textContent = module.name + ': ' + moduleMetricLabel(value, metric);
              path.appendChild(title);
              path.addEventListener('click', function () { selectModule(module); });
              path.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectModule(module);
                }
              });
              svg.appendChild(path);
              angle += sweep;
            });
          }

          var center = document.createElement('div');
          center.className = 'architecture-pie-center';
          center.innerHTML =
            '<div class="architecture-pie-center-label">' + escapeVisualHtml(centerLabel) + '</div>' +
            '<div class="architecture-pie-center-value">' + escapeVisualHtml(centerValue) + '</div>';
          pieWrap.appendChild(svg);
          pieWrap.appendChild(center);
          piePanel.appendChild(pieWrap);

          var legend = document.createElement('div');
          legend.className = 'architecture-pie-legend';
          rows.slice(0, 6).forEach(function (module, index) {
            var value = moduleMetricValue(module, metric);
            var item = document.createElement('button');
            item.className = 'architecture-pie-legend-item ' + roleClassName(module.role);
            item.type = 'button';
            item.setAttribute('data-module-id', moduleDomId(module));
            item.innerHTML =
              '<span class="architecture-pie-dot" style="background:' + modulePieColor(index) + '"></span>' +
              '<span class="architecture-pie-legend-name" title="' + escapeVisualHtml(module.name) + '">' + escapeVisualHtml(module.name) + '</span>' +
              '<span class="architecture-pie-legend-value">' + escapeVisualHtml(moduleMetricLabel(value, metric)) + '</span>';
            item.addEventListener('click', function () { selectModule(module); });
            legend.appendChild(item);
          });
          piePanel.appendChild(legend);
        }

        function renderChart(metric) {
          var rows = sortedChartRows(metric);
          renderPie(rows, metric);
        }

        chartPanel.querySelectorAll('.architecture-segment').forEach(function (button) {
          button.addEventListener('click', function () {
            var metric = button.getAttribute('data-metric') || 'files';
            chartPanel.querySelectorAll('.architecture-segment').forEach(function (other) {
              other.classList.toggle('active', other === button);
            });
            renderChart(metric);
            updateSelection();
          });
        });

        var edges = document.createElement('div');
        edges.className = 'architecture-edges';
        if (moduleEdges.length) {
          moduleEdges.slice(0, 18).forEach(function (edge) {
            var edgeEl = document.createElement('span');
            edgeEl.className = 'architecture-edge';
            edgeEl.setAttribute('data-from', edge.from || '');
            edgeEl.setAttribute('data-to', edge.to || '');
            edgeEl.textContent = moduleNameById(data, edge.from) + ' -> ' + moduleNameById(data, edge.to) + ' (' + edge.count + ')';
            edgeEl.title = 'Dependency route';
            edgeEl.addEventListener('click', function () {
              selectModule(moduleById(data, edge.from) || moduleById(data, edge.to));
            });
            edges.appendChild(edgeEl);
          });
        } else {
          edges.innerHTML = '<span class="architecture-edge">No cross-module dependency routes detected</span>';
        }
        panel.appendChild(edges);

        function updateSelection() {
          var related = connectedModuleIds(activeModuleId);
          panel.querySelectorAll('.architecture-card').forEach(function (card) {
            var id = card.getAttribute('data-module-id') || '';
            var active = id === activeModuleId;
            card.classList.toggle('active', active);
            card.classList.toggle('dimmed', !!activeModuleId && !related[id]);
            card.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          panel.querySelectorAll('.architecture-pie-segment,.architecture-pie-legend-item').forEach(function (item) {
            var id = item.getAttribute('data-module-id') || '';
            item.classList.toggle('active', id === activeModuleId);
            item.classList.toggle('dimmed', !!activeModuleId && !related[id]);
          });
          panel.querySelectorAll('.architecture-edge').forEach(function (edge) {
            var from = edge.getAttribute('data-from') || '';
            var to = edge.getAttribute('data-to') || '';
            var active = !!activeModuleId && (from === activeModuleId || to === activeModuleId);
            edge.classList.toggle('active', active);
            edge.classList.toggle('dimmed', !!activeModuleId && !active && !!from && !!to);
          });
          renderDetails(moduleById(data, activeModuleId));
        }

        function selectModule(module) {
          if (!module) return;
          activeModuleId = moduleDomId(module);
          updateSelection();
        }

        renderChart('files');
        updateSelection();
        replaceCodeBlock(block, panel);
      });
    }

    function enhanceCodeWorkflowBlocks() {
      document.querySelectorAll('pre code.language-code-workflow').forEach(function (block) {
        var data = parseVisualJsonBlock(block);
        if (!data) return;

        var panel = document.createElement('section');
        panel.className = 'code-workflow-panel';
        panel.appendChild(visualHeader(
          'Code Workflow',
          (data.lanes || []).length + ' lanes | ' + (data.edges || []).length + ' transitions',
          null,
        ));

        var lanesWrap = document.createElement('div');
        lanesWrap.className = 'workflow-lanes';
        var stepIndex = 1;
        var stepTitleById = {};
        (data.lanes || []).forEach(function (lane) {
          var laneEl = document.createElement('section');
          laneEl.className = 'workflow-lane';
          laneEl.innerHTML =
            '<div class="workflow-lane-header">' +
            '<div class="workflow-lane-title">' + escapeVisualHtml(lane.title) + '</div>' +
            '<div class="workflow-lane-role">' + escapeVisualHtml(lane.role) + '</div>' +
            '</div>';

          (lane.steps || []).forEach(function (step) {
            stepTitleById[step.id] = step.title;
            var stepEl = document.createElement('article');
            stepEl.className = 'workflow-step';
            stepEl.setAttribute('data-step-id', step.id);
            stepEl.setAttribute('data-step-index', String(stepIndex++));
            stepEl.innerHTML =
              '<div class="workflow-step-title">' + escapeVisualHtml(step.title) + '</div>' +
              '<div class="workflow-step-detail">' + escapeVisualHtml(step.detail) + '</div>';
            if (step.files && step.files.length) {
              var fileList = document.createElement('div');
              fileList.className = 'workflow-file-list';
              step.files.slice(0, 4).forEach(function (file) {
                fileList.innerHTML += '<span class="workflow-file" title="' + escapeVisualHtml(file) + '">' + escapeVisualHtml(file) + '</span>';
              });
              stepEl.appendChild(fileList);
            }
            laneEl.appendChild(stepEl);
          });
          lanesWrap.appendChild(laneEl);
        });
        panel.appendChild(lanesWrap);

        if ((data.edges || []).length) {
          var edges = document.createElement('div');
          edges.className = 'workflow-edge-list';
          (data.edges || []).forEach(function (edge) {
            var fromTitle = stepTitleById[edge.from] || edge.from;
            var toTitle = stepTitleById[edge.to] || edge.to;
            edges.innerHTML += '<span class="workflow-edge">' +
              escapeVisualHtml(fromTitle) + ' -> ' + escapeVisualHtml(toTitle) +
              (edge.label ? ' | ' + escapeVisualHtml(edge.label) : '') +
              '</span>';
          });
          panel.appendChild(edges);
        }

        replaceCodeBlock(block, panel);
      });
    }

    function enhanceD2SourceBlocks() {
      document.querySelectorAll('pre code.language-d2').forEach(function (block, index) {
        var source = block.textContent || '';
        var pre = block.closest('pre');
        if (!pre || !pre.parentNode) return;
        var heading = previousHeadingText(pre) || 'D2 Source';
        var safeName = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram';

        var actions = document.createElement('div');
        actions.className = 'visual-panel-actions';
        var copyBtn = makeVisualButton('Copy D2', 'Copy D2 source');
        copyBtn.addEventListener('click', function () { copyText(source, copyBtn); });
        var downloadBtn = makeVisualButton('Download .d2', 'Download D2 source');
        downloadBtn.addEventListener('click', function () { downloadText(safeName + '-' + (index + 1) + '.d2', source, 'text/plain'); });
        actions.appendChild(copyBtn);
        actions.appendChild(downloadBtn);

        var panel = document.createElement('section');
        panel.className = 'd2-panel';
        panel.appendChild(visualHeader(heading, 'Optional source for D2-compatible tools', actions));

        var body = document.createElement('div');
        body.className = 'd2-body';
        var preview = document.createElement('div');
        preview.className = 'd2-preview';
        var names = [];
        source.split(/\r?\n/).forEach(function (line) {
          var match = line.match(/^"([^"]+)":/);
          if (match && names.indexOf(match[1]) === -1) names.push(match[1]);
        });
        names.slice(0, 6).forEach(function (name, i) {
          if (i > 0) {
            var arrow = document.createElement('span');
            arrow.className = 'd2-preview-arrow';
            arrow.textContent = '>';
            preview.appendChild(arrow);
          }
          var node = document.createElement('span');
          node.className = 'd2-preview-node';
          node.title = name;
          node.textContent = name;
          preview.appendChild(node);
        });

        var sourcePre = document.createElement('pre');
        sourcePre.className = 'd2-source';
        var sourceCode = document.createElement('code');
        sourceCode.className = 'language-d2 nohighlight';
        sourceCode.textContent = source;
        sourcePre.appendChild(sourceCode);
        body.appendChild(sourcePre);
        body.appendChild(preview);
        panel.appendChild(body);
        replaceCodeBlock(block, panel);
      });
    }

    function buildWhiteboardSvg(data) {
      var modules = (data.modules || []).slice(0, 8);
      var width = 960;
      var height = 420;
      var cols = Math.min(4, Math.max(1, modules.length));
      var cellW = 210;
      var cellH = 92;
      var startX = 42;
      var startY = 74;
      var positions = {};
      var svg = [
        '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" role="img">',
        '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="transparent"/>',
        '<text x="42" y="36" fill="currentColor" font-size="22" font-weight="700">' + escapeVisualHtml(data.projectName || 'Project') + ' Architecture Sketch</text>',
      ];

      modules.forEach(function (module, index) {
        var col = index % cols;
        var row = Math.floor(index / cols);
        var x = startX + col * cellW;
        var y = startY + row * cellH;
        positions[module.id] = { x: x, y: y };
        svg.push('<path d="M' + x + ' ' + y + ' C' + (x + 8) + ' ' + (y - 5) + ' ' + (x + 168) + ' ' + (y - 3) + ' ' + (x + 176) + ' ' + y + ' L' + (x + 182) + ' ' + (y + 58) + ' C' + (x + 160) + ' ' + (y + 70) + ' ' + (x + 18) + ' ' + (y + 68) + ' ' + x + ' ' + (y + 60) + ' Z" fill="none" stroke="currentColor" stroke-width="2"/>');
        svg.push('<text x="' + (x + 16) + '" y="' + (y + 25) + '" fill="currentColor" font-size="13" font-weight="700">' + escapeVisualHtml(module.name).slice(0, 26) + '</text>');
        svg.push('<text x="' + (x + 16) + '" y="' + (y + 45) + '" fill="currentColor" opacity=".68" font-size="11">' + escapeVisualHtml(module.role) + ' | ' + formatCountLabel(module.fileCount, 'file', 'files') + '</text>');
      });

      (data.moduleEdges || []).slice(0, 10).forEach(function (edge) {
        var from = positions[edge.from];
        var to = positions[edge.to];
        if (!from || !to) return;
        var x1 = from.x + 182;
        var y1 = from.y + 32;
        var x2 = to.x;
        var y2 = to.y + 32;
        svg.push('<path d="M' + x1 + ' ' + y1 + ' C' + ((x1 + x2) / 2) + ' ' + (y1 - 18) + ' ' + ((x1 + x2) / 2) + ' ' + (y2 + 18) + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 5" opacity=".55"/>');
      });

      svg.push('</svg>');
      return svg.join('');
    }

    function buildExcalidrawJson(data) {
      var elements = [];
      var modules = (data.modules || []).slice(0, 8);
      modules.forEach(function (module, index) {
        var x = 60 + (index % 4) * 220;
        var y = 80 + Math.floor(index / 4) * 120;
        var id = 'documint-' + index;
        elements.push({
          id: id,
          type: 'rectangle',
          x: x,
          y: y,
          width: 178,
          height: 72,
          angle: 0,
          strokeColor: '#1f6feb',
          backgroundColor: 'transparent',
          fillStyle: 'hachure',
          strokeWidth: 2,
          strokeStyle: 'solid',
          roughness: 1,
          opacity: 100,
          groupIds: [],
          roundness: { type: 3 },
          seed: 1000 + index,
          version: 1,
          versionNonce: 2000 + index,
          isDeleted: false,
          boundElements: null,
          updated: 1,
          link: null,
          locked: false,
        });
        elements.push({
          id: id + '-text',
          type: 'text',
          x: x + 14,
          y: y + 18,
          width: 150,
          height: 32,
          angle: 0,
          strokeColor: '#1f2937',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 1,
          opacity: 100,
          groupIds: [],
          seed: 3000 + index,
          version: 1,
          versionNonce: 4000 + index,
          isDeleted: false,
          boundElements: null,
          updated: 1,
          link: null,
          locked: false,
          text: module.name + '\\n' + module.role + ' | ' + formatCountLabel(module.fileCount, 'file', 'files'),
          fontSize: 14,
          fontFamily: 1,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: 26,
          containerId: null,
          originalText: module.name + '\\n' + module.role + ' | ' + formatCountLabel(module.fileCount, 'file', 'files'),
          lineHeight: 1.25,
        });
      });
      return {
        type: 'excalidraw',
        version: 2,
        source: 'DocuMint',
        elements: elements,
        appState: { viewBackgroundColor: '#ffffff' },
        files: {},
      };
    }

    function enhanceExcalidrawBlueprints() {
      document.querySelectorAll('pre code.language-excalidraw-blueprint').forEach(function (block, index) {
        var data = parseVisualJsonBlock(block);
        if (!data) return;
        var svg = buildWhiteboardSvg(data);
        var excalidrawJson = JSON.stringify(buildExcalidrawJson(data), null, 2);

        var actions = document.createElement('div');
        actions.className = 'visual-panel-actions';
        var svgBtn = makeVisualButton('Download SVG', 'Download whiteboard SVG');
        svgBtn.addEventListener('click', function () { downloadText('whiteboard-' + (index + 1) + '.svg', svg, 'image/svg+xml'); });
        var jsonBtn = makeVisualButton('Download JSON', 'Download Excalidraw JSON');
        jsonBtn.addEventListener('click', function () { downloadText('whiteboard-' + (index + 1) + '.excalidraw', excalidrawJson, 'application/json'); });
        actions.appendChild(svgBtn);
        actions.appendChild(jsonBtn);

        var panel = document.createElement('section');
        panel.className = 'whiteboard-panel';
        panel.appendChild(visualHeader('Excalidraw-style Whiteboard Sketch', 'Hand-drawn style architecture visual', actions));
        var canvas = document.createElement('div');
        canvas.className = 'whiteboard-canvas';
        canvas.innerHTML = svg;
        panel.appendChild(canvas);
        replaceCodeBlock(block, panel);
      });
    }

    function enhanceDependencyGraphs() {
      document.querySelectorAll('pre code.language-dependency-graph').forEach(function (block) {
        var data = parseVisualJsonBlock(block);
        if (!data || !Array.isArray(data.nodes)) return;

        var graphScale = 1;
        var graphPan = { x: 0, y: 0 };
        var graphCanvas = null;
        var actions = document.createElement('div');
        actions.className = 'visual-panel-actions';
        var zoomOutBtn = makeVisualButton('Zoom -', 'Zoom out');
        var resetZoomBtn = makeVisualButton('100%', 'Reset graph zoom');
        var zoomInBtn = makeVisualButton('Zoom +', 'Zoom in');
        actions.appendChild(zoomOutBtn);
        actions.appendChild(resetZoomBtn);
        actions.appendChild(zoomInBtn);

        function applyGraphTransform() {
          if (!graphCanvas) return;
          graphCanvas.style.transform =
            'translate(calc(-50% + ' + graphPan.x + 'px), calc(-50% + ' + graphPan.y + 'px)) scale(' + graphScale + ')';
          resetZoomBtn.textContent = Math.round(graphScale * 100) + '%';
        }

        function setGraphScale(nextScale) {
          graphScale = Math.min(2.2, Math.max(0.65, nextScale));
          applyGraphTransform();
        }

        zoomOutBtn.addEventListener('click', function () { setGraphScale(graphScale - 0.15); });
        zoomInBtn.addEventListener('click', function () { setGraphScale(graphScale + 0.15); });
        resetZoomBtn.addEventListener('click', function () {
          graphScale = 1;
          graphPan = { x: 0, y: 0 };
          applyGraphTransform();
        });

        var panel = document.createElement('section');
        panel.className = 'dependency-graph-panel';
        panel.appendChild(visualHeader(
          'Interactive Dependency Graph',
          data.nodes.length + ' files | ' + ((data.edges || []).length) + ' links',
          actions,
        ));

        var body = document.createElement('div');
        body.className = 'dependency-graph-body';
        var stage = document.createElement('div');
        stage.className = 'dependency-graph-stage';
        graphCanvas = document.createElement('div');
        graphCanvas.className = 'dependency-graph-canvas';
        stage.appendChild(graphCanvas);
        var details = document.createElement('aside');
        details.className = 'dependency-details';
        details.innerHTML =
          '<input class="dependency-search" type="search" placeholder="Filter files..." />' +
          '<div class="dependency-detail-title">Select a file</div>' +
          '<div class="dependency-detail-line">Hover or click a node to inspect file metadata.</div>';

        var positions = {};
        var radiusX = 38;
        var radiusY = 36;
        var centerX = 50;
        var centerY = 50;
        data.nodes.forEach(function (node, index) {
          var angle = (Math.PI * 2 * index) / Math.max(data.nodes.length, 1) - Math.PI / 2;
          positions[node.id] = {
            x: centerX + Math.cos(angle) * radiusX,
            y: centerY + Math.sin(angle) * radiusY,
          };
        });

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        (data.edges || []).forEach(function (edge) {
          var from = positions[edge.from];
          var to = positions[edge.to];
          if (!from || !to) return;
          var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', String(from.x));
          line.setAttribute('y1', String(from.y));
          line.setAttribute('x2', String(to.x));
          line.setAttribute('y2', String(to.y));
          line.setAttribute('stroke', 'currentColor');
          line.setAttribute('stroke-width', '.35');
          line.setAttribute('opacity', '.32');
          line.classList.add('dependency-edge');
          line.setAttribute('data-from', edge.from || '');
          line.setAttribute('data-to', edge.to || '');
          line.setAttribute('data-search', [edge.from, edge.to, edge.label].join(' ').toLowerCase());
          svg.appendChild(line);
        });
        graphCanvas.appendChild(svg);

        function updateEdgeState(activeId, query) {
          stage.querySelectorAll('.dependency-edge').forEach(function (edgeLine) {
            var from = edgeLine.getAttribute('data-from') || '';
            var to = edgeLine.getAttribute('data-to') || '';
            var searchText = edgeLine.getAttribute('data-search') || '';
            var queryMatch = !query || searchText.indexOf(query) !== -1;
            var activeMatch = !!activeId && (from === activeId || to === activeId);
            edgeLine.classList.toggle('dimmed', (!!query && !queryMatch) || (!!activeId && !activeMatch));
            edgeLine.classList.toggle('active', activeMatch);
          });
        }

        function selectNode(node, btn) {
          stage.querySelectorAll('.dependency-node').forEach(function (other) { other.classList.remove('active'); });
          btn.classList.add('active');
          showDetails(node);
          updateEdgeState(node.id, details.querySelector('.dependency-search').value.trim().toLowerCase());
        }

        function showDetails(node) {
          details.querySelector('.dependency-detail-title').textContent = node.path || node.label;
          var lines = [
            'Module: ' + (node.module || 'unknown'),
            'Language: ' + (node.language || 'unknown'),
            'Symbols: ' + (node.symbolCount || 0),
            'Dependency links: ' + (node.dependencyCount || 0),
            'Lines: ' + (node.lineCount || 0),
          ];
          details.querySelectorAll('.dependency-detail-line').forEach(function (line) { line.remove(); });
          lines.forEach(function (line) {
            var el = document.createElement('div');
            el.className = 'dependency-detail-line';
            el.textContent = line;
            details.appendChild(el);
          });
        }

        data.nodes.forEach(function (node) {
          var pos = positions[node.id];
          if (!pos) return;
          var btn = document.createElement('button');
          btn.className = 'dependency-node';
          btn.type = 'button';
          btn.style.left = pos.x + '%';
          btn.style.top = pos.y + '%';
          btn.title = node.path || node.label;
          btn.textContent = node.label || node.path || node.id;
          btn.setAttribute('data-node-id', node.id || '');
          btn.setAttribute('data-search', [node.label, node.path, node.module, node.language].join(' ').toLowerCase());
          btn.addEventListener('mouseenter', function () { showDetails(node); });
          btn.addEventListener('click', function () {
            selectNode(node, btn);
          });
          graphCanvas.appendChild(btn);
        });

        var draggingGraph = false;
        var dragStart = { x: 0, y: 0 };
        var panStart = { x: 0, y: 0 };
        stage.addEventListener('pointerdown', function (event) {
          if (event.target.closest('.dependency-node')) return;
          draggingGraph = true;
          dragStart = { x: event.clientX, y: event.clientY };
          panStart = { x: graphPan.x, y: graphPan.y };
          stage.setPointerCapture(event.pointerId);
        });
        stage.addEventListener('pointermove', function (event) {
          if (!draggingGraph) return;
          graphPan = {
            x: panStart.x + event.clientX - dragStart.x,
            y: panStart.y + event.clientY - dragStart.y,
          };
          applyGraphTransform();
        });
        stage.addEventListener('pointerup', function (event) {
          draggingGraph = false;
          try { stage.releasePointerCapture(event.pointerId); } catch (_err) {}
        });
        stage.addEventListener('pointerleave', function () {
          draggingGraph = false;
        });

        var firstNode = stage.querySelector('.dependency-node');
        if (data.nodes[0] && firstNode) {
          selectNode(data.nodes[0], firstNode);
        }

        var search = details.querySelector('.dependency-search');
        search.addEventListener('input', function () {
          var query = search.value.trim().toLowerCase();
          stage.querySelectorAll('.dependency-node').forEach(function (node) {
            var match = !query || node.getAttribute('data-search').indexOf(query) !== -1;
            node.classList.toggle('dimmed', !match);
          });
          var active = stage.querySelector('.dependency-node.active');
          updateEdgeState(active ? active.getAttribute('data-node-id') : '', query);
        });

        body.appendChild(stage);
        body.appendChild(details);
        panel.appendChild(body);
        applyGraphTransform();
        replaceCodeBlock(block, panel);
      });
    }

    function enhanceVisualBlueprints() {
      enhanceArchitectureBlueprints();
      enhanceCodeWorkflowBlocks();
      enhanceD2SourceBlocks();
      enhanceExcalidrawBlueprints();
      enhanceDependencyGraphs();
    }

    function applyHighlighting() {
      if (typeof hljs === 'undefined') return;
      document.querySelectorAll('pre code:not(.language-mermaid):not(.language-d2):not(.nohighlight)').forEach(function (block) {
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

    function enhanceSidebarNavigation() {
      var nav = document.getElementById('tocNav');
      if (!nav || nav.classList.contains('smart')) return;

      var originalLinks = Array.from(nav.querySelectorAll('.toc-link'));
      if (!originalLinks.length) return;

      function linkText(link) {
        var textNode = link.querySelector('.toc-text');
        return (textNode ? textNode.textContent : link.textContent || '').trim();
      }

      function normalise(text) {
        return text.toLowerCase().replace(/\s+/g, ' ').trim();
      }

      function isVisual(text) {
        var value = normalise(text);
        return (
          value.indexOf('visual blueprint') !== -1 ||
          value.indexOf('architecture map') !== -1 ||
          value.indexOf('editable diagram') !== -1 ||
          value.indexOf('code workflow') !== -1 ||
          value.indexOf('d2') !== -1 ||
          value.indexOf('whiteboard') !== -1 ||
          value.indexOf('dependency graph') !== -1 ||
          value.indexOf('project tree') !== -1
        );
      }

      function isProject(text) {
        var value = normalise(text);
        return (
          value.indexOf('project overview') !== -1 ||
          value.indexOf('project stats') !== -1 ||
          value.indexOf('detected project map') !== -1
        );
      }

      function isAppendix(text) {
        var value = normalise(text);
        return (
          value.indexOf('external dependencies') !== -1 ||
          value.indexOf('generated notes') !== -1 ||
          value.indexOf('appendix') !== -1
        );
      }

      function isFilePath(text, link) {
        var value = text.trim();
        if (!value || /[(){}:]/.test(value) || /\s/.test(value)) return false;
        return /(^|\/)[^/]+\.[a-z0-9][a-z0-9-]*$/i.test(value);
      }

      function fileSectionKey(text) {
        return normalise(text).replace(/[^a-z0-9]+/g, ' ').trim();
      }

      function isUsefulFileSection(text) {
        var value = normalise(text);
        if (!value) return false;
        if (
          value === 'module metadata' ||
          value === 'documint quality check' ||
          value === 'metadata' ||
          value.indexOf('metadata:') === 0 ||
          value.indexOf('metadata (') === 0
        ) {
          return false;
        }

        var usefulSections = {
          'what this does': true,
          'key things it can do': true,
          'what goes in / what comes out': true,
          'overview': true,
          'architecture & design': true,
          'api reference': true,
          'dependencies': true,
          'dependencies and data flow': true,
          'configuration and environment': true,
          'errors and recovery': true,
          'usage examples': true,
          'security considerations': true,
          'known limitations & edge cases': true,
          'quick start': true,
          'see also': true,
        };

        return usefulSections[value] === true;
      }

      function setLinkLabel(link, label) {
        var textNode = link.querySelector('.toc-text');
        if (textNode) {
          textNode.textContent = label;
        } else {
          link.textContent = label;
        }
      }

      function cloneLink(link, extraClass, displayText, searchText) {
        var clone = link.cloneNode(true);
        if (extraClass) clone.classList.add(extraClass);
        if (displayText) setLinkLabel(clone, displayText);
        clone.setAttribute('data-toc-text', (searchText || linkText(link)).toLowerCase());
        if (searchText) clone.setAttribute('title', searchText);
        return clone;
      }

      function makeGroup(id, icon, title, items, open, countLabel) {
        var details = document.createElement('details');
        details.className = 'smart-toc-group';
        details.setAttribute('data-group', id);
        if (open || items.length <= 8) details.open = true;

        var summary = document.createElement('summary');
        summary.className = 'smart-toc-summary';
        summary.innerHTML =
          '<span class="smart-toc-icon">' + icon + '</span>' +
          '<span>' + escapeVisualHtml(title) + '</span>' +
          '<span class="smart-toc-count">' + escapeVisualHtml(countLabel == null ? String(items.length) : String(countLabel)) + '</span>';

        var body = document.createElement('div');
        body.className = 'smart-toc-items';
        if (items.length) {
          items.forEach(function (item) { body.appendChild(item); });
        } else {
          body.innerHTML = '<div class="smart-toc-empty">No sections</div>';
        }

        details.appendChild(summary);
        details.appendChild(body);
        return details;
      }

      var projectLinks = [];
      var visualLinks = [];
      var appendixLinks = [];
      var fileRoot = { name: '', folders: new Map(), files: [] };
      var fileSeen = false;
      var currentFileNode = null;
      var fileCount = 0;

      function makeFileNode(path, link) {
        return { path: path, link: link, sectionKeys: new Set() };
      }

      function insertFileNode(path, link) {
        var parts = path.split('/').filter(Boolean);
        if (!parts.length) return null;
        var fileName = parts.pop();
        var cursor = fileRoot;
        parts.forEach(function (part) {
          if (!cursor.folders.has(part)) {
            cursor.folders.set(part, { name: part, folders: new Map(), files: [] });
          }
          cursor = cursor.folders.get(part);
        });
        var fileNode = makeFileNode(path, link);
        cursor.files.push(fileNode);
        return fileNode;
      }

      function renderFileTreeNode(node, depth) {
        var container = document.createElement('div');
        container.className = depth === 0 ? 'file-tree' : 'file-tree-folder-children';

        Array.from(node.folders.values())
          .sort(function (a, b) { return a.name.localeCompare(b.name); })
          .forEach(function (folder) {
            var details = document.createElement('details');
            details.className = 'file-tree-folder';
            details.open = depth < 2;
            details.setAttribute('data-folder-text', folder.name.toLowerCase());

            var summary = document.createElement('summary');
            summary.className = 'file-tree-summary';
            summary.innerHTML =
              '<span class="tree-node-icon file-tree-node-icon folder" aria-hidden="true"></span>' +
              '<span class="file-tree-folder-name" title="' + escapeVisualHtml(folder.name) + '">' + escapeVisualHtml(folder.name) + '</span>';

            details.appendChild(summary);
            details.appendChild(renderFileTreeNode(folder, depth + 1));
            container.appendChild(details);
          });

        node.files
          .sort(function (a, b) { return a.path.localeCompare(b.path); })
          .forEach(function (fileNode) {
            var fileWrap = document.createElement('div');
            fileWrap.className = 'file-tree-file';
            fileWrap.setAttribute('data-file-text', fileNode.path.toLowerCase());
            if (!fileNode.link.querySelector('.file-tree-node-icon.file')) {
              var fileIcon = document.createElement('span');
              fileIcon.className = 'tree-node-icon file-tree-node-icon file';
              fileIcon.setAttribute('aria-hidden', 'true');
              fileNode.link.insertBefore(fileIcon, fileNode.link.firstChild);
            }
            fileWrap.appendChild(fileNode.link);
            container.appendChild(fileWrap);
          });

        return container;
      }

      function fileLinkFromPath(path) {
        var normalisedPath = path.replace(/\\/g, '/');
        var label = normalisedPath.split('/').filter(Boolean).pop() || normalisedPath;
        var match = originalLinks.find(function (link) {
          return linkText(link).replace(/\\/g, '/') === normalisedPath;
        });
        if (match) {
          return cloneLink(match, 'file-link', label, normalisedPath);
        }

        var link = document.createElement('a');
        link.href = '#';
        link.className = 'toc-link level-1 file-link';
        link.innerHTML = '<span class="toc-text">' + escapeVisualHtml(label) + '</span>';
        link.setAttribute('data-toc-text', normalisedPath.toLowerCase());
        link.setAttribute('title', normalisedPath);
        return link;
      }

      function insertProjectTreePath(path) {
        return insertFileNode(path, fileLinkFromPath(path));
      }

      function buildFileRootFromProjectTreeBlock() {
        var block = document.querySelector('pre code.language-project-tree');
        if (!block) return false;
        var lines = (block.textContent || '').split(/\r?\n/).filter(function (line) {
          return line.trim();
        });
        if (lines.length <= 1) return false;

        var stack = [];
        lines.slice(1).forEach(function (line) {
          var match = line.match(/^((?:\|   |    )*)(?:\|-- |\x60-- )(.+)$/);
          if (!match) return;
          var depth = Math.floor((match[1] || '').length / 4);
          var label = (match[2] || '').trim();
          var cleanLabel = label.replace(/\s+\[[^\]]+\]\s*$/, '');
          if (!cleanLabel) return;

          stack = stack.slice(0, depth);
          if (cleanLabel.endsWith('/')) {
            stack[depth] = cleanLabel.replace(/\/+$/, '');
            return;
          }

          var fullPath = stack.concat(cleanLabel).filter(Boolean).join('/');
          if (fullPath) {
            insertProjectTreePath(fullPath);
            fileCount++;
            fileSeen = true;
          }
        });

        return fileCount > 0;
      }

      function buildFileRootFromProjectTreeVisual() {
        var rows = Array.from(document.querySelectorAll('.project-tree-visual .project-tree-row'));
        if (rows.length <= 1) return false;

        var stack = [];
        rows.forEach(function (row, index) {
          if (index === 0) return;
          var type = row.getAttribute('data-tree-type') || '';
          var name = row.getAttribute('data-tree-name') || '';
          var depth = Number(row.getAttribute('data-tree-depth') || '0');
          if (!name) return;

          if (type === 'folder') {
            stack = stack.slice(0, Math.max(0, depth - 1));
            stack[depth - 1] = name;
            return;
          }

          if (type === 'file') {
            var fullPath = stack.slice(0, Math.max(0, depth - 1)).concat(name).filter(Boolean).join('/');
            if (fullPath) {
              insertProjectTreePath(fullPath);
              fileCount++;
              fileSeen = true;
            }
          }
        });

        return fileCount > 0;
      }

      var builtFromProjectTree = buildFileRootFromProjectTreeBlock() || buildFileRootFromProjectTreeVisual();

      originalLinks.forEach(function (link) {
        var text = linkText(link);
        if (!text) return;

        if (isVisual(text)) {
          visualLinks.push(cloneLink(link, 'visual-link'));
          return;
        }

        if (!builtFromProjectTree) {
          if (isFilePath(text, link)) {
            fileSeen = true;
            fileCount++;
            var fileName = text.replace(/\\/g, '/').split('/').filter(Boolean).pop() || text;
            currentFileNode = insertFileNode(text, cloneLink(link, 'file-link', fileName, text));
            return;
          }

          if (currentFileNode && isUsefulFileSection(text)) {
            var key = fileSectionKey(text);
            if (key && !currentFileNode.sectionKeys.has(key)) {
              currentFileNode.sectionKeys.add(key);
            }
            return;
          }
        }

        if (isAppendix(text)) {
          appendixLinks.push(cloneLink(link, 'appendix-link'));
          return;
        }

        if (!fileSeen || isProject(text)) {
          projectLinks.push(cloneLink(link, 'project-link'));
          return;
        }

        if (builtFromProjectTree) {
          return;
        }

        if (!currentFileNode) {
          appendixLinks.push(cloneLink(link, 'appendix-link'));
        }
      });

      var smartNav = document.createDocumentFragment();
      smartNav.appendChild(makeGroup('project', 'P', 'Project', projectLinks, true));
      smartNav.appendChild(makeGroup('visuals', 'V', 'Visual Blueprints', visualLinks, true));

      var fileItems = [renderFileTreeNode(fileRoot, 0)];
      smartNav.appendChild(makeGroup('project-tree', 'T', 'Project Tree', fileItems, true, fileCount + ' files'));

      if (appendixLinks.length) {
        smartNav.appendChild(makeGroup('appendix', 'A', 'Appendix', appendixLinks, false));
      }

      nav.innerHTML = '';
      nav.classList.add('smart');
      nav.appendChild(smartNav);

      var filter = document.getElementById('sidebarFilter');
      if (filter) {
        filter.addEventListener('input', function () {
          var query = filter.value.trim().toLowerCase();
          nav.querySelectorAll('.toc-link').forEach(function (link) {
            var text = link.getAttribute('data-toc-text') || linkText(link).toLowerCase();
            link.classList.toggle('smart-hidden', !!query && text.indexOf(query) === -1);
          });

          nav.querySelectorAll('.file-tree-folder').forEach(function (folder) {
            var folderText = folder.getAttribute('data-folder-text') || '';
            var visibleLinks = Array.from(folder.querySelectorAll('.toc-link')).some(function (link) {
              return !link.classList.contains('smart-hidden');
            });
            var folderMatch = !!query && folderText.indexOf(query) !== -1;
            folder.classList.toggle('smart-hidden', !!query && !visibleLinks && !folderMatch);
            if (query && (visibleLinks || folderMatch)) folder.open = true;
          });

          nav.querySelectorAll('.file-tree-file').forEach(function (file) {
            var fileText = file.getAttribute('data-file-text') || '';
            var visibleLinks = Array.from(file.querySelectorAll('.toc-link')).some(function (link) {
              return !link.classList.contains('smart-hidden');
            });
            var fileMatch = !!query && fileText.indexOf(query) !== -1;
            file.classList.toggle('smart-hidden', !!query && !visibleLinks && !fileMatch);
          });

          nav.querySelectorAll('.smart-toc-group').forEach(function (group) {
            var visible = Array.from(group.querySelectorAll('.toc-link,.file-tree-folder,.file-tree-file')).some(function (item) {
              return !item.classList.contains('smart-hidden');
            });
            group.classList.toggle('smart-hidden', !!query && !visible);
            if (query && visible) group.open = true;
          });
        });
      }
    }

    // ── Theme ────────────────────────────────────────────────────────────────
    function readStoredValue(key, fallback) {
      try {
        return window.localStorage ? (window.localStorage.getItem(key) || fallback) : fallback;
      } catch (_err) {
        return fallback;
      }
    }

    function writeStoredValue(key, value) {
      try {
        if (window.localStorage) window.localStorage.setItem(key, value);
      } catch (_err) {
        // Storage can be blocked in some local/VS Code preview contexts.
      }
    }

    var theme = readStoredValue('doc-theme', 'dark');
    setTheme(theme);

    function setTheme(t) {
      theme = t;
      document.documentElement.setAttribute('data-theme', t);
      writeStoredValue('doc-theme', t);
      var label = document.getElementById('themeLabel');
      var hljsLink = document.getElementById('hljs-theme');
      if (label) label.textContent = t === 'dark' ? 'Light' : 'Dark';
      if (hljsLink) {
        hljsLink.href = t === 'dark'
          ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
          : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
      }
    }

    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        reinitMermaid();
      });
    }

    // ── Back to top ──────────────────────────────────────────────────────────
    var btt = document.getElementById('btt');
    window.addEventListener('scroll', function () {
      if (!btt) return;
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
    function escHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    if (inp && drop) inp.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (q.length < 2) { drop.classList.remove('open'); drop.innerHTML = ''; return; }

      var hits = searchIndex.filter(function (it) {
        return it.text.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 10);

      if (!hits.length) {
        drop.innerHTML = '<div class="search-empty">No results for &ldquo;' + escHtml(q) + '&rdquo;</div>';
        drop.classList.add('open');
        return;
      }

      var safeQ = escHtml(q);
      var re = new RegExp('(' + escRe(safeQ) + ')', 'gi');
      drop.innerHTML = hits.map(function (it) {
        var hi = escHtml(it.text).replace(re, '<mark>$1</mark>');
        var fileNote = it.file && it.file !== it.text
          ? '<div class="search-item-file">' + escHtml(it.file) + '</div>' : '';
        return '<div class="search-item" data-id="' + escHtml(it.id || '') + '">'
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
      if (!drop) return;
      if (!e.target.closest('.search-wrap')) drop.classList.remove('open');
    });

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea')) {
        if (e.key === 'Escape' && drop && inp) { drop.classList.remove('open'); inp.blur(); }
        return;
      }
      if (e.key === '/' && inp) { e.preventDefault(); inp.focus(); inp.select(); }
      if (e.key === 't' || e.key === 'T') { setTheme(theme === 'dark' ? 'light' : 'dark'); }
    });

    // ── Init ─────────────────────────────────────────────────────────────────
    var initDone = false;
    function runInit() {
      if (initDone) return;
      initDone = true;
      initMermaid();          // async — fire and forget
      enhanceProjectTreeVisuals();
      enhanceVisualBlueprints();
      applyHighlighting();
      enhanceCodeBlocks();
      addAnchors();
      enhanceSidebarNavigation();
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
  <footer class="doc-footer">
    <div class="doc-footer-inner">
      ${footerLogoHtml}
      <span>Generated by <strong>DocuMint</strong> - Documentation Generator</span>
    </div>
  </footer>
</body>
</html>`;
}
