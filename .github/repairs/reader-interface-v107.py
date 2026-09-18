"""Apply the reviewed 1.0.7 template integration before verification/packaging.

The large template is guarded by its known 1.0.6 blob identity. This script is
idempotent at 1.0.7 and refuses unexpected template or version changes.
"""
from pathlib import Path
import hashlib
import json


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Expected one integration anchor: ' + old[:90])
    return text.replace(old, new, 1)


path = Path('src/services/htmlTemplate.ts')
source = path.read_text()
if 'from "./htmlReaderNavigation"' not in source:
    raw = path.read_bytes()
    sha = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if sha != 'af0136755177ab9a9b64a24544f034a5f40c5921':
        raise RuntimeError('htmlTemplate.ts changed since review: ' + sha)
    source = ('import { READER_STYLES } from "./htmlReaderStyles";\n'
              'import { READER_NAVIGATION_SCRIPT } from "./htmlReaderNavigation";\n'
              'import { READER_SEARCH_SCRIPT } from "./htmlReaderSearch";\n\n' + source)
    source = replace_once(source, '  </style>', '    ${READER_STYLES}\n  </style>')
    start = source.index('    function initTocTracking()')
    end = source.index('    // ── Init', start)
    source = source[:start] + '    ${READER_NAVIGATION_SCRIPT}\n    ${READER_SEARCH_SCRIPT}\n\n' + source[end:]
    source = replace_once(source, "      safelyEnhance('Search index', buildIndex);", "      safelyEnhance('Reader controls', initializeReaderNavigation);\n      safelyEnhance('Search index', buildIndex);")
    source = replace_once(source, "      safelyEnhance('Active navigation', initTocTracking);\n", '')
    path.write_text(source)
else:
    assert '${READER_STYLES}' in source and '${READER_SEARCH_SCRIPT}' in source

# Closed native details can report descendant rectangles. Exclude those nodes
# explicitly from arrow navigation and the mobile focus boundary.
path = Path('src/services/htmlReaderNavigation.ts')
source = path.read_text()
if 'function readerIsVisible(' not in source:
    helper = """function readerIsVisible(element) {
  if (!element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') return false;
  for (var parent = element.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS' && !parent.open) {
      var summary = parent.querySelector(':scope > summary');
      if (!summary || !summary.contains(element)) return false;
    }
  }
  return true;
}
"""
    source = replace_once(source, 'function initializeReaderNavigation() {', helper + 'function initializeReaderNavigation() {')
    old = "filter(function (el) { return el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'; })"
    assert source.count(old) == 2
    source = source.replace(old, 'filter(readerIsVisible)')
    path.write_text(source)

path = Path('package.json')
manifest = path.read_text()
version = json.loads(manifest)['version']
if version == '1.0.6':
    path.write_text(replace_once(manifest, '"version": "1.0.6"', '"version": "1.0.7"'))
elif version != '1.0.7':
    raise RuntimeError('Refusing to overwrite unexpected version: ' + version)

for filename in ['src/services/localDocumentationCache.ts', 'test/localDocumentationCache.test.ts']:
    path = Path(filename)
    source = path.read_text()
    if 'local-documentation-cache-v4' in source:
        source = replace_once(source, 'local-documentation-cache-v4', 'local-documentation-cache-v5')
        path.write_text(source)
    else:
        assert 'local-documentation-cache-v5' in source

path = Path('test/all.test.ts')
source = path.read_text()
if 'import "./htmlReaderNavigation.test";' not in source:
    source = 'import "./htmlReaderNavigation.test";\n' + source
    path.write_text(source)

notes = ('Folder-first navigation now has persistent, report-scoped open/closed state, '
         'Expand all / Collapse all, file counts, clearable filtering, keyboard navigation, '
         'current-file context and a section selector. Ranked search supports Ctrl/Cmd+K, '
         'arrow selection, Enter and Escape; all results point to real document headings. '
         'Mobile uses the same folder tree in a focus-managed drawer. Wide tables scroll '
         'within the report; charts and documentation facts remain unchanged. '
         'Local cache v5 refreshes older generated HTML once.\n')
path = Path('CHANGELOG.md')
source = path.read_text()
if '## 1.0.7 — Reader navigation' not in source:
    source = replace_once(source, '# Changelog\n', '# Changelog\n\n## 1.0.7 — Reader navigation\n\n' + notes + '\n')
    path.write_text(source)
path = Path('README.md')
source = path.read_text()
if '## Reader navigation — 1.0.7' not in source:
    source += '\n\n## Reader navigation — 1.0.7\n\n' + notes + '\nInstall `releases/documint-1.0.7.vsix`, reload VS Code, and regenerate documentation to update existing HTML.\n'
source = source.replace('releases/documint-1.0.6.vsix', 'releases/documint-1.0.7.vsix')
path.write_text(source)
print('Reader integration applied; package only after unit and browser acceptance pass.')
