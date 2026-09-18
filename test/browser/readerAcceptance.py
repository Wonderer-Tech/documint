"""End-to-end reader controls. Generate navigationFixtures.ts output first.

READER_REPORT permits a local report without uploading it to the repository.
READER_SET_CONTENT skips only origin-dependent reload checks in restricted browsers.
"""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

root = Path('test-results/navigation-browser')
root.mkdir(parents=True, exist_ok=True)
report = os.environ.get('READER_REPORT')
set_content = bool(os.environ.get('READER_SET_CONTENT'))
fixtures = [{'name': 'uploaded-report', 'path': report, 'files': int(os.environ['READER_REPORT_FILES']), 'lines': int(os.environ['READER_REPORT_LINES']), 'chart': True}] if report else json.loads((root / 'fixtures.json').read_text())
results = []
with sync_playwright() as p:
    launch = {'headless': True, 'args': ['--no-sandbox']}
    if os.environ.get('CHROMIUM_EXECUTABLE'):
        launch['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
    browser = p.chromium.launch(**launch)
    for fixture in fixtures:
        name = fixture['name']
        path = Path(fixture.get('path') or root / f'{name}.html').resolve()
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        context.route('https://**/*', lambda route: route.abort())
        page = context.new_page()
        page.set_default_timeout(5000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            def load():
                if set_content:
                    page.set_content(path.read_text(), wait_until='load')
                else:
                    page.goto(path.as_uri(), wait_until='load')
                page.wait_for_timeout(180)
            def snapshot():
                return page.locator('#tocNav details').evaluate_all('(els) => Object.fromEntries(els.map(e => [e.dataset.readerKey, e.open]))')
            load()
            assert page.locator('#tocNav .file-link').count() == fixture['files'], name
            assert page.locator('.reader-context').count() == 1, name
            assert page.locator('#tocNav > details').first.get_attribute('data-group') == 'project-tree'
            folders = page.locator('#tocNav .file-tree-folder')
            if folders.count():
                page.locator('#readerExpandAll').click()
                assert page.locator('#tocNav .file-tree-folder[open]').count() == folders.count()
                page.locator('#readerCollapseAll').click()
                assert page.locator('#tocNav .file-tree-folder[open]').count() == 0
                page.wait_for_timeout(160)
                before_reload = snapshot()
                if not set_content:
                    load()
                    assert snapshot() == before_reload, ('saved state', name)
                first = folders.first
                summary = first.locator(':scope > summary')
                summary.focus(); page.keyboard.press('Enter')
                assert first.evaluate('e => e.open')
                page.keyboard.press('ArrowLeft')
                assert not first.evaluate('e => e.open')
                page.keyboard.press('ArrowRight')
                assert first.evaluate('e => e.open')
            else:
                assert page.locator('#readerExpandAll').is_disabled()
            before_filter = snapshot()
            page.locator('#sidebarFilter').fill('__missing__')
            assert page.locator('#tocNav > .smart-toc-empty').is_visible()
            assert f"0 of {fixture['files']}" in page.locator('#readerFilterStatus').inner_text()
            page.locator('#readerClearFilter').click()
            assert snapshot() == before_filter, ('filter state restore', name)
            assert page.locator('#sidebarFilter').input_value() == ''
            assert not page.locator('#readerClearFilter').is_visible()
            page.keyboard.press('Control+k')
            assert page.evaluate('document.activeElement.id') == 'searchInput'
            keyword = os.environ.get('READER_REPORT_QUERY', 'index.ts') if report else 'index.ts'
            page.locator('#searchInput').fill(keyword)
            assert page.locator('.search-item').count() > 0
            assert page.locator('#searchInput').get_attribute('role') == 'combobox'
            assert page.locator('#searchInput').get_attribute('aria-expanded') == 'true'
            first_result = page.locator('.search-item').first.get_attribute('data-id')
            if page.locator('.search-item').count() > 1:
                page.keyboard.press('ArrowDown')
                assert page.locator('#searchInput').get_attribute('aria-activedescendant') == 'reader-search-option-1'
                page.keyboard.press('ArrowUp')
            page.keyboard.press('Enter'); page.wait_for_timeout(100)
            assert page.evaluate('decodeURIComponent(location.hash.slice(1))') == first_result
            assert page.evaluate('document.activeElement.id') == first_result
            current_path = page.locator('#readerCurrentPath').inner_text()
            assert keyword in current_path, (name, current_path)
            assert page.locator('#tocNav .file-link[aria-current="location"]').count() == 1
            assert page.locator('#readerOutline option').count() >= 1
            if page.locator('#readerOutline option').count() > 1:
                section = page.locator('#readerOutline option').nth(1).get_attribute('value')
                page.locator('#readerOutline').select_option(section)
                page.wait_for_timeout(80)
                assert page.evaluate('decodeURIComponent(location.hash.slice(1))') == section
                assert page.locator('#readerCurrentPath').inner_text() == current_path
            if folders.count():
                page.locator('#readerCollapseAll').click()
                page.locator('#readerRevealCurrent').click()
                active = page.locator('#tocNav .file-link[aria-current="location"]')
                assert active.is_visible()
                assert active.evaluate('e => e === document.activeElement')
            page.locator('#searchInput').fill('<img src=x onerror=alert(1)>')
            assert page.locator('#searchDropdown img').count() == 0
            page.keyboard.press('Escape')
            assert page.locator('#searchInput').get_attribute('aria-expanded') == 'false'
            page.locator('#searchInput').fill('')
            page.locator('#themeBtn').click()
            assert page.locator('html').get_attribute('data-theme') == 'light'
            page.screenshot(path=str(root / f'{name}-reader-light.png'))
            page.locator('#themeBtn').click()
            if fixture['chart']:
                assert page.locator('.architecture-pie-svg').count() == 1
                assert int(page.locator('.architecture-pie-center-value').inner_text().replace(',', '')) == fixture['files']
                page.locator('.architecture-segment[data-metric="lines"]').click()
                assert int(page.locator('.architecture-pie-center-value').inner_text().replace(',', '')) == fixture['lines']
                page.locator('.architecture-segment[data-metric="files"]').click()
            for width in [320, 390, 768, 1024]:
                page.set_viewport_size({'width': width, 'height': 844})
                page.wait_for_timeout(90)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (name, width, page.evaluate('document.documentElement.scrollWidth'))
                if width <= 768:
                    assert page.locator('#docSidebar').evaluate('e => e.inert')
                    page.locator('#readerMenu').click()
                    assert page.locator('#docSidebar').get_attribute('aria-modal') == 'true'
                    assert page.locator('#mainContent').evaluate('e => e.inert')
                    assert page.evaluate('document.activeElement.id') == 'sidebarFilter'
                    page.locator('#readerClose').focus()
                    page.keyboard.press('Shift+Tab')
                    assert page.evaluate('document.getElementById("docSidebar").contains(document.activeElement)')
                    assert page.evaluate('document.activeElement.id') != 'readerClose'
                    page.keyboard.press('Tab')
                    assert page.evaluate('document.activeElement.id') == 'readerClose'
                    page.keyboard.press('Escape')
                    assert page.evaluate('document.activeElement.id') == 'readerMenu'
                    assert not page.locator('#mainContent').evaluate('e => e.inert')
                    assert page.locator('#readerMenu').get_attribute('aria-expanded') == 'false'
            page.set_viewport_size({'width': 390, 'height': 844})
            page.locator('#readerMenu').click()
            page.locator('#sidebarFilter').fill(keyword)
            visible = page.locator('#tocNav .file-link:not(.smart-hidden)').first
            target = visible.get_attribute('href')[1:]
            visible.click(); page.wait_for_timeout(80)
            assert page.locator('#readerMenu').get_attribute('aria-expanded') == 'false'
            assert page.evaluate('document.activeElement.id') == target
            page.locator('#readerRevealCurrent').click()
            assert page.locator('#readerMenu').get_attribute('aria-expanded') == 'true'
            page.screenshot(path=str(root / f'{name}-reader-mobile.png'))
            page.set_viewport_size({'width': 1440, 'height': 1000})
            page.wait_for_timeout(100)
            assert not page.locator('#mainContent').evaluate('e => e.inert')
            assert not page.locator('#docSidebar').evaluate('e => e.inert')
            assert not page.locator('body').evaluate('e => e.classList.contains("reader-drawer-open")')
            page.screenshot(path=str(root / f'{name}-reader-desktop.png'))
            assert not errors, errors
            results.append({'fixture': name, 'result': 'PASS', 'browser_errors': errors, 'reload_persistence': 'not run in restricted set_content mode' if set_content else 'PASS', 'widths': [320,390,768,1024,1440]})
            print('PASS:', name, 'tree, filter restore, keyboard search, file context, outline, charts, responsive drawer')
        except Exception as error:
            page.screenshot(path=str(root / f'{name}-reader-failure.png'))
            results.append({'fixture':name,'result':'FAIL','error':str(error),'browser_errors':errors})
            (root/'reader-results.json').write_text(json.dumps(results,indent=2))
            raise
        finally:
            context.close()
    browser.close()
(root/'reader-results.json').write_text(json.dumps(results,indent=2))
