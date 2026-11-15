# DocuMint Interactive Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:verification-before-completion. Execute tasks sequentially without running GitHub Actions or merging main.

**Goal:** Interactive HTML parity between Local VS Code and Skill/CLI using one shared renderer.
**Architecture:** Node filesystem scanner -> existing SourceAnalyzer -> existing buildLocalDocumentationDocument -> existing offline hardening -> files. Build standalone CJS into Skill package.
**Tech Stack:** TypeScript, Node.js, esbuild, existing DocuMint Local renderer, Python stdlib ZIP packager.
**Spec:** `docs/superpowers/specs/2026-11-15-documint-interactive-skill-design.md`

## Global Constraints
- No MCP server, HTTP listener, VS Code runtime or cloud dependency.
- Stay on isolated feature branch. Do not merge main or run GitHub Actions.
- Don't claim parity in hosts that cannot execute Node.

## Review Focus
- Escaping workspace paths and symlinked files must be refused/skipped.
- Generated `documint/` and secrets excluded by default, even when re-running.
- File count/bytes overflow must fail loudly, never silently omit source.
- Runtime bundle must be included in ZIP and work without npm install at use time.
- Existing Local Mode Markdown and HTML behavior must be preserved.

## Tasks

### Task 1 — Filesystem scanner
**Files:** `src/headless/diskScanner.ts`, `test/headlessDocumentation.test.ts`.
- [ ] RED: scanner filters generated, hidden, tests, symlinks and rejects boundary escapes.
- [ ] GREEN: reuse scannerPolicy language names/exclusions and secure filesystem walk.
- [ ] TEST: bundled unit test.

### Task 2 — Headless rendering
**Files:** `src/headless/documintCli.ts`, `src/headless/cliEntry.ts`, `test/headlessDocumentation.test.ts`.
- [ ] RED: fixtures produce same Markdown/model and interactive HTML sections.
- [ ] GREEN: invoke existing SourceAnalyzer/buildLocalDocumentationDocument.
- [ ] GREEN: apply offline hardening, cache policy and output file paths.
- [ ] TEST: bundled unit tests, CLI smoke run with Node CJS executable.

### Task 3 — Packaging, Skill and install instructions
**Files:** `package.json`, `tools/documint_skill_plugin.py`, `plugins/documint/*`, `README.md`.
- [ ] RED: package must contain compiled runtime and avoid network dependencies at execution.
- [ ] GREEN: esbuild bundle step and ZIP packaging requiring bundle to exist.
- [ ] GREEN: Skill directs executable invocation; fallback honesty for no execution.
- [ ] TEST: Python plugin tests and packaging regression.

### Task 4 — Integration verification
- [ ] TEST: `npm run typecheck` and `npm run test:unit` from full checkout.
- [ ] TEST: `npm run documint:bundle` and actual interactive HTML fixture.
- [ ] TEST: `python3 -m unittest discover -s tests/documint-skill -p 'test_*.py'`.
- [ ] COMMIT feature branch only; collect exact results, no false claims.
