"""One-time, guarded migration for the 1.0.5 generated-HTML regression.

The repair workflow applies these small source edits, tests the generated page
in Chromium, and commits the repaired source and VSIX only after verification.
This maintenance script is excluded from the shipped extension.
"""
from pathlib import Path


def replace_once(text, old, new):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one source anchor, found {count}: {old[:100]!r}")
    return text.replace(old, new, 1)


def repair_template(text):
    text = replace_once(text, "var connectedModuleIds = {};", "var connectedModuleIndex = {};")
    for key in ["edge.from", "edge.to", "moduleDomId(module)"]:
        text = replace_once(text, f"connectedModuleIds[{key}]", f"connectedModuleIndex[{key}]")

    text = replace_once(text, """      var originalLinks = Array.from(nav.querySelectorAll('.toc-link'));
      if (!originalLinks.length) return;
""", """      // Normalize canonical and legacy Local TOCs before building the tree.
      var originalLinks = Array.from(nav.querySelectorAll('a[href^="#"]'));
      originalLinks.forEach(function (link) {
        var target = document.getElementById((link.getAttribute('href') || '').slice(1));
        var item = link.closest('li');
        var levelMatch = ((item && item.className) || '').match(/toc-level-([1-6])/);
        var headingLevel = target && /^H[1-6]$/.test(target.tagName) ? target.tagName.slice(1) : '2';
        if (!link.classList.contains('toc-link')) {
          link.classList.add('toc-link', 'level-' + (levelMatch ? levelMatch[1] : headingLevel));
        }
        if (!link.querySelector('.toc-text')) {
          var label = document.createElement('span');
          label.className = 'toc-text';
          label.textContent = link.textContent || '';
          link.textContent = '';
          link.appendChild(label);
        }
        if (target && target.hasAttribute('data-documint-file-path')) {
          link.setAttribute('data-documint-file-path', target.getAttribute('data-documint-file-path'));
        }
      });
      if (!originalLinks.length) return;
""")
    text = replace_once(text, """      function isFilePath(text, link) {
        var value = text.trim();""", """      function isFilePath(text, link) {
        if (link && link.hasAttribute('data-documint-file-path')) return true;
        var value = text.trim();""")
    text = replace_once(text, """        if (extraClass) clone.classList.add(extraClass);
        if (displayText) setLinkLabel(clone, displayText);""", """        if (extraClass) clone.classList.add(extraClass);
        if (extraClass === 'file-link') {
          for (var level = 1; level <= 6; level++) clone.classList.remove('level-' + level);
          clone.classList.add('level-1');
        }
        if (displayText) setLinkLabel(clone, displayText);""")

    start = text.index("      originalLinks.forEach(function (link) {\n        var text = linkText(link);")
    finish = text.index("          if (currentFileNode && isUsefulFileSection(text))", start)
    text = text[:start] + r'''      originalLinks.forEach(function (link) {
        var text = linkText(link);
        if (!text) return;

        // Source file identity takes precedence over labels containing "d2", etc.
        if (isFilePath(text, link)) {
          if (!builtFromProjectTree) {
            var filePath = link.getAttribute('data-documint-file-path') || text;
            filePath = filePath.replace(/\\/g, '/');
            fileSeen = true;
            fileCount++;
            var fileName = filePath.split('/').filter(Boolean).pop() || filePath;
            currentFileNode = insertFileNode(filePath, cloneLink(link, 'file-link', fileName, filePath));
          }
          return;
        }

        if (isVisual(text)) {
          visualLinks.push(cloneLink(link, 'visual-link'));
          return;
        }

        if (!builtFromProjectTree) {
''' + text[finish:]

    text = replace_once(text, "if (open || items.length <= 8) details.open = true;", "if (open) details.open = true;")
    text = replace_once(text, "details.open = depth < 2;", "details.open = depth < 1;")
    text = replace_once(text, "makeGroup('visuals', 'V', 'Visual Blueprints', visualLinks, true)", "makeGroup('visuals', 'V', 'Visual Blueprints', visualLinks, false)")
    text = replace_once(text, """      var filter = document.getElementById('sidebarFilter');
      if (filter) {
        filter.addEventListener('input', function () {
          var query = filter.value.trim().toLowerCase();""", """      var filter = document.getElementById('sidebarFilter');
      if (filter) {
        var openBeforeFilter = null;
        var noResults = document.createElement('div');
        noResults.className = 'smart-toc-empty smart-hidden';
        noResults.textContent = 'No matching files or sections.';
        noResults.setAttribute('role', 'status');
        nav.appendChild(noResults);
        filter.addEventListener('input', function () {
          var query = filter.value.trim().toLowerCase();
          if (query && !openBeforeFilter) {
            openBeforeFilter = new Map();
            nav.querySelectorAll('details').forEach(function (item) { openBeforeFilter.set(item, item.open); });
          }""")
    text = replace_once(text, """            if (query && visible) group.open = true;
          });
        });
      }
    }
""", """            if (query && visible) group.open = true;
          });
          var anyMatch = Array.from(nav.querySelectorAll('.toc-link')).some(function (link) {
            return !link.classList.contains('smart-hidden');
          });
          noResults.classList.toggle('smart-hidden', !query || anyMatch);
          if (!query && openBeforeFilter) {
            openBeforeFilter.forEach(function (open, item) { item.open = open; });
            openBeforeFilter = null;
          }
        });
      }
    }
""")
    text = replace_once(text, """    function enhanceVisualBlueprints() {
      enhanceArchitectureBlueprints();
      enhanceCodeWorkflowBlocks();
      enhanceD2SourceBlocks();
      enhanceExcalidrawBlueprints();
      enhanceDependencyGraphs();
    }""", """    function safelyEnhance(name, callback) {
      function report(error) { console.warn('[DocuMint] ' + name + ' unavailable:', error); }
      try {
        var result = callback();
        if (result && typeof result.catch === 'function') result.catch(report);
      } catch (error) { report(error); }
    }

    function enhanceVisualBlueprints() {
      safelyEnhance('Architecture charts', enhanceArchitectureBlueprints);
      safelyEnhance('Code workflow', enhanceCodeWorkflowBlocks);
      safelyEnhance('D2 diagrams', enhanceD2SourceBlocks);
      safelyEnhance('Whiteboard', enhanceExcalidrawBlueprints);
      safelyEnhance('Dependency graph', enhanceDependencyGraphs);
    }""")
    text = replace_once(text, """      initMermaid();          // async — fire and forget
      enhanceProjectTreeVisuals();
      enhanceVisualBlueprints();
      applyHighlighting();
      enhanceCodeBlocks();
      addAnchors();
      enhanceSidebarNavigation();
      buildIndex();
      initTocTracking();
      enhanceCallouts();""", """      safelyEnhance('Sidebar navigation', enhanceSidebarNavigation);
      safelyEnhance('Search index', buildIndex);
      safelyEnhance('Active navigation', initTocTracking);
      safelyEnhance('Project tree', enhanceProjectTreeVisuals);
      enhanceVisualBlueprints();
      safelyEnhance('Mermaid diagrams', initMermaid);
      safelyEnhance('Syntax highlighting', applyHighlighting);
      safelyEnhance('Code controls', enhanceCodeBlocks);
      safelyEnhance('Heading anchors', addAnchors);
      safelyEnhance('Callouts', enhanceCallouts);""")
    text = replace_once(text, """              return bv - av || String(a.name || '').localeCompare(String(b.name || ''));
            })
            .slice(0, 8);""", """              return bv - av || String(a.name || '').localeCompare(String(b.name || ''));
            });""")
    text = replace_once(text, "    .toc-nav ul { list-style: none; padding: 0 6px; }", "    .toc-nav a { color: var(--text-secondary); text-decoration: none; }\n    .toc-nav ul { list-style: none; padding: 0 6px; }")
    text = replace_once(text, """      .documint-jelly-ui .main table {
        display: block;""", """      .documint-jelly-ui .architecture-pie-panel {
        grid-template-columns: 1fr;
      }

      .documint-jelly-ui .main table {
        display: block;""")
    return text


