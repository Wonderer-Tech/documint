# Embedded Interactive HTML Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:verification-before-completion.

**Goal:** Bundle the real DocuMint interactive HTML UI as a serverless Skill renderer that consumes conservative project JSON.

**Architecture:** Export a static shell from canonical Local HTML renderer source, embed provenance-aware project JSON as base64 with per-file CSP nonce, and package the shell with Skill instructions/schema/optional stdlib assembler.

**Tech Stack:** Existing DocuMint TypeScript renderer sources, Node 22 built-ins for snapshot export, Python 3 stdlib for safe data substitution, Agent Plugin `SKILL.md`.

**Spec:** `docs/superpowers/specs/2026-11-15-documint-embedded-html-skill-design.md`

## Constraints

- MCP remains off. No server, GitHub Actions, CI dispatch, PR, VS Code release or OpenAI publication.
- Do not claim deterministic source facts when assembled by an AI skill.
- The committed HTML asset and bundled ZIP must include the canonical UI and no runtime executable.

## Tasks

- [x] Baseline: identify original renderer's CSS, scripts, LocalCodeMapData JSON contract and HTML shell.
- [x] Write failing tests for embedded payload, CSP nonce and provenance/edge validation.
- [x] Implement stdlib JSON-to-HTML assembler; run tests.
- [x] Add source snapshot exporter and embedded HTML asset (canonical renderer markup/styling).
- [x] Add Skill rules, JSON schema, example data and coverage banner.
- [x] Remove mandatory compiled-CLI packaging; validate portable ZIP.
- [ ] Re-run package tests with actual canonical HTML asset, validate browser interactions and preserve evidence.
- [ ] Verify GitHub branch and fast-forward merge to main only after validation.
