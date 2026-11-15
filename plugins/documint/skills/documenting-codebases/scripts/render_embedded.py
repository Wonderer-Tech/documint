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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, type=Path, help="source-grounded LocalCodeMapData JSON")
    parser.add_argument("--template", type=Path, default=Path(__file__).resolve().parent.parent / "assets/documint-renderer.html")
    parser.add_argument("--output", required=True, type=Path, help="output documentation.html")
    args = parser.parse_args()
    data = json.loads(args.data.read_text(encoding="utf-8"))
    result = embed_project_data(args.template.read_text(encoding="utf-8"), data)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding="utf-8")
    print(f"Wrote {args.output} ({len(result.encode('utf-8'))} bytes) — source evidence: {data['provenance']['inspectedFiles']}/{data['provenance']['indexedFiles']} inspected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
