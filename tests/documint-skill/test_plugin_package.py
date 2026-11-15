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
            build_zip(REPO, target)
            with zipfile.ZipFile(target) as zf:
                names = zf.namelist()
                self.assertIn("plugin.json", names)
                self.assertIn("skills/documenting-codebases/SKILL.md", names)
                self.assertNotIn("mcp.json", names)
                self.assertNotIn(".mcp.json", names)
                self.assertFalse(any(n.startswith("plugins/") for n in names))
                self.assertFalse(any(n.startswith("/") or ".." in Path(n).parts for n in names))
                self.assertEqual(json.loads(zf.read("plugin.json"))["name"], "documint")

    def test_archives_are_reproducible(self):
        with tempfile.TemporaryDirectory() as directory:
            first, second = Path(directory) / "a.zip", Path(directory) / "b.zip"
            build_zip(REPO, first)
            build_zip(REPO, second)
            self.assertEqual(first.read_bytes(), second.read_bytes())

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
