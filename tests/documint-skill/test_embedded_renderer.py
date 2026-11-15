import base64
import json
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2] / "plugins/documint/skills/documenting-codebases/scripts"))
from render_embedded import embed_project_data, validate_project_data

SHELL = '''<!doctype html><meta http-equiv="Content-Security-Policy" content="script-src 'nonce-__DOCUMINT_CSP_NONCE__'">\n<div data-documint-local-code-map></div><script nonce="__DOCUMINT_CSP_NONCE__">let data=atob('__DOCUMINT_DATA_BASE64__');</script>'''

def model():
    return {
        "projectName": "P͏roject > 🚀",
        "summary": {
            "files": 1, "lines": 10, "describedFiles": 0, "undocumentedFiles": 1,
            "symbols": 0, "exports": 0, "internalDependencies": 0,
            "externalDependencies": 0, "todos": 0,
            "languages": [{"name": "python", "files": 1, "lines": 10}],
            "entryPoints": [], "externalDependencyNames": [],
        },
        "files": [{"path": "app.py", "module": "root", "language": "python", "lines": 10,
                   "exports": [], "internalSymbols": [], "todos": [],
                   "environmentVariables": [], "uses": [], "usedBy": [], "entryPoint": False}],
        "modules": [{"name": "root", "primaryFilePaths": ["app.py"], "files": 1, "lines": 10}],
        "edges": [], "readingPath": [], "referencedEnvironmentVariables": [],
        "provenance": {"source": "provided source", "inspectedFiles": 1, "indexedFiles": 1,
                       "revision": "unknown", "analysisMode": "ai-assisted"},
    }

class EmbedTests(unittest.TestCase):
    def test_safe_unicode_roundtrip(self):
        source = model()
        source["files"][0]["description"] = "</script><script>alert('x')</script> 😀"
        html = embed_project_data(SHELL, source, nonce="knownNONCE_for_unit_test")
        self.assertNotIn("__DOCUMINT_DATA_BASE64__", html)
        self.assertNotIn("__DOCUMINT_CSP_NONCE__", html)
        self.assertIn("nonce-knownNONCE_for_unit_test", html)
        self.assertNotIn("<script>alert", html)
        payload = re.search(r"atob\('([A-Za-z0-9+/=]+)'\)", html).group(1)
        recovered = json.loads(base64.b64decode(payload))
        self.assertEqual(recovered, source)

    def test_reject_bad_provenance(self):
        data = model()
        del data["provenance"]
        with self.assertRaisesRegex(ValueError, "provenance"):
            validate_project_data(data)

    def test_reject_file_count_mismatch(self):
        data = model()
        data["summary"]["files"] = 15
        with self.assertRaisesRegex(ValueError, "summary.files"):
            validate_project_data(data)

    def test_reject_unverified_link(self):
        data = model()
        data["files"][0]["uses"] = ["missing.php"]
        with self.assertRaisesRegex(ValueError, "unknown"):
            validate_project_data(data)

    def test_reject_path_traversal(self):
        data = model()
        data["files"][0]["path"] = "../secret.env"
        with self.assertRaisesRegex(ValueError, "path"):
            validate_project_data(data)

    def test_missing_or_duplicated_marker(self):
        data = model()
        with self.assertRaisesRegex(ValueError, "payload marker"):
            embed_project_data("plain html", data)
        with self.assertRaisesRegex(ValueError, "payload marker"):
            embed_project_data(SHELL + "__DOCUMINT_DATA_BASE64__", data)

    def test_reject_partial_coverage_misreported(self):
        data = model()
        data["provenance"]["inspectedFiles"] = 2
        with self.assertRaisesRegex(ValueError, "inspectedFiles"):
            validate_project_data(data)

    def test_reject_unknown_module_edges(self):
        data = model()
        data["edges"] = [{"from": "root", "to": "nonexistent", "count": 1}]
        with self.assertRaisesRegex(ValueError, "edge"):
            validate_project_data(data)


class FormatSelectionTests(unittest.TestCase):
    def test_html_only_uses_original_shell_and_no_markdown(self):
        from tempfile import TemporaryDirectory
        from render_embedded import write_selected_outputs
        with TemporaryDirectory() as directory:
            root = Path(directory)
            template = root / "viewer.html"
            template.write_text(SHELL, encoding="utf-8")
            result = write_selected_outputs(model(), template, root / "out", "html")
            self.assertEqual({p.name for p in result}, {"documentation.html"})
            self.assertIn("data-documint-local-code-map", result[0].read_text(encoding="utf-8"))
            self.assertFalse((root / "out/documentation.md").exists())

    def test_markdown_only_skips_html_template(self):
        from tempfile import TemporaryDirectory
        from render_embedded import write_selected_outputs
        with TemporaryDirectory() as directory:
            root = Path(directory)
            result = write_selected_outputs(model(), root / "does-not-exist.html", root / "out", "markdown")
            self.assertEqual({p.name for p in result}, {"documentation.md"})
            doc = result[0].read_text(encoding="utf-8")
            self.assertIn("app.py", doc)
            self.assertIn("1 inspected / 1 indexed", doc)
            self.assertFalse((root / "out/documentation.html").exists())

    def test_both_writes_two_downloads_from_one_json(self):
        from tempfile import TemporaryDirectory
        from render_embedded import write_selected_outputs
        with TemporaryDirectory() as directory:
            root = Path(directory)
            template = root / "viewer.html"
            template.write_text(SHELL, encoding="utf-8")
            result = write_selected_outputs(model(), template, root / "out", "both")
            self.assertEqual({p.name for p in result}, {"documentation.html", "documentation.md"})

    def test_invalid_format_fails_before_writing(self):
        from tempfile import TemporaryDirectory
        from render_embedded import write_selected_outputs
        with TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaisesRegex(ValueError, "format"):
                write_selected_outputs(model(), root / "missing.html", root / "out", "pdf")
            self.assertFalse((root / "out").exists())

    def test_markdown_escapes_untrusted_source_html(self):
        from render_embedded import markdown_from_project
        data = model()
        data["documentationSections"] = [{
            "heading": "Overview <script>alert(1)</script>",
            "paragraphs": ["Source <img src=x onerror=alert(1)> inspected"],
            "items": ["Evidence only"],
        }]
        doc = markdown_from_project(data)
        self.assertNotIn("<script>", doc)
        self.assertNotIn("<img ", doc)
        self.assertIn("Evidence only", doc)

    def test_short_trigger_and_format_choice_are_packaged(self):
        skill = (Path(__file__).parents[2] / "plugins/documint/skills/documenting-codebases/SKILL.md").read_text()
        manifest = json.loads((Path(__file__).parents[2] / "plugins/documint/plugin.json").read_text())
        self.assertIn("Use DocuMint", skill)
        self.assertIn("format selection", skill.lower())
        self.assertIn("HTML", skill)
        self.assertIn("Markdown", skill)
        self.assertIn("Both", skill)
        self.assertIn("cannot create native clickable checkboxes", skill)
        self.assertEqual(manifest["extensions"]["com.openai"]["interface"]["defaultPrompt"][0], "Use DocuMint")

if __name__ == "__main__": unittest.main()
