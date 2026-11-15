"""Offline browser acceptance for the embedded original DocuMint HTML UI.

Run after checkout:
  python3 test/browser/embeddedRendererAcceptance.py
Requires installed Playwright and Chromium. Does not call the network or run
any untrusted project scripts; it uses only the bundled example JSON fixture.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "plugins/documint/skills/documenting-codebases"
sys.path.insert(0, str(SKILL / "scripts"))
from render_embedded import embed_project_data  # noqa: E402

TEMPLATE = SKILL / "assets/documint-renderer.html"
EXAMPLE = SKILL / "assets/project-data-example.json"


def run() -> None:
    sample = json.loads(EXAMPLE.read_text(encoding="utf-8"))
    html = embed_project_data(TEMPLATE.read_text(encoding="utf-8"), sample)
    assert "__DOCUMINT_DATA_BASE64__" not in html
    assert "__DOCUMINT_CSP_NONCE__" not in html
    errors = []
    remote = []
    with TemporaryDirectory(prefix="documint-embedded-") as folder, sync_playwright() as playwright:
        report = Path(folder) / "documentation.html"
        report.write_text(html, encoding="utf-8")
        options = {"headless": True, "args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_EXECUTABLE"):
            options["executable_path"] = os.environ["CHROMIUM_EXECUTABLE"]
        browser = playwright.chromium.launch(**options)
        page = browser.new_page(viewport={"width": 1440, "height": 960})
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("request", lambda request: remote.append(request.url) if request.url.startswith(("http://", "https://")) else None)
        page.goto(report.as_uri(), wait_until="load")
        page.locator("#localMapTreemap").wait_for(state="attached")
        page.wait_for_function("document.getElementById('localMapTreemap').children.length > 0")
        assert page.title() == "Example Notes — Documentation"
        assert page.locator("#documintEmbeddedFiles").inner_text() == "3"
        assert "3 files inspected / 3 files indexed" in page.locator("#documint-embedded-evidence").inner_text()
        assert page.locator("#localMapModules").count() == 1
        assert page.locator("#localMapSearch").count() == 1
        assert page.locator("#localMapZoomIn").count() == 1
        original_theme = page.locator("html").get_attribute("data-theme")
        page.locator("#themeBtn").click()
        assert page.locator("html").get_attribute("data-theme") != original_theme
        page.locator("#localMapSearch").fill("main.js")
        assert "src/main.js" in page.locator("#localMapResults").inner_text()
        assert not errors, f"Browser JavaScript errors: {errors}"
        assert not remote, f"Unexpected remote network request: {remote}"
        browser.close()
    print("PASS: original offline DocuMint UI, treemap, search, theme, source coverage and no remote requests")


if __name__ == "__main__":
    run()
