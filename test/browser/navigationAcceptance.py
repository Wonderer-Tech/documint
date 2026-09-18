"""Browser acceptance for generated HTML; no provider calls or CDN access.

Generate fixtures with navigationFixtures.ts first. Run with Python Playwright
and its Chromium installed. CHROMIUM_EXECUTABLE optionally selects a system
Chromium binary. Screenshots/results are written beside the fixtures.
"""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

root = Path("test-results/navigation-browser")
fixtures = json.loads((root / "fixtures.json").read_text())
results = []
with sync_playwright() as playwright:
    launch = {"headless": True, "args": ["--no-sandbox"]}
    if os.environ.get("CHROMIUM_EXECUTABLE"):
        launch["executable_path"] = os.environ["CHROMIUM_EXECUTABLE"]
    browser = playwright.chromium.launch(**launch)
    for fixture in fixtures:
        name = fixture["name"]
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.route("https://**/*", lambda route: route.abort())
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            page.set_content((root / f"{name}.html").read_text(), wait_until="load")
            page.wait_for_timeout(300)
            assert page.locator("#tocNav .file-link").count() == fixture["files"], name
            assert page.locator("#tocNav.smart").count() == 1, name
            assert page.evaluate("Array.from(document.querySelectorAll('#tocNav .file-link')).every(a => !!document.getElementById(a.hash.slice(1)))"), name
            assert page.evaluate("Array.from(document.querySelectorAll('#tocNav a')).every(a => getComputedStyle(a).textDecorationLine === 'none')"), name
            folders = page.locator("#tocNav .file-tree-folder")
            if folders.count():
                folder = folders.first
                initial = folder.evaluate("d => d.open")
                summary = folder.locator(":scope > summary")
                summary.click()
                assert folder.evaluate("d => d.open") != initial
                summary.focus()
                page.keyboard.press("Enter")
                assert folder.evaluate("d => d.open") == initial
            if name == "local":
                for file_path in ["src/app/(internal)/[slug]/page.tsx", "src/components/hello world.ts", "src/lib/d2.ts"]:
                    assert page.locator(f'#tocNav .file-link[title="{file_path}"]').count() == 1, file_path
            search = page.locator("#sidebarFilter")
            search.fill("__missing_file__")
            assert page.locator("#tocNav > .smart-toc-empty").is_visible()
            search.fill("index.ts")
            matching = page.locator("#tocNav .file-link:not(.smart-hidden)")
            assert matching.count() > 0, name
            destination = matching.first.get_attribute("href")
            matching.first.click()
            page.wait_for_timeout(120)
            assert page.evaluate("location.hash") == destination, name
            search.fill("")
            if folders.count():
                assert folders.first.evaluate("d => d.open") == initial, name
            page.locator("#searchInput").fill("index")
            assert page.locator(".search-item").count() > 0, name
            page.locator("#searchInput").fill("")
            page.locator("#themeBtn").click()
            assert page.locator("html").get_attribute("data-theme") == "light"
            page.locator("#themeBtn").click()
            assert page.locator("html").get_attribute("data-theme") == "dark"
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(200)
            page.screenshot(path=str(root / f"{name}-navigation.png"))
            if fixture["chart"]:
                assert page.locator(".architecture-pie-svg").count() == 1, name
                center = page.locator(".architecture-pie-center-value")
                assert int(center.inner_text().replace(",", "")) == fixture["files"], name
                page.locator('.architecture-segment[data-metric="lines"]').click()
                assert int(center.inner_text().replace(",", "")) == fixture["lines"], name
                page.locator('.architecture-segment[data-metric="files"]').click()
                page.locator(".architecture-pie-legend-item").first.click()
                assert page.locator(".architecture-pie-legend-item.active").count() == 1, name
                page.screenshot(path=str(root / f"{name}-chart.png"))
                page.set_viewport_size({"width": 390, "height": 844})
                page.locator(".architecture-pie-panel").scroll_into_view_if_needed()
                columns = page.locator(".architecture-pie-panel").evaluate("e => getComputedStyle(e).gridTemplateColumns.split(' ').length")
                assert columns == 1, name
            assert not errors, errors
            results.append({"fixture": name, "result": "PASS", "file_links": fixture["files"], "browser_errors": errors})
            print(f"PASS: {name} — links, collapse, filtering, anchors, search, theme, chart and failure isolation")
        except Exception as error:
            page.screenshot(path=str(root / f"{name}-failure.png"))
            results.append({"fixture": name, "result": "FAIL", "error": str(error), "browser_errors": errors})
            (root / "results.json").write_text(json.dumps(results, indent=2))
            raise
        finally:
            page.close()
    browser.close()
(root / "results.json").write_text(json.dumps(results, indent=2))
