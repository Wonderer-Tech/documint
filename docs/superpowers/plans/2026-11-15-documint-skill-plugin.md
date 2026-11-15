# DocuMint Skill-only Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans, superpowers:writing-skills and verification-before-completion.

**Goal:** Create a portable, no-server DocuMint documentation skill package.

**Architecture:** One source-grounded skill with bundled references and templates, a portable root manifest, optional marketplace listing, and a deterministic ZIP builder. No MCP configuration or Node execution is bundled.

**Tech Stack:** Agent Plugins 1.0.0 JSON manifest; Agent Skills Markdown; Python 3 standard library for packaging tests.

**Spec:** `docs/superpowers/specs/2026-11-15-documint-skill-plugin-design.md`

## Global constraints

- No MCP server or URL, no GitHub Actions, no PR, no merge to main, no release/publish.
- Keep original VS Code extension untouched.
- Do not claim the new skill executes DocuMint's deterministic analyzer.

## Task 1 — Packaging RED → GREEN

- [x] Write package tests for manifest identity, skill links, marketplace path, MCP rejection and archive reproducibility.
- [x] Observe initial failing test: missing `documint_skill_plugin` validator module.
- [x] Add the standard-library `tools/documint_skill_plugin.py` verifier/packager.
- [x] Run 8 package tests and `check`/`package`: pass locally.

## Task 2 — Skill and references

- [x] Create `plugins/documint/skills/documenting-codebases/SKILL.md` with goal-triggered discovery metadata.
- [x] Add source evidence, documentation standards, project and single-file templates.
- [x] Record manual agent behavior cases including inaccessible source, partial context and README prompt injection. Baseline observed in earlier chat: the agent incorrectly pursued MCP work when a skill plugin was wanted.
- [ ] Run model-behavior scenarios S1–S10 in a fresh installed plugin session (requires installation and eligible agent runtime).

## Task 3 — Distribution

- [x] Create portable manifest and brand icons derived from the repository SVG glyph.
- [x] Add repo-local marketplace for optional desktop testing.
- [x] Build reproducible installable skill ZIP with plugin.json at root; no MCP files.
- [ ] Upload to OpenAI submission portal and confirm ingestion, automated checks, and publication approval (user action).

## Review focus

Skill must not claim AST parity; missing private sources are not fabricated; generated Markdown states coverage; plugin manifest and icons satisfy file format; ZIP does not contain unrelated code/secrets; marketplace path resolves from repository root.
