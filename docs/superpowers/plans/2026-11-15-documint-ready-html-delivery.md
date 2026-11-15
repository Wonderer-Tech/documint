# DocuMint ready HTML delivery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Direct ready-to-open HTML from DocuMint Skill with no generator-only substitute.
**Architecture:** Pin and verify original bundled renderer, render from JSON or legacy ZIP, verify actual outputs and selected-format ZIP; fail closed when asset/file tools missing.
**Tech Stack:** Python 3 standard library, immutable Git blob, Node/browser acceptance, ChatGPT Skill.
**Spec:** `docs/superpowers/specs/2026-11-15-documint-ready-html-delivery.md`

## Global constraints
- Reuse original DocuMint Local UI; no alternate design, MCP server, Google Drive or external runtime API.
- Do not alter VS Code Local Mode analyzer/renderer.
- Distinguish user-visible HTML UI parity from analyzer output equivalence.
- No automatic GitHub Actions, VS Code release or public Plugin publication.

## Tasks
- [x] Reproduce generator-only ZIP missing renderer and blocked remote fetch.
- [x] Add failing tests for fake renderer acceptance and missing ready HTML.
- [x] Implement pinned renderer verification, JSON/CSP integrity check, and atomic ready-output writing.
- [x] Support input-zip recovery without running untrusted scripts and ready ZIP with actual docs.
- [x] Require direct download success in Skill and update metadata/docs.
- [x] Add actual renderer end-to-end tests and packaging-integrity tests.
- [ ] Execute original-asset full Python tests in local source checkout.
- [ ] Execute browser acceptance on generated full HTML.
- [ ] Execute ChatGPT installation end-to-end against a real accessible project.
