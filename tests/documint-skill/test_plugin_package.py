"""Offline structural and ZIP distribution tests for the DocuMint skill plugin.

These tests do not substitute for model/agent behavior acceptance tests.
"""
from __future__ import annotations

import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
import zipfile

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "tools"))

from documint_skill_plugin import PluginValidationError, build_zip, validate_plugin  # noqa: E402


class SkillPackageTests(unittest.TestCase):
    def test_complete_repository_plugin_validates(self):
        result = validate_plugin(REPO)
        self.assertEqual(result["name"], "documint")
        self.assertEqual(result["skills"], ["documenting-codebases"])

    def test_manifest_name_and_schema_are_required(self):
        with self.copy_repo() as root:
            target = root / "plugins/documint/plugin.json"
            data = json.loads(target.read_text())
            data["name"] = "INVALID/NAME"
            target.write_text(json.dumps(data))
            with self.assertRaises(PluginValidationError):
                validate_plugin(root)

    def test_official_portable_plugin_format(self):
        manifest = json.loads((REPO / 'plugins/documint/plugin.json').read_text())
        self.assertEqual(manifest['$schema'], 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
        self.assertNotIn('skills', manifest)  # skill folder is autodiscovered in portable format
        self.assertNotIn('mcpServers', manifest)
        self.assertNotIn('apps', manifest)
        self.assertFalse((REPO / 'plugins/documint/.codex-plugin').exists())
        ui = manifest['extensions']['com.openai']['interface']
        self.assertLessEqual(len(ui['shortDescription']), 30)
        self.assertTrue(all(isinstance(p, str) and len(p) <= 128 for p in ui['defaultPrompt']))
        self.assertLessEqual(len(ui['defaultPrompt']), 3)
        for field in ('websiteURL','supportURL','privacyPolicyURL','termsOfServiceURL'):
            self.assertTrue(ui[field].startswith('https://'), field)
        self.assertIn('publication', manifest['extensions']['com.openai'])
        self.assertTrue((REPO / 'plugins/documint/PRIVACY.md').is_file())
        self.assertTrue((REPO / 'plugins/documint/TERMS.md').is_file())

    def test_missing_policy_file_is_rejected(self):
        with self.copy_repo() as root:
            (root / 'plugins/documint/PRIVACY.md').unlink()
            with self.assertRaises(PluginValidationError):
                validate_plugin(root)

    def test_missing_skill_rejected(self):
        with self.copy_repo() as root:
            (root / "plugins/documint/skills/documenting-codebases/SKILL.md").unlink()
            with self.assertRaises(PluginValidationError):
                validate_plugin(root)

    def test_skill_local_reference_traversal_rejected(self):
        with self.copy_repo() as root:
            target = root / "plugins/documint/skills/documenting-codebases/SKILL.md"
            target.write_text(target.read_text() + "\n[escape](../../../../etc/passwd)\n")
            with self.assertRaises(PluginValidationError):
                validate_plugin(root)

    def test_missing_brand_icon_is_rejected(self):
        with self.copy_repo() as root:
            (root / "plugins/documint/assets/logo.svg").unlink()
            with self.assertRaises(PluginValidationError):
                validate_plugin(root)

    def test_non_square_brand_icon_is_rejected(self):
        with self.copy_repo() as root:
            icon = root / "plugins/documint/assets/logo.svg"
            icon.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60"/>')
            with self.assertRaises(PluginValidationError):
                validate_plugin(root)

    def test_mcp_server_manifest_rejected(self):
        with self.copy_repo() as root:
            (root / "plugins/documint/mcp.json").write_text("{}")
            with self.assertRaises(PluginValidationError):
                validate_plugin(root)

    def test_bad_marketplace_pointer_rejected(self):
        with self.copy_repo() as root:
            target = root / ".agents/plugins/marketplace.json"
            data = json.loads(target.read_text())
            data["plugins"][0]["source"]["path"] = "../private"
            target.write_text(json.dumps(data))
            with self.assertRaises(PluginValidationError):
                validate_plugin(root)

    def test_archive_root_and_contents_are_installable(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "documint-skill.zip"
            with self.copy_repo() as root:
                build_zip(root, target)
            with zipfile.ZipFile(target) as zf:
                names = zf.namelist()
                self.assertIn("plugin.json", names)
                self.assertNotIn('.codex-plugin/plugin.json', names)
                self.assertIn("skills/documenting-codebases/SKILL.md", names)
                self.assertIn("skills/documenting-codebases/assets/documint-renderer.html", names)
                self.assertIn("skills/documenting-codebases/assets/project-data.schema.json", names)
                self.assertIn("skills/documenting-codebases/scripts/render_embedded.py", names)
                self.assertNotIn("skills/documenting-codebases/scripts/documint-cli.cjs", names)
                self.assertNotIn("mcp.json", names)
                self.assertNotIn(".mcp.json", names)
                self.assertFalse(any(n.startswith("plugins/") for n in names))
                self.assertFalse(any(n.startswith("/") or ".." in Path(n).parts for n in names))
                self.assertEqual(json.loads(zf.read("plugin.json"))["name"], "documint")

    def test_archives_are_reproducible(self):
        with tempfile.TemporaryDirectory() as directory:
            first, second = Path(directory) / "a.zip", Path(directory) / "b.zip"
            with self.copy_repo() as root:
                build_zip(root, first)
                build_zip(root, second)
            self.assertEqual(first.read_bytes(), second.read_bytes())

    def test_zip_rejects_missing_embedded_renderer(self):
        with self.copy_repo() as root, tempfile.TemporaryDirectory() as directory:
            (root / "plugins/documint/skills/documenting-codebases/assets/documint-renderer.html").unlink()
            with self.assertRaises(PluginValidationError):
                build_zip(root, Path(directory) / "bad.zip")

    def test_skill_uses_bundled_renderer_not_required_cli(self):
        skill = (REPO / "plugins/documint/skills/documenting-codebases/SKILL.md").read_text()
        self.assertIn("documint-renderer.html", skill)
        self.assertIn("__DOCUMINT_DATA_BASE64__", skill)
        self.assertIn("without Python", skill)
        self.assertIn("No DocuMint CLI", skill)

    from contextlib import contextmanager

    @contextmanager
    def copy_repo(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(REPO / "plugins/documint", root / "plugins/documint")
            shutil.copytree(REPO / ".agents/plugins", root / ".agents/plugins")
            yield root


if __name__ == "__main__":
    unittest.main()
