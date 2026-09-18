/** Browser-only controls operate on existing report identities, never inferred source facts. */
export const READER_NAVIGATION_SCRIPT = String.raw`
var readerEntries = [], readerFiles = new Map(), readerActive = null;
var readerNavigate = null, readerReveal = null, readerOpenDrawer = null;
function readerLabel(element) {
  var copy = element.cloneNode(true);
  copy.querySelectorAll('.anchor').forEach(function (anchor) { anchor.remove(); });
  return (copy.textContent || '').trim();
}
function initializeReaderNavigation() {
  var nav = document.getElementById('tocNav');
  var sidebar = document.querySelector('.sidebar');
  var main = document.getElementById('mainContent');
  var filter = document.getElementById('sidebarFilter');
  if (!nav || !sidebar || !main || !filter || nav.dataset.readerReady) return;
  nav.dataset.readerReady = 'true';
  var tables = [];
  main.querySelectorAll('table').forEach(function (table) {
    var wrap = document.createElement('div'); wrap.className = 'reader-table-scroll';
    table.parentNode.insertBefore(wrap, table); wrap.appendChild(table); tables.push(wrap);
  });
  sidebar.id = 'docSidebar';
  sidebar.setAttribute('aria-label', 'Documentation navigation');
  filter.setAttribute('aria-label', 'Filter files or sections');
  filter.placeholder = 'Filter files or sections…';
  var fileLinks = Array.from(nav.querySelectorAll('.file-link'));
  fileLinks.forEach(function (link) {
    var id = (link.getAttribute('href') || '').slice(1);
    var heading = id && document.getElementById(id);
    if (heading) readerFiles.set(id, {
      id: id, link: link, heading: heading,
      path: link.getAttribute('data-documint-file-path') || link.title || readerLabel(link),
      level: Number(heading.tagName.slice(1)),
    });
  });
  var owner = null;
  main.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').forEach(function (heading) {
    var level = Number(heading.tagName.slice(1));
    if (readerFiles.has(heading.id)) owner = readerFiles.get(heading.id);
    else if (owner && level <= owner.level) owner = null;
    readerEntries.push({ id: heading.id, heading: heading, text: readerLabel(heading), file: owner, top: 0 });
  });
  var projectTreeGroup = nav.querySelector('[data-group="project-tree"]');
  if (projectTreeGroup) nav.prepend(projectTreeGroup);
  var details = Array.from(nav.querySelectorAll('details'));
  details.forEach(function (item) {
    var key = item.getAttribute('data-group');
    if (key) key = 'group:' + key;
    else {
      var parts = [], cursor = item;
      while (cursor && cursor.classList.contains('file-tree-folder')) {
        var label = cursor.querySelector(':scope > summary .file-tree-folder-name');
        parts.unshift(label ? label.textContent : '');
        cursor = cursor.parentElement.closest('.file-tree-folder');
      }
      key = 'folder:' + parts.join('/');
      var count = document.createElement('span');
      count.className = 'reader-folder-count';
      count.textContent = item.querySelectorAll('.file-link').length;
      count.setAttribute('aria-label', count.textContent + ' files');
      item.querySelector(':scope > summary').appendChild(count);
    }
    item.dataset.readerKey = key;
  });
  var storageKey = 'documint-reader:v1:' + location.pathname + ':' + document.title;
  var stored = {};
  try { stored = JSON.parse(readStoredValue(storageKey, '{}')); } catch (_) {}
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) stored = {};
  details.forEach(function (item) {
    if (typeof stored[item.dataset.readerKey] === 'boolean') item.open = stored[item.dataset.readerKey];
    else if (item.dataset.group === 'project') item.open = false;
  });
  var suppressSave = false, saveTimer;
  function persist() {
    if (suppressSave || filter.value.trim()) return;
    var state = {};
    details.forEach(function (item) { state[item.dataset.readerKey] = item.open; });
    writeStoredValue(storageKey, JSON.stringify(state));
  }
  nav.addEventListener('toggle', function () {
    clearTimeout(saveTimer);
    if (!suppressSave && !filter.value.trim()) saveTimer = setTimeout(persist, 80);
  }, true);
  function button(text, id, label) {
    var element = document.createElement('button');
    element.type = 'button'; element.className = 'reader-button'; element.id = id;
    element.textContent = text; element.setAttribute('aria-label', label || text);
    return element;
  }
  var tools = filter.parentElement;
  var filterWrap = document.createElement('div'); filterWrap.className = 'reader-filter-wrap';
  tools.insertBefore(filterWrap, filter); filterWrap.appendChild(filter);
  var clear = button('Clear', 'readerClearFilter', 'Clear navigation filter');
  clear.className = 'reader-filter-clear'; clear.hidden = true; filterWrap.appendChild(clear);
  var actions = document.createElement('div'); actions.className = 'reader-tree-actions';
  var expand = button('Expand all', 'readerExpandAll', 'Expand all folders');
  var collapse = button('Collapse all', 'readerCollapseAll', 'Collapse all folders');
  actions.append(expand, collapse); tools.appendChild(actions);
  var status = document.createElement('div'); status.id = 'readerFilterStatus';
  status.className = 'reader-filter-status'; status.setAttribute('role', 'status');
  tools.appendChild(status);
  function filterStatus() {
    var query = filter.value.trim(); clear.hidden = !query;
    var matches = fileLinks.filter(function (a) { return !a.classList.contains('smart-hidden'); }).length;
    status.textContent = query ? matches + ' of ' + fileLinks.length + ' files match' : fileLinks.length + ' files · ' + nav.querySelectorAll('.file-tree-folder').length + ' folders';
  }
  filter.addEventListener('input', function () {
    suppressSave = true; clearTimeout(saveTimer); filterStatus();
    setTimeout(function () { suppressSave = false; }, 0);
  });
  function clearFilter() { filter.value = ''; filter.dispatchEvent(new Event('input', { bubbles: true })); }
  clear.addEventListener('click', function () { clearFilter(); filter.focus(); });
  [expand, collapse].forEach(function (control) {
    control.disabled = !nav.querySelector('.file-tree-folder');
    control.addEventListener('click', function () {
      clearFilter();
      var tree = nav.querySelector('[data-group="project-tree"]');
      if (tree) tree.open = true;
      nav.querySelectorAll('.file-tree-folder').forEach(function (folder) { folder.open = control === expand; });
      setTimeout(persist, 20);
    });
  });
  filterStatus();
  // Native details/summary semantics remain intact; arrow keys speed up browsing.
  nav.addEventListener('keydown', function (event) {
    if (!event.target.matches('summary, a.toc-link') || event.altKey || event.ctrlKey || event.metaKey) return;
    var targets = Array.from(nav.querySelectorAll('summary, a.toc-link')).filter(function (el) { return el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'; });
    var at = targets.indexOf(event.target), target;
    if (event.key === 'ArrowDown') target = targets[Math.min(at + 1, targets.length - 1)];
    if (event.key === 'ArrowUp') target = targets[Math.max(at - 1, 0)];
    if (event.key === 'Home') target = targets[0];
    if (event.key === 'End') target = targets[targets.length - 1];
    if (event.key === 'ArrowRight' && event.target.tagName === 'SUMMARY') {
      event.preventDefault();
      if (!event.target.parentElement.open) event.target.parentElement.open = true;
      else target = targets[at + 1];
    }
    if (event.key === 'ArrowLeft') {
      var parent = event.target.closest('details');
      if (event.target.tagName === 'SUMMARY' && parent.open) { parent.open = false; event.preventDefault(); }
      else { parent = event.target.tagName === 'SUMMARY' ? parent.parentElement.closest('details') : parent; if (parent) target = parent.querySelector(':scope > summary'); }
    }
    if (target) { event.preventDefault(); target.focus(); }
  });
  var context = document.createElement('div'); context.className = 'reader-context';
  var locationWrap = document.createElement('div'); locationWrap.className = 'reader-location';
  var contextLabel = document.createElement('span'); contextLabel.className = 'reader-location-label';
  var contextText = document.createElement('span'); contextText.className = 'reader-location-text'; contextText.id = 'readerCurrentPath';
  locationWrap.append(contextLabel, contextText);
  var reveal = button('Show in tree', 'readerRevealCurrent');
  var outline = document.createElement('select'); outline.id = 'readerOutline'; outline.className = 'reader-outline';
  outline.setAttribute('aria-label', 'Jump to a section in the current file or project overview');
  context.append(locationWrap, reveal, outline); main.prepend(context);
  var currentOwner, navigationTarget = null;
  function updateContext(entry) {
    if (!entry) return;
    readerActive = entry;
    var file = entry.file, id = file ? file.id : entry.id;
    nav.querySelectorAll('.toc-link.active, .toc-link[aria-current]').forEach(function (link) { link.classList.remove('active'); link.removeAttribute('aria-current'); });
    var active = file ? file.link : Array.from(nav.querySelectorAll('.toc-link')).find(function (link) { return link.getAttribute('href') === '#' + id; });
    if (active) { active.classList.add('active'); active.setAttribute('aria-current', 'location'); }
    contextLabel.textContent = file ? 'Reading file' : 'Project overview';
    contextText.textContent = file ? file.path : entry.text;
    contextText.title = contextText.textContent;
    reveal.disabled = !file;
    var ownerId = file ? file.id : '';
    if (currentOwner !== ownerId) {
      currentOwner = ownerId; outline.replaceChildren();
      readerEntries.filter(function (item) { return (item.file ? item.file.id : '') === ownerId; }).forEach(function (item) {
        var option = document.createElement('option'); option.value = item.id; option.textContent = item.text;
        outline.appendChild(option);
      });
    }
    outline.value = entry.id;
  }
  function revealLink(link) {
    if (!link) return;
    var parent = link.parentElement.closest('details');
    while (parent) { parent.open = true; parent = parent.parentElement.closest('details'); }
    link.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
  }
  readerReveal = function () {
    if (!readerActive || !readerActive.file) return;
    clearFilter();
    if (readerOpenDrawer && matchMedia('(max-width: 768px)').matches) readerOpenDrawer(true);
    revealLink(readerActive.file.link);
    readerActive.file.link.focus({ preventScroll: true });
    setTimeout(persist, 20);
  };
  reveal.addEventListener('click', readerReveal);
  readerNavigate = function (id, push) {
    var element = document.getElementById(id);
    if (!element || !main.contains(element)) return;
    if (readerOpenDrawer) readerOpenDrawer(false, false);
    var entry = readerEntries.find(function (item) { return item.id === id; });
    if (entry) { navigationTarget = entry; updateContext(entry); }
    if (!filter.value.trim() && entry && entry.file) revealLink(entry.file.link);
    if (push && location.hash !== '#' + id) {
      try { history.pushState(null, '', '#' + encodeURIComponent(id)); } catch (_) { location.hash = id; }
    }
    element.setAttribute('tabindex', '-1'); element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: 'instant', block: 'start' });
  };
  outline.addEventListener('change', function () { readerNavigate(outline.value, true); });
  nav.addEventListener('click', function (event) {
    var link = event.target.closest('a.toc-link');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    var id = (link.getAttribute('href') || '').slice(1);
    if (id && document.getElementById(id)) { event.preventDefault(); readerNavigate(id, true); }
  });
  function hashNavigation() {
    var id; try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    if (id) readerNavigate(id, false);
  }
  window.addEventListener('hashchange', hashNavigation);
  var frame = 0;
  function track() {
    frame = 0;
    if (!readerEntries.length) return;
    if (navigationTarget) { if (readerActive !== navigationTarget) updateContext(navigationTarget); return; }
    var cutoff = scrollY + (matchMedia('(max-width: 768px)').matches ? 194 : 156);
    var low = 0, high = readerEntries.length;
    while (low < high) { var mid = (low + high) >>> 1; if (readerEntries[mid].top <= cutoff) low = mid + 1; else high = mid; }
    var entry = readerEntries[Math.max(0, low - 1)];
    if (entry !== readerActive) updateContext(entry);
  }
  function scheduleTrack() { if (!frame) frame = requestAnimationFrame(track); }
  var measureFrame = 0;
  function measure() {
    measureFrame = 0;
    tables.forEach(function (wrap) {
      if (wrap.scrollWidth > wrap.clientWidth + 1) {
        wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Scrollable documentation table');
      } else { wrap.removeAttribute('tabindex'); wrap.removeAttribute('role'); wrap.removeAttribute('aria-label'); }
    });
    readerEntries.forEach(function (entry) { entry.top = entry.heading.getBoundingClientRect().top + scrollY; });
    scheduleTrack();
  }
  function scheduleMeasure() { if (!measureFrame) measureFrame = requestAnimationFrame(measure); }
  function releaseNavigationTarget(event) {
    if (event.target.closest && event.target.closest('.sidebar, .reader-context, .topbar')) return;
    navigationTarget = null;
  }
  window.addEventListener('wheel', releaseNavigationTarget, { passive: true });
  window.addEventListener('touchstart', releaseNavigationTarget, { passive: true });
  document.addEventListener('pointerdown', function (event) {
    if (event.target === document.documentElement || event.target === document.body) navigationTarget = null;
  });
  document.addEventListener('keydown', function (event) {
    if (!event.target.closest('input, textarea, select, button, summary, .sidebar, [contenteditable="true"]') && ['PageDown','PageUp','Home','End','ArrowDown','ArrowUp',' '].indexOf(event.key) >= 0) navigationTarget = null;
  });
  document.addEventListener('click', function (event) {
    if (event.target.closest('.btt, .topbar-client')) { navigationTarget = null; scheduleTrack(); }
  });
  window.addEventListener('scroll', scheduleTrack, { passive: true });
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('load', scheduleMeasure);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scheduleMeasure).observe(main);
  measure(); updateContext(readerEntries[0]);
  if (location.hash) requestAnimationFrame(hashNavigation);
  // Mobile drawer uses the same tree, not a second copy with divergent state.
  var topbar = document.querySelector('.topbar');
  if (!topbar) return;
  var menu = button('☰', 'readerMenu', 'Open documentation navigation'); menu.classList.add('reader-menu');
  menu.setAttribute('aria-controls', sidebar.id); menu.setAttribute('aria-expanded', 'false');
  topbar.prepend(menu);
  var close = button('×', 'readerClose', 'Close documentation navigation'); close.classList.add('reader-close');
  sidebar.querySelector('.sidebar-head').appendChild(close);
  var overlay = button('', 'readerOverlay', 'Close documentation navigation'); overlay.className = 'reader-overlay'; overlay.tabIndex = -1; overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);
  var mobile = matchMedia('(max-width: 768px)'), drawerOpen = false, inertState = [];
  function restoreBackground() {
    inertState.forEach(function (pair) { pair[0].inert = pair[1]; }); inertState = [];
  }
  readerOpenDrawer = function (open, restoreFocus) {
    open = !!open && mobile.matches;
    if (drawerOpen === open) return;
    drawerOpen = open; document.body.classList.toggle('reader-drawer-open', open);
    menu.setAttribute('aria-expanded', String(open));
    sidebar.inert = mobile.matches && !open;
    restoreBackground();
    if (open) {
      sidebar.setAttribute('role', 'dialog'); sidebar.setAttribute('aria-modal', 'true');
      Array.from(document.body.children).forEach(function (child) {
        if (child !== sidebar && child !== overlay && !child.matches('script, style')) { inertState.push([child, child.inert]); child.inert = true; }
      });
      filter.focus();
    } else {
      sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal');
      if (restoreFocus !== false) menu.focus();
    }
  };
  menu.addEventListener('click', function () { readerOpenDrawer(true); });
  close.addEventListener('click', function () { readerOpenDrawer(false); });
  overlay.addEventListener('click', function () { readerOpenDrawer(false); });
  document.addEventListener('keydown', function (event) {
    if (!drawerOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); readerOpenDrawer(false); }
    if (event.key === 'Tab') {
      var focusable = Array.from(sidebar.querySelectorAll('button:not(:disabled), input, summary, a[href], select')).filter(function (el) { return el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'; });
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  function breakpointChange() {
    if (!mobile.matches) readerOpenDrawer(false, false);
    if (mobile.matches && !drawerOpen && sidebar.contains(document.activeElement)) menu.focus();
    sidebar.inert = mobile.matches && !drawerOpen;
  }
  mobile.addEventListener('change', breakpointChange); breakpointChange();
  document.getElementById('themeBtn').setAttribute('aria-label', 'Switch light or dark theme');
}
`;
