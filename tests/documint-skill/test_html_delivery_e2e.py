"""End-to-end offline delivery contract: a complete original HTML, not a generator ZIP."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "plugins/documint"
sys.path.insert(0, str(ROOT / "skills/documenting-codebases/scripts"))
from render_embedded import (  # noqa: E402
    verify_renderer_template, verify_completed_html, load_project_from_zip
)


class RealHtmlDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.template_path = ROOT / "skills/documenting-codebases/assets/documint-renderer.html"
        self.helper_path = ROOT / "skills/documenting-codebases/scripts/render_embedded.py"
        self.example_path = ROOT / "skills/documenting-codebases/assets/project-data-example.json"

    def test_shipped_renderer_is_canonical_full_documint_viewer(self):
        original = self.template_path.read_text(encoding="utf-8")
        verify_renderer_template(original)
        self.assertGreater(len(original.encode("utf-8")), 300_000)
        self.assertIn("renderTreemap", original)
        self.assertIn("localMapSearch", original)

    def test_renders_real_example_to_html_and_markdown_offline(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            proc = subprocess.run(
                [sys.executable, "-I", str(self.helper_path), "--data", str(self.example_path),
                 "--format", "both", "--out-dir", str(root), "--zip-out", str(root / "ready.zip")],
                capture_output=True, text=True, check=False, timeout=30
            )
            self.assertEqual(proc.returncode, 0, proc.stderr)
            html_file, md_file = root / "documentation.html", root / "documentation.md"
            self.assertTrue(html_file.is_file(), proc.stdout)
            self.assertTrue(md_file.is_file(), proc.stdout)
            model = json.loads(self.example_path.read_text(encoding="utf-8"))
            verify_completed_html(
                html_file.read_text(encoding="utf-8"), model,
                original_template=self.template_path.read_text(encoding="utf-8")
            )
            self.assertGreater(html_file.stat().st_size, 300_000)
            self.assertIn(model["projectName"], md_file.read_text(encoding="utf-8"))
            with zipfile.ZipFile(root / "ready.zip") as zf:
                self.assertEqual(set(zf.namelist()), {"documentation.html", "documentation.md"})
                self.assertGreater(len(zf.read("documentation.html")), 300_000)

    def test_repairs_generator_only_input_zip_with_offline_bundled_asset(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            previous = root / "generator-only.zip"
            with zipfile.ZipFile(previous, "w") as zf:
                zf.write(self.example_path, "project-data.json")
                zf.writestr("render_documint.py", "# earlier response mistakenly provided a generator")
            self.assertIn("projectName", load_project_from_zip(previous))
            output = root / "finished"
            proc = subprocess.run(
                [sys.executable, "-I", str(self.helper_path), "--input-zip", str(previous),
                 "--format", "html", "--out-dir", str(output)],
                capture_output=True, text=True, timeout=30, check=False
            )
            self.assertEqual(proc.returncode, 0, proc.stderr)
            html = (output / "documentation.html").read_text(encoding="utf-8")
            self.assertIn("data-documint-local-code-map", html)
            self.assertNotIn("__DOCUMINT_DATA_BASE64__", html)
            self.assertFalse((output / "render_documint.py").exists())

    def test_refuses_changed_renderer_without_partial_success_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fake = root / "modified.html"
            fake.write_text(self.template_path.read_text(encoding="utf-8").replace(
                'DocuMint — Interactive Documentation', 'Fake UI'))
            output = root / "finished"
            proc = subprocess.run(
                [sys.executable, "-I", str(self.helper_path), "--data", str(self.example_path),
                 "--template", str(fake), "--out-dir", str(output)],
                capture_output=True, text=True, timeout=30, check=False
            )
            self.assertNotEqual(proc.returncode, 0)
            self.assertIn("SHA mismatch", proc.stderr)
            self.assertFalse((output / "documentation.html").exists())


if __name__ == "__main__":
    unittest.main()
