import { READER_NAVIGATION_SCRIPT } from "./htmlReaderNavigation";
import { READER_SEARCH_SCRIPT } from "./htmlReaderSearch";

export interface HtmlBaseScriptOptions {
  highlightThemeDark: string;
  highlightThemeLight: string;
}

export function buildHtmlBaseScript(
  options: HtmlBaseScriptOptions,
): string {
  return String.raw`
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
        var connectedModuleIndex = {};
        moduleEdges.forEach(function (edge) {
          connectedModuleIndex[edge.from] = true;
          connectedModuleIndex[edge.to] = true;
        });
        var connectedModules = modules
          .filter(function (module) { return connectedModuleIndex[moduleDomId(module)]; })
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
            });
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

    function safelyEnhance(name, callback) {
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

      // Normalize canonical and legacy Local TOCs before building the tree.
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
        if (link && link.hasAttribute('data-documint-file-path')) return true;
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
        if (extraClass === 'file-link') {
          for (var level = 1; level <= 6; level++) clone.classList.remove('level-' + level);
          clone.classList.add('level-1');
        }
        if (displayText) setLinkLabel(clone, displayText);
        clone.setAttribute('data-toc-text', (searchText || linkText(link)).toLowerCase());
        if (searchText) clone.setAttribute('title', searchText);
        return clone;
      }

      function makeGroup(id, icon, title, items, open, countLabel) {
        var details = document.createElement('details');
        details.className = 'smart-toc-group';
        details.setAttribute('data-group', id);
        if (open) details.open = true;

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
            details.open = depth < 1;
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
      if (visualLinks.length) {
        smartNav.appendChild(
          makeGroup('visuals', 'V', 'Visual Blueprints', visualLinks, false)
        );
      }

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
          }
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
          ? '${options.highlightThemeDark}'
          : '${options.highlightThemeLight}';
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
    if (btt) {
      btt.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    window.addEventListener('scroll', function () {
      if (!btt) return;
      if (window.scrollY > 400) btt.classList.add('show');
      else btt.classList.remove('show');
    }, { passive: true });

    // ── Active TOC tracking ──────────────────────────────────────────────────
    ${READER_NAVIGATION_SCRIPT}
    ${READER_SEARCH_SCRIPT}

    // ── Init ─────────────────────────────────────────────────────────────────
    var initDone = false;
    function runInit() {
      if (initDone) return;
      initDone = true;
      safelyEnhance('Sidebar navigation', enhanceSidebarNavigation);
      safelyEnhance('Reader controls', initializeReaderNavigation);
      safelyEnhance('Search index', buildIndex);
      safelyEnhance('Project tree', enhanceProjectTreeVisuals);
      enhanceVisualBlueprints();
      safelyEnhance('Mermaid diagrams', initMermaid);
      safelyEnhance('Syntax highlighting', applyHighlighting);
      safelyEnhance('Code controls', enhanceCodeBlocks);
      safelyEnhance('Heading anchors', addAnchors);
      safelyEnhance('Callouts', enhanceCallouts);

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
`;
}
