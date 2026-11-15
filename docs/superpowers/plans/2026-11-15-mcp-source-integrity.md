# Source integrity implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans with test-driven-development and verification-before-completion.

**Goal:** Avoid false complete-coverage reports when repositories use Git submodules or LFS pointers.

**Architecture:** Extend existing GitHub tree classifications and bounded source response processing; preserve security constraints and DocuMint analyzer integration.

**Tech Stack:** Node.js 22, ESM, node:test, existing GitHub adapter.

**Spec:** docs/superpowers/specs/2026-11-15-mcp-source-integrity-design.md

## Global Constraints
- Public GitHub only; source read-only; pinned revision; existing byte/file limits.
- No new dependencies, new network hosts, GitHub Actions, PR, merge, tag, or release.

## Review Focus
- Gitlinks under excluded folders must not reduce completeness.
- Git LFS pointers must never be analyzed as source.
- Ordinary source comments must not be misclassified as pointers.
- Only successful source downloads enter byte accounting.

### Task 1: Gitlink omission awareness
**Files:** Modify `integrations/chatgpt-plugin/repositoryFetch.mjs`; create `integrations/chatgpt-plugin/test/sourceIntegrity.test.mjs`.

- [x] RED: assert submodules are counted and coverage is partial; missing `omittedSubmodules` caused failure.
- [x] Implement a Git tree gitlink count honoring the existing excluded directory set.
- [x] GREEN: validate in-scope and intentionally excluded gitlinks.

### Task 2: LFS pointer detection
**Files:** Same collector and test suite.

- [x] RED: pointer text was included as analyzed source and lacked a count.
- [x] Recognize a complete canonical Git LFS v1 text pointer; discard pointer content from selected analysis files.
- [x] GREEN: verify pointer count, partial coverage, and source-comment false-positive guard.
- [x] Run collector tests: local dependency-free suite reports 13/13 pass.

### Remaining verification
- [ ] Install plugin dependencies (npm registry DNS currently inaccessible).
- [ ] Run full `npm run check` including SDK Streamable HTTP smoke test.
- [ ] Verify MCP Inspector and live repository with controlled HTTPS endpoint.
- [ ] Keep feature branch unmerged and unpublished until end-to-end qualification.
