/** Ranked, escaped browser search shared by Local and AI-format documents. */
export const READER_SEARCH_SCRIPT = String.raw`
var searchIndex = [], searchHits = [], searchSelection = -1;
var inp = document.getElementById('searchInput');
var drop = document.getElementById('searchDropdown');
function buildIndex() {
  searchIndex = [];
  var headingId = '', ownerPath = '', headingLevel = 0;
  var filePaths = new Map();
  document.querySelectorAll('#tocNav .file-link').forEach(function (link) {
    filePaths.set((link.getAttribute('href') || '').slice(1), link.title || readerLabel(link));
  });
  document.querySelectorAll('.main h1, .main h2, .main h3, .main h4, .main h5, .main h6, .main p').forEach(function (element, order) {
    var isHeading = /^H[1-6]$/.test(element.tagName);
    var text = readerLabel(element);
    if (isHeading) {
      headingId = element.id;
      var level = Number(element.tagName.slice(1));
      if (filePaths.has(headingId)) { ownerPath = filePaths.get(headingId); headingLevel = level; }
      else if (level <= headingLevel) { ownerPath = ''; headingLevel = 0; }
    }
    if (!text || !headingId || !document.getElementById(headingId)) return;
    searchIndex.push({ text: text, id: headingId, file: ownerPath, fileHeading: isHeading && filePaths.has(headingId), heading: isHeading, order: order });
  });
}
function closeReaderSearch() {
  if (!drop || !inp) return;
  drop.classList.remove('open'); inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); searchSelection = -1;
}
function selectReaderSearch(index) {
  var options = Array.from(drop.querySelectorAll('[role="option"]'));
  if (!options.length) return;
  searchSelection = Math.max(0, Math.min(index, options.length - 1));
  options.forEach(function (option, i) { option.setAttribute('aria-selected', String(i === searchSelection)); });
  inp.setAttribute('aria-activedescendant', options[searchSelection].id);
  options[searchSelection].scrollIntoView({ block: 'nearest' });
}
function chooseReaderSearch(index) {
  var hit = searchHits[index];
  if (!hit) return;
  closeReaderSearch(); inp.value = '';
  if (readerNavigate) readerNavigate(hit.id, true);
  else document.getElementById(hit.id).scrollIntoView({ block: 'start' });
}
function searchRank(item, query, tokens) {
  var text = item.text.toLowerCase(), path = item.file.toLowerCase();
  if (!tokens.every(function (token) { return (text + ' ' + path).indexOf(token) >= 0; })) return -1;
  var filename = path.split('/').pop();
  if (item.fileHeading && filename === query) return 1000;
  if (item.fileHeading && path === query) return 950;
  if (item.fileHeading && filename.indexOf(query) === 0) return 850;
  if (item.heading && text === query) return 800;
  if (item.fileHeading) return 700;
  if (item.heading && text.indexOf(query) === 0) return 600;
  return item.heading ? 500 : 100;
}
function appendSearchHighlight(element, value, query) {
  // Text nodes avoid interpreting user input or source text as HTML.
  var at = value.toLowerCase().indexOf(query);
  if (at < 0) { element.textContent = value; return; }
  element.appendChild(document.createTextNode(value.slice(0, at)));
  var mark = document.createElement('mark'); mark.textContent = value.slice(at, at + query.length); element.appendChild(mark);
  element.appendChild(document.createTextNode(value.slice(at + query.length)));
}
function renderReaderSearch() {
  var query = inp.value.trim().toLowerCase();
  if (query.length < 2) { closeReaderSearch(); drop.replaceChildren(); searchHits = []; return; }
  var tokens = query.split(/\s+/).filter(Boolean), best = new Map();
  searchIndex.forEach(function (item) {
    var rank = searchRank(item, query, tokens);
    if (rank < 0) return;
    var previous = best.get(item.id);
    if (!previous || rank > previous.rank) best.set(item.id, { item: item, rank: rank });
  });
  var matches = Array.from(best.values()).sort(function (a, b) { return b.rank - a.rank || a.item.order - b.item.order; });
  searchHits = matches.slice(0, 10).map(function (entry) { return entry.item; });
  drop.replaceChildren();
  var status = document.createElement('div'); status.className = 'reader-search-status'; status.setAttribute('role', 'status');
  status.textContent = matches.length ? matches.length + ' matches · ↑ ↓ to choose · Enter to open' : 'No matching documentation. Try a filename or section title.';
  drop.appendChild(status);
  searchHits.forEach(function (hit, index) {
    var option = document.createElement('div'); option.className = 'search-item'; option.id = 'reader-search-option-' + index;
    option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false'); option.setAttribute('data-id', hit.id);
    var title = document.createElement('div'); title.className = 'search-item-title';
    var label = hit.text.length > 180 ? hit.text.slice(0, 177) + '…' : hit.text;
    appendSearchHighlight(title, label, query); option.appendChild(title);
    if (hit.file && hit.file !== hit.text) { var path = document.createElement('div'); path.className = 'search-item-file'; path.textContent = hit.file; option.appendChild(path); }
    option.addEventListener('click', function () { chooseReaderSearch(index); }); drop.appendChild(option);
  });
  drop.classList.add('open'); inp.setAttribute('aria-expanded', 'true');
  inp.removeAttribute('aria-activedescendant'); searchSelection = -1;
  if (searchHits.length) selectReaderSearch(0);
}
if (inp && drop) {
  inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-label', 'Search files, sections and descriptions');
  inp.setAttribute('aria-controls', drop.id); inp.setAttribute('aria-expanded', 'false'); inp.setAttribute('aria-autocomplete', 'list');
  drop.setAttribute('role', 'listbox'); drop.setAttribute('aria-label', 'Documentation search results');
  inp.addEventListener('input', renderReaderSearch);
  inp.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); closeReaderSearch(); return; }
    if (!drop.classList.contains('open')) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); selectReaderSearch(searchSelection + (event.key === 'ArrowDown' ? 1 : -1)); }
    if (event.key === 'Enter' && searchSelection >= 0) { event.preventDefault(); chooseReaderSearch(searchSelection); }
    if (event.key === 'Tab') closeReaderSearch();
  });
  document.addEventListener('click', function (event) { if (!event.target.closest('.search-wrap')) closeReaderSearch(); });
}
// Shortcuts do not intercept typing, native selects, or browser combinations.
document.addEventListener('keydown', function (event) {
  if (event.defaultPrevented || event.isComposing) return;
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k' && inp) {
    event.preventDefault(); if (readerOpenDrawer) readerOpenDrawer(false, false); inp.focus(); inp.select(); return;
  }
  if (event.target.closest('input, textarea, select, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === '/' && inp) { event.preventDefault(); if (readerOpenDrawer) readerOpenDrawer(false, false); inp.focus(); inp.select(); }
  if (event.key === 't' || event.key === 'T') setTheme(theme === 'dark' ? 'light' : 'dark');
});
`;
