#!/usr/bin/env node
/**
 * Export a single self-contained HTML shell from the actual DocuMint Local
 * renderer's CSS, markup and JavaScript source. This is a build-time tool only;
 * installed skills need no Node.js runtime to display the generated HTML.
 *
 * Node built-ins only. Fail if the canonical renderer changes shape, rather
 * than silently shipping a stale/incompatible interpretation of its sources.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const dest = resolve(repo, 'plugins/documint/skills/documenting-codebases/assets/documint-renderer.html');
const read = (base) => readFileSync(resolve(repo, 'src/services', `${base}.ts`), 'utf8');

function raw(source, prefix) {
  const i = source.indexOf(prefix);
  if (i < 0) throw new Error(`Renderer source prefix missing: ${prefix}`);
  const start = i + prefix.length;
  const end = source.indexOf('`;', start);
  if (end < 0) throw new Error(`Unterminated renderer asset: ${prefix}`);
  return source.slice(start, end);
}
function extract(base, prefix) { return raw(read(base), prefix); }
function singleReplace(text, marker, replacement) {
  if (text.split(marker).length !== 2) throw new Error(`Renderer marker missing/duplicated: ${marker}`);
  return text.replace(marker, replacement);
}
const NONCE = '__DOCUMINT_CSP_NONCE__';
const DATA = '__DOCUMINT_DATA_BASE64__';

const ENRICH_SCRIPT = String.raw`
<script nonce="__DOCUMINT_CSP_NONCE__">
(function () {
  'use strict';
  const node = document.getElementById('documintLocalCodeMapData');
  if (!node) return;
  let data;
  try { data = JSON.parse(node.textContent || '{}'); } catch (_) { return; }
  const summary = data.summary || {};
  const provenance = data.provenance || {};
  const projectName = String(data.projectName || 'Project');
  document.title = projectName + ' — Documentation';
  for (const selector of ['.topbar-client', '.sidebar-project-name', '.client-name-highlight']) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = projectName;
      element.title = projectName;
    }
  }
  const setText = (id, content) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(content);
  };
  setText('documintEmbeddedFiles', summary.files ?? 0);
  setText('documintEmbeddedLanguages', (summary.languages || []).map(item => item.name).join(', ') || 'Mixed');
  setText('documintEmbeddedLines', summary.lines ?? 0);
  const stamp = document.querySelector('.generated-stamp');
  if (stamp) {
    stamp.textContent = 'DocuMint · ' + (provenance.analysisMode || 'source-backed') + ' data';
    stamp.setAttribute('aria-label', 'Documentation data origin');
  }
  const evidence = document.getElementById('documint-embedded-evidence');
  if (evidence) {
    const title = document.createElement('strong');
    title.textContent = 'Source coverage and limitations';
    evidence.appendChild(title);
    const detail = document.createElement('p');
    const inspected = Number(provenance.inspectedFiles || 0);
    const indexed = Number(provenance.indexedFiles || 0);
    detail.textContent = inspected + ' files inspected / ' + indexed +
      ' files indexed · ' + String(provenance.analysisMode || 'unverified') +
      ' · revision: ' + String(provenance.revision || 'not pinned') +
      ' · source: ' + String(provenance.source || 'not specified') +
      '. Source-derived facts are not a runtime audit. Unread files have unverified contents.';
    evidence.appendChild(detail);
    if (provenance.notes) {
      const note = document.createElement('p');
      note.textContent = String(provenance.notes);
      evidence.appendChild(note);
    }
  }
  const docs = document.getElementById('documint-embedded-docs');
  if (docs) {
    for (const section of Array.isArray(data.documentationSections) ? data.documentationSections : []) {
      if (!section || typeof section.heading !== 'string') continue;
      const h = document.createElement('h2');
      h.textContent = section.heading;
      docs.appendChild(h);
      for (const paragraph of Array.isArray(section.paragraphs) ? section.paragraphs : []) {
        const p = document.createElement('p');
        p.textContent = String(paragraph);
        docs.appendChild(p);
      }
      if (Array.isArray(section.items) && section.items.length) {
        const ul = document.createElement('ul');
        for (const item of section.items) {
          const li = document.createElement('li');
          li.textContent = String(item);
          ul.appendChild(li);
        }
        docs.appendChild(ul);
      }
    }
  }
})();
</script>`;

export function buildEmbeddedRendererShell() {
  const baseStyles = extract('htmlBaseStyles', 'HTML_BASE_STYLES = String.raw`');
  const readerStyles = extract('htmlReaderStyles', 'READER_STYLES = String.raw`');
  const localStyles = extract('htmlLocalCodeMap', 'LOCAL_CODE_MAP_STYLES = String.raw`');
  let localMarkup = extract('htmlLocalCodeMap', 'LOCAL_CODE_MAP_MARKUP = String.raw`');
  localMarkup = singleReplace(localMarkup, '<script type="application/json"', `<script nonce="${NONCE}" type="application/json"`);
  let localScript = extract('htmlLocalCodeMap', 'return String.raw`');
  localScript = localScript.replaceAll('${nonceAttribute}', ` nonce="${NONCE}"`);
  localScript = singleReplace(localScript, '${JSON.stringify(json)}', `atob('${DATA}')`);
  let baseScript = extract('htmlBaseScript', 'return String.raw`');
  baseScript = baseScript
    .replaceAll('${options.highlightThemeDark}', '')
    .replaceAll('${options.highlightThemeLight}', '')
    .replaceAll('${READER_NAVIGATION_SCRIPT}', extract('htmlReaderNavigation', 'READER_NAVIGATION_SCRIPT = String.raw`'))
    .replaceAll('${READER_SEARCH_SCRIPT}', extract('htmlReaderSearch', 'READER_SEARCH_SCRIPT = String.raw`'));

  let html = extract('htmlTemplate', 'return String.raw`');
  html = singleReplace(html,
    '${scriptNonce ? ` nonce="${escapeHtmlAttr(scriptNonce)}"` : ""}',
    ` nonce="${NONCE}"`);
  const substitutions = {
    '${contentSecurityPolicy}': `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${NONCE}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src 'none'; object-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none';">`,
    '${safeTitle}': 'DocuMint — Interactive Documentation',
    '${highlightThemeLink}': '',
    '${HTML_BASE_STYLES}': baseStyles,
    '${READER_STYLES}': readerStyles,
    '${localCodeMap.styles}': localStyles,
    '${bodyClassName}': 'documint-jelly-ui documint-local-report',
    '${safeProjectName}': 'DocuMint Project',
    '${localCodeMapToc}': '<ul><li><a class="toc-link level-1" href="#documint-local-code-map"><span class="toc-text">Project map</span></a></li></ul>',
    '${options.tocHtml}': '',
    '${statsHtml}': '<div class="stat-item"><span class="stat-label">Files</span><span class="stat-value accent" id="documintEmbeddedFiles">—</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-label">Languages</span><span class="stat-value" id="documintEmbeddedLanguages">—</span></div><div class="stat-divider"></div><div class="stat-item"><span class="stat-label">Lines of Code</span><span class="stat-value" id="documintEmbeddedLines">—</span></div>',
    '${localCodeMap.markup}': localMarkup,
    '${options.contentHtml}': '<section id="documint-embedded-evidence" style="max-width:1120px;margin:16px auto;padding:14px;border:1px solid var(--border);border-radius:12px" aria-label="Analysis provenance"></section><section id="documint-embedded-docs" style="max-width:1120px;margin:32px auto" aria-label="Source-grounded documentation"></section>',
    '${keyboardHints}': '<kbd>Ctrl/⌘ K</kbd> Files &nbsp; <kbd>/</kbd> Docs &nbsp; <kbd>T</kbd> Theme',
    '${externalScriptTags}': '',
    '${buildHtmlBaseScript({ highlightThemeDark, highlightThemeLight })}': baseScript,
    '${localCodeMap.script}': localScript,
    '${footerLogoHtml}': '',
  };
  for (const [marker, replacement] of Object.entries(substitutions)) {
    if (!html.includes(marker)) throw new Error(`Renderer substitution missing: ${marker}`);
    html = html.replaceAll(marker, replacement);
  }
  html = singleReplace(html, '  <footer class="doc-footer">', `${ENRICH_SCRIPT}\n  <footer class="doc-footer">`);
  if (/\$\{[^}]+\}/.test(html)) throw new Error('Unresolved renderer template expression');
  if (html.split(DATA).length !== 2) throw new Error('Expected exactly one data placeholder');
  if (!html.includes('data-documint-local-code-map') || !html.includes('renderTreemap')) {
    throw new Error('Canonical interactive map components were not exported');
  }
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).filter(s => s.trim());
  for (const script of scripts) new Function(script); // syntax-only check; does not execute browser code
  return html;
}

const mode = process.argv[2] || '--write';
if (!['--write', '--check'].includes(mode)) throw new Error('Use --write or --check');
const html = buildEmbeddedRendererShell();
if (mode === '--write') {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html, 'utf8');
  process.stdout.write(`Wrote ${dest} (${html.length} characters)\n`);
} else if (readFileSync(dest, 'utf8') !== html) {
  throw new Error('Embedded HTML renderer snapshot is out of sync with canonical renderer sources');
} else {
  process.stdout.write('Embedded HTML renderer snapshot matches original renderer source\n');
}