def repair_local_renderer(text):
    text = replace_once(text, "renderMarkdownForTemplate(markdown);", "renderMarkdownForTemplate(markdown, sortedFiles.map((file) => file.path));")
    text = replace_once(text, "function renderMarkdownForTemplate(markdown: string): {", "function renderMarkdownForTemplate(markdown: string, filePaths: string[]): {")
    text = replace_once(text, "  const headings: Array<{ level: number; id: string; text: string }> = [];", r'''  const headings: Array<{ level: number; id: string; text: string; filePath?: string }> = [];
  const knownFiles = new Set(filePaths.map((filePath) => filePath.replace(/\\/g, "/")));''')
    text = replace_once(text, """      headings.push({ level, id, text });
      return `<h${level} id="${escapeHtmlAttribute(id)}">${innerHtml}</h${level}>`;""", r'''      const filePath = level === 2 && /^<code>[\s\S]*<\/code>$/.test(innerHtml) && knownFiles.has(text)
        ? text : undefined;
      headings.push({ level, id, text, filePath });
      const fileAttribute = filePath ? ` data-documint-file-path="${escapeHtmlAttribute(filePath)}"` : "";
      return `<h${level} id="${escapeHtmlAttribute(id)}"${fileAttribute}>${innerHtml}</h${level}>`;''')
    text = replace_once(text, '        `<li class="toc-level-${heading.level}"><a href="#${escapeHtmlAttribute(heading.id)}">${escapeHtml(heading.text)}</a></li>`,', '        `<li><a class="toc-link level-${heading.level}" href="#${escapeHtmlAttribute(heading.id)}"${heading.filePath ? ` data-documint-file-path="${escapeHtmlAttribute(heading.filePath)}"` : ""}><span class="toc-text">${escapeHtml(heading.text)}</span></a></li>`,')
    return text


