/** Reader layout extends the existing soft palette without changing report content. */
export const READER_STYLES = String.raw`
.documint-jelly-ui .sidebar { padding: 0; overflow: hidden; }
.documint-jelly-ui .sidebar-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 12px 0 0; }
.documint-jelly-ui .sidebar-head { position: relative; flex: none; margin: 0 12px 10px; }
.documint-jelly-ui .sidebar-tools { flex: none; margin: 0 12px 8px; gap: 7px; }
.documint-jelly-ui .toc-nav { flex: 1; min-height: 0; overflow: auto; padding: 2px 12px 20px; overscroll-behavior: contain; scrollbar-gutter: stable; }
.reader-filter-wrap { position: relative; }
.documint-jelly-ui .reader-filter-wrap .sidebar-filter { padding-right: 48px; }
.reader-filter-clear { position: absolute; top: 4px; right: 4px; height: 28px; padding: 0 7px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 11px; }
.reader-filter-clear:hover { background: var(--jelly-surface-hover); color: var(--text-primary); }
.reader-tree-actions { display: flex; gap: 6px; }
.reader-button { display: inline-flex; align-items: center; justify-content: center; min-height: 32px; padding: 5px 9px; border: 1px solid var(--jelly-border); border-radius: 8px; background: var(--jelly-surface-strong); color: var(--text-secondary); font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }
.reader-button:hover { color: var(--text-primary); border-color: var(--jelly-border-accent); background: var(--jelly-surface-hover); }
.reader-button:disabled { cursor: default; opacity: .45; }
.reader-tree-actions .reader-button { flex: 1; }
.reader-filter-status { color: var(--text-muted); font-size: 11px; min-height: 18px; padding: 0 2px; }
.reader-folder-count { margin-left: auto; color: var(--text-muted); font-size: 10px; font-weight: 500; font-variant-numeric: tabular-nums; }
.documint-jelly-ui .file-tree-folder-name { flex: 1; }
.documint-jelly-ui .file-tree .file-link { font-weight: 500; }
.documint-jelly-ui .file-tree .file-link.active { background: var(--accent-subtle); color: var(--accent); font-weight: 650; }
.documint-jelly-ui .file-tree-summary { min-height: 32px; font-weight: 600; }
.documint-jelly-ui .file-tree-summary::before { content: ''; width: 6px; height: 6px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg); margin: 0 5px 3px 2px; }
.documint-jelly-ui .file-tree-folder:not([open]) > .file-tree-summary::before { content: ''; transform: rotate(-45deg); margin-bottom: 0; }
.reader-context { position: sticky; top: 78px; z-index: 800; display: flex; align-items: center; gap: 12px; min-height: 54px; padding: 9px 12px; margin-bottom: 22px; border: 1px solid var(--jelly-border); border-radius: 12px; background: var(--jelly-surface-strong); box-shadow: var(--jelly-shadow-soft); }
.reader-location { flex: 1; min-width: 0; line-height: 1.45; }
.reader-location-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: .08em; color: var(--text-muted); text-transform: uppercase; }
.reader-location-text { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reader-outline { width: min(230px, 32%); min-width: 0; min-height: 32px; padding: 5px 8px; border: 1px solid var(--jelly-border); border-radius: 8px; font: inherit; font-size: 11px; color: var(--text-secondary); background: var(--bg-secondary); }
.documint-jelly-ui .main [id] { scroll-margin-top: 154px; }
.documint-jelly-ui .main { min-width: 0; }
.reader-table-scroll { max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; border-radius: 14px; margin: 14px 0; }
.documint-jelly-ui .main .reader-table-scroll table { display: table; margin: 0; width: 100%; max-width: none; }
.documint-jelly-ui .main p, .documint-jelly-ui .main li { overflow-wrap: anywhere; }
.documint-jelly-ui .main h1, .documint-jelly-ui .main h2 { overflow-wrap: anywhere; }
.documint-jelly-ui .main h1 code, .documint-jelly-ui .main h2 code { min-width: 0; overflow-wrap: anywhere; }
.documint-jelly-ui .search-dropdown { overflow-y: auto; max-height: min(420px, 70vh); }
.documint-jelly-ui .search-item[aria-selected="true"] { background: var(--accent-subtle); box-shadow: inset 3px 0 0 var(--accent); }
.reader-search-status { padding: 8px 14px; font-size: 10px; color: var(--text-muted); border-bottom: 1px solid var(--jelly-border); }
.reader-menu, .reader-close, .reader-overlay { display: none; }
.reader-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.documint-jelly-ui .doc-footer { margin-left: var(--sidebar-w); }
@media (max-width: 768px) {
  .documint-jelly-ui .reader-menu { display: inline-flex; flex: none; min-width: 34px; min-height: 36px; padding: 5px; font-size: 18px; }
  .documint-jelly-ui .reader-close { display: inline-flex; position: absolute; top: 8px; right: 8px; min-width: 32px; font-size: 16px; }
  .documint-jelly-ui .sidebar { display: block; position: fixed; top: 78px; left: 8px; bottom: 8px; width: min(340px, calc(100vw - 32px)); height: auto; z-index: 2200; border: 1px solid var(--jelly-border); border-radius: 14px; background: var(--bg-secondary); visibility: hidden; transform: translateX(calc(-100% - 16px)); pointer-events: none; }
  .documint-jelly-ui.reader-drawer-open .sidebar { visibility: visible; transform: none; pointer-events: auto; }
  .reader-drawer-open { overflow: hidden; }
  .reader-overlay { display: block; position: fixed; inset: 0; border: 0; background: rgba(5, 10, 18, .56); z-index: 2100; visibility: hidden; pointer-events: none; }
  .reader-drawer-open .reader-overlay { visibility: visible; pointer-events: auto; }
  .documint-jelly-ui .sidebar-head { padding-right: 48px; }
  .documint-jelly-ui .topbar { gap: 6px; }
  .documint-jelly-ui .topbar-client { max-width: 28vw; padding-left: 6px; padding-right: 4px; font-size: 12px; flex-shrink: 1; }
  .documint-jelly-ui .topbar-sep, .documint-jelly-ui .topbar-spacer { display: none; }
  .documint-jelly-ui .search-wrap { min-width: 60px; flex: 1; }
  .documint-jelly-ui .search-input { min-height: 36px; font-size: 12px; padding-right: 8px; }
  .documint-jelly-ui .search-kbd { display: none; }
  .documint-jelly-ui .search-dropdown { position: fixed; top: 62px; left: 0; right: 0; max-height: 65vh; }
  .reader-context { top: 76px; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
  .reader-location { flex-basis: calc(100% - 100px); }
  .reader-outline { width: 100%; }
  .documint-jelly-ui .main [id] { scroll-margin-top: 192px; }
  .documint-jelly-ui .main table { display: block; max-width: 100%; overflow-x: auto; }
  .documint-jelly-ui .main p, .documint-jelly-ui .main li, .documint-jelly-ui .main :not(pre) > code { overflow-wrap: anywhere; }
  .documint-jelly-ui .generated-stamp { flex-wrap: wrap; }
  .documint-jelly-ui .architecture-grid { grid-template-columns: minmax(0, 1fr); }
  .documint-jelly-ui .architecture-pie-panel { grid-template-columns: minmax(0, 1fr); }
  .documint-jelly-ui .visual-panel-header { flex-wrap: wrap; }
  .documint-jelly-ui .visual-panel-meta { white-space: normal; }
}
@media (max-width: 480px) {
  .documint-jelly-ui #themeLabel { display: none; }
  .documint-jelly-ui .theme-btn { min-height: 36px; min-width: 32px; padding: 7px; }
}
@media print {
  .documint-jelly-ui .reader-context, .reader-overlay, .reader-menu { display: none !important; }
  .documint-jelly-ui .main { margin: 0; width: 100%; padding: 0; }
  .documint-jelly-ui .doc-footer { margin-left: 0; }
}
`;
