#!/usr/bin/env python3
"""Embed source-grounded project JSON into DocuMint's self-contained HTML viewer.

The viewer's CSS, UI markup and JavaScript are generated from the canonical
DocuMint Local HTML renderer at plugin-build time. This stdlib helper does not
run or reproduce the TypeScript source analyzer. No network access is needed.
"""
from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path
import re
import secrets

DATA_MARKER = "__DOCUMINT_DATA_BASE64__"
NONCE_MARKER = "__DOCUMINT_CSP_NONCE__"
MAX_JSON_BYTES = 8 * 1024 * 1024
MAX_FILES = 10_000


def _is_integer(value: object, minimum: int = 0) -> bool:
    return type(value) is int and value >= minimum


def _valid_path(value: object) -> bool:
    if not isinstance(value, str) or not value or len(value) > 2048:
        return False
    if "\\" in value or "\x00" in value or value.startswith("/"):
        return False
    segments = value.split("/")
    return all(segment not in {"", ".", ".."} for segment in segments)


def _require(value: bool, reason: str) -> None:
    if not value:
        raise ValueError(reason)


def validate_project_data(data: object) -> dict:
    """Reject malformed/inconsistent data rather than fabricating source facts."""
    _require(isinstance(data, dict), "project data must be a JSON object")
    _require(isinstance(data.get("projectName"), str) and 0 < len(data["projectName"]) <= 240,
             "projectName must be nonempty and <= 240 characters")
    files = data.get("files")
    _require(isinstance(files, list) and 0 < len(files) <= MAX_FILES, "files must be a nonempty bounded array")
    summary = data.get("summary")
    _require(isinstance(summary, dict), "summary must be a JSON object")
    _require(summary.get("files") == len(files) and _is_integer(summary.get("files"), 1),
             "summary.files must exactly equal number of indexed files")
    required_totals = ("lines", "describedFiles", "undocumentedFiles", "symbols",
                       "exports", "internalDependencies", "externalDependencies", "todos")
    for field in required_totals:
        _require(_is_integer(summary.get(field)), f"summary.{field} must be nonnegative integer")
    for field in ("languages", "entryPoints", "externalDependencyNames"):
        _require(isinstance(summary.get(field), list), f"summary.{field} must be an array")
    provenance = data.get("provenance")
    _require(isinstance(provenance, dict), "provenance is required")
    _require(provenance.get("analysisMode") in {"ai-assisted", "source-backed"},
             "provenance.analysisMode must declare the analysis method")
    for field in ("inspectedFiles", "indexedFiles"):
        _require(_is_integer(provenance.get(field)), f"provenance.{field} must be nonnegative integer")
    _require(0 <= provenance["inspectedFiles"] <= provenance["indexedFiles"] <= len(files),
             "provenance.inspectedFiles must not exceed indexedFiles or files")
    _require(isinstance(provenance.get("source"), str) and bool(provenance["source"].strip()),
             "provenance.source is required")
    _require(isinstance(provenance.get("revision", ""), str), "provenance.revision must be text")

    paths: set[str] = set()
    file_modules: set[str] = set()
    for item in files:
        _require(isinstance(item, dict), "files entries must be objects")
        path = item.get("path")
        _require(_valid_path(path), f"invalid file path: {path!r}")
        _require(path not in paths, f"duplicate file path: {path}")
        paths.add(path)
        _require(isinstance(item.get("module"), str) and bool(item["module"].strip()),
                 f"file {path}: module required")
        file_modules.add(item["module"])
        _require(isinstance(item.get("language"), str) and bool(item["language"].strip()),
                 f"file {path}: language required")
        _require(_is_integer(item.get("lines")), f"file {path}: lines invalid")
        _require(type(item.get("entryPoint")) is bool, f"file {path}: entryPoint must be boolean")
        for key in ("exports", "internalSymbols", "todos", "environmentVariables", "uses", "usedBy"):
            _require(isinstance(item.get(key), list), f"file {path}: {key} must be an array")

    for item in files:
        for key in ("uses", "usedBy"):
            for dest in item[key]:
                _require(dest in paths, f"file {item['path']}: {key} refers to unknown file {dest!r}")

    modules = data.get("modules")
    _require(isinstance(modules, list) and bool(modules), "modules must be a nonempty array")
    names: set[str] = set()
    for item in modules:
        _require(isinstance(item, dict) and isinstance(item.get("name"), str), "invalid module entry")
        _require(item["name"] not in names, f"duplicate module: {item['name']}")
        names.add(item["name"])
        _require(isinstance(item.get("primaryFilePaths"), list), "module primaryFilePaths must be an array")
        _require(_is_integer(item.get("files"), 1), "module files must be positive integer")
        _require(_is_integer(item.get("lines")), "module lines must be integer")
        for path in item["primaryFilePaths"]:
            _require(path in paths, f"module {item['name']}: unknown primary file {path!r}")
    _require(file_modules.issubset(names), "file module missing from modules array")
    _require(isinstance(data.get("edges"), list), "edges must be an array")
    for edge in data["edges"]:
        _require(isinstance(edge, dict) and edge.get("from") in names and edge.get("to") in names
                 and _is_integer(edge.get("count"), 1), f"invalid or unknown module edge: {edge!r}")
    for field in ("readingPath", "referencedEnvironmentVariables"):
        _require(isinstance(data.get(field), list), f"{field} must be an array")
    return data