def main():
    package = Path("package.json")
    package_text = replace_once(package.read_text(), '"version": "1.0.5",', '"version": "1.0.6",')
    template = Path("src/services/htmlTemplate.ts")
    renderer = Path("src/services/localDocumentationDocument.ts")
    fixed_template = repair_template(template.read_text())
    fixed_renderer = repair_local_renderer(renderer.read_text())
    cache = Path("src/services/localDocumentationCache.ts")
    cache_test = Path("test/localDocumentationCache.test.ts")
    fixed_cache = replace_once(cache.read_text(), '"local-documentation-cache-v3"', '"local-documentation-cache-v4"')
    fixed_cache_test = replace_once(cache_test.read_text(), '"local-documentation-cache-v3"', '"local-documentation-cache-v4"')
    aggregate = Path("test/all.test.ts")
    aggregate_text = aggregate.read_text()
    if 'import "./htmlNavigationRuntime.test";' in aggregate_text:
        raise RuntimeError("Navigation tests already registered; refusing to reapply migration")
    aggregate_text += '\nimport "./htmlNavigationRuntime.test";\n'
    # Resolve all guarded edits before changing source files.
    for path, content in [(template, fixed_template), (renderer, fixed_renderer), (cache, fixed_cache),
                          (cache_test, fixed_cache_test), (aggregate, aggregate_text), (package, package_text)]:
        path.write_text(content)
    readme = Path("README.md")
    text = readme.read_text().replace("version-1.0.5-green", "version-1.0.6-green")
    text = text.replace("documint-1.0.5.vsix", "documint-1.0.6.vsix")
    note = "\n## 1.0.6 — Generated navigation repair\n\nLocal and AI-format HTML now share working folder-wise collapsible navigation. Local TOCs emit the canonical link classes and explicit file identity, including route-group and spaced filenames. The chart function/map collision is fixed; optional chart failures cannot block navigation or search. Module chart totals include every emitted module. Local cache v4 regenerates older HTML once. Browser acceptance covers collapse, filtering, anchors, themes, charts, offline rendering and failure isolation.\n"
    readme.write_text(text + note)
    changelog = Path("CHANGELOG.md")
    original = changelog.read_text()
    title, remainder = original.split("\n", 1)
    changelog.write_text(title + note + "\n" + remainder)
    print("Applied guarded navigation repair; run unit and browser acceptance before committing.")


if __name__ == "__main__":
    main()
