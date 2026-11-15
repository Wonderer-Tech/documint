#!/usr/bin/env python3
"""Validate and package the serverless DocuMint Agent Plugin (stdlib only)."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import zipfile
from xml.etree import ElementTree


class PluginValidationError(ValueError):
    """Package or authoring metadata violates the skill-only contract."""


def _require(condition: bool, description: str) -> None:
    if not condition:
        raise PluginValidationError(description)


def _json_file(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise PluginValidationError(f"Invalid JSON file: {path}") from exc
    _require(isinstance(value, dict), f"Expected JSON object: {path}")
    return value


def _check_skill(path: Path) -> str:
    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise PluginValidationError(f"Unreadable skill: {path}") from exc
    frontmatter = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n", content, re.DOTALL)
    _require(frontmatter is not None, f"Missing skill YAML frontmatter: {path}")
    fields: dict[str, str] = {}
    for line in frontmatter.group(1).splitlines():
        key, separator, value = line.partition(":")
        _require(separator == ":" and key.strip() in {"name", "description"},
                 f"Unsupported skill metadata: {path}")
        _require(key.strip() not in fields, f"Repeated skill metadata: {path}")
        fields[key.strip()] = value.strip().strip('"')
    _require(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", fields.get("name", "")) is not None,
             "Skill name must be kebab-case")
    _require(fields["name"] == path.parent.name, "Skill name must match folder")
    description = fields.get("description", "")
    _require(description.startswith("Use when ") and len(description) <= 500,
             "Skill description must be a focused trigger (<= 500 characters)")
    _require(len(frontmatter.group(0)) <= 1024, "Skill frontmatter too long")

    # Markdown relative links must remain inside the skill and resolve.
    for ref in re.findall(r"\]\(([^)]+)\)", content):
        if ref.startswith(("https://", "http://", "#")):
            continue
        _require("?" not in ref and "#" not in ref, f"Unsupported relative skill link: {ref}")
        resolved = (path.parent / ref).resolve()
        _require(resolved.is_relative_to(path.parent.resolve()), f"Skill reference escapes folder: {ref}")
        _require(resolved.is_file(), f"Missing referenced resource: {ref}")
    return fields["name"]


def validate_plugin(repo_root: Path) -> dict:
    repo_root = repo_root.resolve()
    root = repo_root / "plugins/documint"
    _require(root.is_dir(), "Missing plugins/documint")
    manifest = _json_file(root / "plugin.json")
    _require(manifest.get("$schema") ==
             "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
             "Missing portable Agent Plugins schema")
    _require(manifest.get("name") == "documint", "Unexpected plugin name")
    _require(re.fullmatch(r"\d+\.\d+\.\d+", str(manifest.get("version", ""))) is not None,
             "Invalid plugin version")
    _require(isinstance(manifest.get("description"), str) and
             len(manifest["description"]) > 20, "Missing plugin description")
    _require(not any(key in manifest for key in ("mcpServers", "apps", "hooks", "skills")),
             "Portable skill-only manifest must not declare MCP, apps, hooks or skill overrides")
    for path in ("mcp.json", ".mcp.json", ".app.json", "hooks", ".codex-plugin"):
        _require(not (root / path).exists(), f"Not a skill-only plugin: {path}")

    skill_files = sorted((root / "skills").glob("*/SKILL.md"))
    _require(len(skill_files) == 1, "Expected exactly one complete DocuMint skill")
    names = [_check_skill(file) for file in skill_files]
    _require((root / "README.md").is_file(), "Missing plugin usage guide")
    _require((root / "LICENSE").is_file(), "Missing MIT license")
    interface = manifest.get("extensions", {}).get("com.openai", {}).get("interface", {})
    _require(isinstance(interface, dict), "Missing OpenAI-specific interface")
    for field in ("displayName", "shortDescription", "longDescription", "developerName", "category"):
        _require(isinstance(interface.get(field), str) and bool(interface[field].strip()),
                 f"Missing listing metadata: {field}")
    _require(len(interface["displayName"]) <= 30 and len(interface["shortDescription"]) <= 30 and
             len(interface["longDescription"]) <= 4000 and len(interface["developerName"]) <= 80,
             "Public listing metadata exceeds submission limits")
    for field in ("websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"):
        url = interface.get(field)
        _require(isinstance(url, str) and url.startswith("https://") and
                 "example.com" not in url, f"Missing valid listing URL: {field}")
    prompts = interface.get("defaultPrompt", [])
    _require(isinstance(prompts, list) and len(prompts) <= 3 and
             all(isinstance(value, str) and 0 < len(value) <= 128 for value in prompts),
             "Invalid starter prompts")
    _require((root / "PRIVACY.md").is_file() and (root / "TERMS.md").is_file(),
             "Privacy policy and terms files are required for this submission")
    publication = manifest.get("extensions", {}).get("com.openai", {}).get("publication", {})
    _require(isinstance(publication.get("release_notes"), str) and bool(publication["release_notes"].strip()),
             "Missing initial release notes")
    for field in ("logo", "composerIcon"):
        relative = interface.get(field, "")
        _require(isinstance(relative, str) and relative.startswith("./assets/") and
                 ".." not in Path(relative).parts, f"Invalid {field} path")
        icon = (root / relative).resolve()
        _require(icon.is_relative_to(root.resolve()) and icon.is_file(), f"Missing {field}")
        _require(icon.suffix.lower() == ".svg" and icon.stat().st_size < 5 * 1024 * 1024,
                 f"Unsupported or oversized {field}")
        try:
            svg = ElementTree.parse(icon).getroot()
        except (OSError, ElementTree.ParseError) as exc:
            raise PluginValidationError(f"Unparseable {field}") from exc
        _require(svg.tag == "{http://www.w3.org/2000/svg}svg", f"Invalid {field} SVG root")
        dimensions = (svg.get("width"), svg.get("height"))
        _require(dimensions[0] is not None and dimensions[1] is not None and
                 all(re.fullmatch(r"[0-9]+", d) for d in dimensions) and
                 int(dimensions[0]) == int(dimensions[1]) and int(dimensions[0]) >= 48,
                 f"{field} must be a square SVG >=48 px")

    marketplace = _json_file(repo_root / ".agents/plugins/marketplace.json")
    plugins = marketplace.get("plugins")
    _require(isinstance(plugins, list) and len(plugins) == 1,
             "Expected a single local plugin marketplace entry")
    item = plugins[0]
    _require(item.get("name") == "documint", "Marketplace plugin name mismatch")
    source = item.get("source", {})
    _require(source.get("source") == "local", "Marketplace must use local source")
    pointer = source.get("path", "")
    _require(pointer.startswith("./") and ".." not in Path(pointer).parts,
             "Marketplace path must remain under repository root")
    _require((repo_root / pointer).resolve() == root.resolve(),
             "Marketplace must point to plugins/documint")
    _require(item.get("policy", {}).get("installation") == "AVAILABLE",
             "Plugin must be available for explicit installation")
    return {"name": manifest["name"], "version": manifest["version"], "skills": names}


RUNTIME_PATH = "skills/documenting-codebases/scripts/documint-cli.cjs"


def build_runtime(repo_root: Path) -> None:
    """Build the exact VS Code Local Mode renderer into a standalone CJS asset."""
    try:
        subprocess.run(["npm", "run", "skill:bundle"], cwd=repo_root, check=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise PluginValidationError(
            "Could not build interactive CLI. Run `npm ci` and `npm run skill:bundle` "
            "in the DocuMint repository first."
        ) from exc
    license_dir = repo_root / "plugins/documint/skills/documenting-codebases/scripts/licenses"
    license_dir.mkdir(parents=True, exist_ok=True)
    for dependency in ("typescript", "marked"):
        dependency_dir = repo_root / "node_modules" / dependency
        candidates = ("LICENSE.txt", "LICENSE.md", "LICENSE", "LICENSE-MIT", "license.md")
        license_file = next((dependency_dir / name for name in candidates
                             if (dependency_dir / name).is_file()), None)
        if license_file is None:
            raise PluginValidationError(
                f"Missing bundled runtime license for {dependency}; run npm ci"
            )
        shutil.copyfile(license_file, license_dir / f"{dependency}.LICENSE.txt")


def build_zip(repo_root: Path, destination: Path) -> Path:
    validate_plugin(repo_root)
    runtime = repo_root.resolve() / "plugins/documint" / RUNTIME_PATH
    _require(runtime.is_file() and runtime.stat().st_size > 0,
             "Compiled CLI missing: run `npm run skill:bundle` before packaging")
    root = repo_root.resolve() / "plugins/documint"
    target = destination.resolve()
    _require(not target.is_relative_to(root.resolve()), "ZIP cannot be inside plugin directory")
    files = sorted(path for path in root.rglob("*") if path.is_file())
    _require(files, "Plugin is empty")
    _require(not any(path.is_symlink() for path in files), "No symlinks allowed in ZIP")
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w") as zf:
        for path in files:
            relative = path.relative_to(root).as_posix()
            _require(not relative.startswith("/") and ".." not in Path(relative).parts,
                     "Invalid archive entry")
            info = zipfile.ZipInfo(relative, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            info.create_system = 3
            zf.writestr(info, path.read_bytes())
    with zipfile.ZipFile(target) as zf:
        _require(zf.testzip() is None, "ZIP CRC check failed")
        _require("plugin.json" in zf.namelist() and
                 "skills/documenting-codebases/SKILL.md" in zf.namelist(),
                 "ZIP lacks installable plugin entries")
        _require(RUNTIME_PATH in zf.namelist(), "Compiled interactive CLI is absent from ZIP")
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "package"))
    parser.add_argument("--output", type=Path, default=Path("documint-skill-plugin.zip"))
    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    try:
        result = validate_plugin(repo_root)
        if args.action == "package":
            build_runtime(repo_root)
            print(f"PACKAGED {build_zip(repo_root, args.output)}")
        else:
            print(f"VALID: {result['name']} v{result['version']}; skills: {', '.join(result['skills'])}")
        return 0
    except PluginValidationError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