def embed_project_data(template: str, data: dict, *, nonce: str | None = None) -> str:
    validate_project_data(data)
    _require(template.count(DATA_MARKER) == 1, "expected exactly one payload marker")
    _require(NONCE_MARKER in template, "missing security nonce marker")
    _require("data-documint-local-code-map" in template, "not a canonical DocuMint HTML shell")
    packed = json.dumps(data, ensure_ascii=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
    _require(len(packed) <= MAX_JSON_BYTES, "project data exceeds 8 MiB")
    chosen_nonce = nonce or secrets.token_urlsafe(24)
    _require(re.fullmatch(r"[A-Za-z0-9_\-]{12,100}", chosen_nonce) is not None,
             "invalid security nonce")
    encoded = base64.b64encode(packed).decode("ascii")
    return template.replace(DATA_MARKER, encoded).replace(NONCE_MARKER, chosen_nonce)



def _markdown_text(value: object) -> str:
    """Escape source strings for safe, readable Markdown."""
    text = " ".join(str(value).split()).replace("\\", "\\\\")
    for char in (chr(96), "*", "_", "[", "]", "<", ">", "#", "|"):
        text = text.replace(char, "\\" + char)
    return text


def markdown_from_project(data: dict) -> str:
    """Build a conservative Markdown report using the same validated JSON."""
    validate_project_data(data)
    summary = data["summary"]
    prov = data["provenance"]
    lines = [
        "# " + _markdown_text(data["projectName"]), "",
        "> DocuMint Skill output from AI-assisted evidence; not the VS Code deterministic analyzer.", "",
        "## Source coverage", "",
        "- Source: " + _markdown_text(prov["source"]),
        "- Revision: " + _markdown_text(prov.get("revision") or "not pinned"),
        f"- Coverage: {prov['inspectedFiles']} inspected / {prov['indexedFiles']} indexed files",
        "- Analysis mode: " + _markdown_text(prov["analysisMode"]),
    ]
    if prov.get("notes"):
        lines.append("- Limits: " + _markdown_text(prov["notes"]))
    lines += ["", "## Project summary", "",
              f"- Indexed files: {summary['files']}",
              f"- Known lines: {summary['lines']}",
              f"- Module groups: {len(data['modules'])}",
              f"- Observed internal dependencies: {summary['internalDependencies']}",
              "", "## Modules", ""]
    for module in data["modules"]:
        lines.append("- " + _markdown_text(module["name"]) +
                     f" — {module['files']} indexed file(s), {module['lines']} known lines")
        if module.get("description"):
            lines.append("  - " + _markdown_text(module["description"]))
    lines += ["", "## Indexed source files", ""]
    for file in data["files"]:
        entry = "- " + chr(96) + _markdown_text(file["path"]) + chr(96)
        if file.get("description"):
            entry += " — " + _markdown_text(file["description"])
        lines.append(entry)
    if data["edges"]:
        lines += ["", "## Observed module dependencies", ""]
        for edge in data["edges"]:
            lines.append("- " + _markdown_text(edge["from"]) + " → " +
                         _markdown_text(edge["to"]) + f" ({edge['count']} edge(s))")
    for section in data.get("documentationSections", []):
        if not isinstance(section, dict) or not isinstance(section.get("heading"), str):
            continue
        lines += ["", "## " + _markdown_text(section["heading"]), ""]
        for paragraph in section.get("paragraphs", []):
            lines += [_markdown_text(paragraph), ""]
        for item in section.get("items", []):
            lines.append("- " + _markdown_text(item))
    lines += ["", "## Verification limits", "",
              "Filename-only entries are not evidence of code behavior or passing tests.", ""]
    return "\n".join(lines).rstrip() + "\n"


def write_selected_outputs(data: dict, template_path: Path,
                           output_directory: Path, output_format: str) -> list[Path]:
    """Use the original HTML viewer for HTML, Markdown from the same data for .md."""
    if output_format not in {"html", "markdown", "both"}:
        raise ValueError(f"unsupported output format: {output_format}")
    validate_project_data(data)
    html = (embed_project_data(template_path.read_text(encoding="utf-8"), data)
            if output_format in {"html", "both"} else None)
    markdown = (markdown_from_project(data) if output_format in {"markdown", "both"}
                else None)
    output_directory.mkdir(parents=True, exist_ok=True)
    written = []
    if html is not None:
        output = output_directory / "documentation.html"
        output.write_text(html, encoding="utf-8")
        written.append(output)
    if markdown is not None:
        output = output_directory / "documentation.md"
        output.write_text(markdown, encoding="utf-8")
        written.append(output)
    return written



# Identical Git blob SHA of the committed original DocuMint Local HTML viewer.
CANONICAL_RENDERER_GIT_BLOB_SHA1 = "ec66c180f09a0df8ef2eb6f3c8765b185716d8f6"


def _git_blob_sha1(raw: bytes) -> str:
    import hashlib
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\x00" + raw).hexdigest()


def verify_renderer_template(
    template: str, *, expected_renderer_sha: str = CANONICAL_RENDERER_GIT_BLOB_SHA1,
) -> None:
    """Refuse a fake viewer or a downloaded/mutated renderer instead of the pinned UI."""
    _require(isinstance(template, str), "original renderer template must be text")
    for marker in ('<html', 'data-documint-local-code-map',
                   'id="documintLocalCodeMapData"', 'localMapSearch',
                   'localMapTreemap', 'renderTreemap',
                   'Content-Security-Policy', 'connect-src'):
        _require(marker in template, f"Original DocuMint renderer missing: {marker}")
    _require(template.count(DATA_MARKER) == 1,
             "original renderer requires exactly one data placeholder")
    _require(template.count(NONCE_MARKER) >= 2,
             "original renderer requires CSP nonce placeholders")
    raw = template.encode("utf-8")
    _require(_git_blob_sha1(raw) == expected_renderer_sha,
             "original renderer SHA mismatch: template absent, truncated or modified")
    if expected_renderer_sha == CANONICAL_RENDERER_GIT_BLOB_SHA1:
        _require(len(raw) >= 300_000, "original renderer unexpectedly small")


def verify_completed_html(
    html: str, data: dict, *, original_template: str,
    expected_renderer_sha: str = CANONICAL_RENDERER_GIT_BLOB_SHA1,
) -> None:
    """Prove final HTML exactly retains the original UI except project JSON and nonce."""
    verify_renderer_template(original_template, expected_renderer_sha=expected_renderer_sha)
    validate_project_data(data)
    _require(DATA_MARKER not in html and NONCE_MARKER not in html,
             "output still contains a renderer placeholder")
    found = re.search(r"atob\('([A-Za-z0-9+/=]+)'\)", html)
    _require(found is not None, "original DocuMint embedded-data bootstrap missing")
    try:
        decoded = base64.b64decode(found.group(1), validate=True)
        actual_data = json.loads(decoded.decode("utf-8"))
    except (ValueError, UnicodeError) as exc:
        raise ValueError("invalid embedded project data") from exc
    _require(actual_data == data, "HTML data differs from approved source evidence")
    nonce = re.search(r"script-src 'nonce-([A-Za-z0-9_-]{12,100})'", html)
    _require(nonce is not None, "generated HTML lacks CSP nonce")
    restored = html.replace(found.group(1), DATA_MARKER).replace(nonce.group(1), NONCE_MARKER)
    _require(restored == original_template,
             "generated HTML differs from canonical DocuMint UI outside data slots")


def load_project_from_zip(archive_path: Path) -> dict:
    """Read an earlier generator-only ZIP safely; never execute its scripts."""
    import zipfile
    with zipfile.ZipFile(archive_path, "r") as zf:
        entries = [e for e in zf.infolist() if e.filename == "project-data.json"]
        _require(len(entries) == 1, "ZIP requires one root project-data.json")
        _require(entries[0].file_size <= MAX_JSON_BYTES,
                 "project-data.json exceeds input limit")
        data = json.loads(zf.read(entries[0]).decode("utf-8"))
    return validate_project_data(data)


def render_verified_outputs(
    data: dict, template_path: Path, output_directory: Path, output_format: str,
    *, zip_path: Path | None = None,
    expected_renderer_sha: str = CANONICAL_RENDERER_GIT_BLOB_SHA1,
) -> list[Path]:
    """Produce verified HTML/Markdown and optionally a ZIP containing actual output."""
    import os
    import tempfile
    import zipfile
    _require(output_format in {"html", "markdown", "both"},
             f"unsupported format: {output_format}")
    validate_project_data(data)
    html = None
    markdown = None
    if output_format in {"html", "both"}:
        template = template_path.read_text(encoding="utf-8")
        verify_renderer_template(template, expected_renderer_sha=expected_renderer_sha)
        html = embed_project_data(template, data)
        verify_completed_html(html, data, original_template=template,
                              expected_renderer_sha=expected_renderer_sha)
    if output_format in {"markdown", "both"}:
        markdown = markdown_from_project(data)
    outputs = {}
    if html is not None:
        outputs["documentation.html"] = html.encode("utf-8")
    if markdown is not None:
        outputs["documentation.md"] = markdown.encode("utf-8")
    _require(not output_directory.is_symlink(), "refuse symlink output directory")
    output_directory.mkdir(parents=True, exist_ok=True)
    written = []
    for filename, content in outputs.items():
        target = output_directory / filename
        _require(not target.is_symlink(), f"refuse symlink output: {target}")
        fd, temp_file = tempfile.mkstemp(prefix=".documint-", suffix=".tmp", dir=output_directory)
        try:
            with os.fdopen(fd, "wb") as fp:
                fp.write(content)
                fp.flush()
                os.fsync(fp.fileno())
            os.replace(temp_file, target)
            written.append(target)
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    if zip_path is not None:
        _require(not zip_path.is_symlink(), "refuse symlink ZIP destination")
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary_zip = tempfile.mkstemp(prefix=".documint-zip-", suffix=".tmp", dir=zip_path.parent)
        os.close(fd)
        try:
            with zipfile.ZipFile(temporary_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                for file in written:
                    zf.write(file, arcname=file.name)
            with zipfile.ZipFile(temporary_zip) as zf:
                _require(zf.testzip() is None and set(zf.namelist()) == set(outputs),
                         "ready ZIP must contain exactly the selected documentation files")
            os.replace(temporary_zip, zip_path)
        finally:
            if os.path.exists(temporary_zip):
                os.unlink(temporary_zip)
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--data", type=Path, help="source-grounded project JSON")
    inputs.add_argument("--input-zip", type=Path, help="prior generator-only ZIP with project-data.json")
    parser.add_argument("--template", type=Path, default=Path(__file__).resolve().parent.parent / "assets/documint-renderer.html")
    parser.add_argument("--format", choices=("html", "markdown", "both"), default="html")
    parser.add_argument("--out-dir", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, help="legacy explicit output path; one format only")
    parser.add_argument("--zip-out", type=Path, help="optional ZIP with finished documentation, never generator only")
    args = parser.parse_args()
    if args.output and args.format == "both":
        parser.error("use --out-dir for both")
    data = (load_project_from_zip(args.input_zip) if args.input_zip
            else json.loads(args.data.read_text(encoding="utf-8")))
    paths = render_verified_outputs(data, args.template,
                                    args.output.parent if args.output else args.out_dir,
                                    args.format, zip_path=args.zip_out)
    if args.output:
        paths[0].replace(args.output)
        paths = [args.output]
    for file in paths:
        print(f"VERIFIED {file} ({file.stat().st_size} bytes) — "
              f"{data['provenance']['inspectedFiles']}/{data['provenance']['indexedFiles']} inspected")
    if args.zip_out:
        print(f"VERIFIED ZIP {args.zip_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
