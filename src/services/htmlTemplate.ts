import { buildHtmlBaseScript } from "./htmlBaseScript";
import { HTML_BASE_STYLES } from "./htmlBaseStyles";
import { READER_STYLES } from "./htmlReaderStyles";
import {
  renderLocalCodeMapFragments,
} from "./htmlLocalCodeMap";
import type { LocalCodeMapData } from "./localCodeMapData";
import {
  formatGeneratedTimestamp,
  resolveHtmlExternalAssets,
  resolveHtmlLocalSurfaceChrome,
} from "./htmlTemplatePolicy";

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
  localCodeMap?: LocalCodeMapData;
  externalAssets?: boolean;
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
  const localCodeMap = renderLocalCodeMapFragments(options.localCodeMap);
  const {
    highlightThemeLink,
    externalScriptTags,
    highlightThemeDark,
    highlightThemeLight,
  } = resolveHtmlExternalAssets(options.externalAssets !== false);
  const {
    tocHtml: localCodeMapToc,
    keyboardHints,
  } = resolveHtmlLocalSurfaceChrome(Boolean(options.localCodeMap));

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
  ${highlightThemeLink}
  <style>
${HTML_BASE_STYLES}
    ${READER_STYLES}
    ${localCodeMap.styles}
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
      <nav class="toc-nav" id="tocNav">${localCodeMapToc}${options.tocHtml}</nav>
    </div>
  </aside>

  <main class="main" id="mainContent">
    <header class="client-heading">
      <div class="client-name-highlight">${safeProjectName}</div>
    </header>
    <div class="stats-banner">${statsHtml}</div>
    ${localCodeMap.markup}
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

  <div class="kb-hints">${keyboardHints}</div>

  ${externalScriptTags}
  <script>
${buildHtmlBaseScript({ highlightThemeDark, highlightThemeLight })}
  </script>
  ${localCodeMap.script}
  <footer class="doc-footer">
    <div class="doc-footer-inner">
      ${footerLogoHtml}
      <span>Generated by <strong>DocuMint</strong> - Documentation Generator</span>
    </div>
  </footer>
</body>
</html>`;
}
