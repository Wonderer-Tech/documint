# Superpowers execution plan — MCP coverage integrity (2026-11-15)

**Spec:** `docs/superpowers/specs/2026-11-15-mcp-coverage-integrity-design.md`
**Branch:** `feat/chatgpt-mcp-plugin`
**Constraints:** no GitHub Actions, PR, tag, release, `main` modification or production deployment.

## Task 1 — RED (verified locally)
- Add three dependency-free mock-GitHub behavior tests in `integrations/chatgpt-plugin/test/sourceCoverage.test.mjs`.
- Expect a valid small source plus an oversized supported source to force partial coverage.
- Expect invalid/missing supported source-size data to force partial coverage.
- Expect ignored paths to leave omission counters at zero.
- **Observed before implementation:** 3 tests failed (false `complete: true`, missing omission counters).

## Task 2 — GREEN
- In `integrations/chatgpt-plugin/repositoryFetch.mjs`, classify supported source paths before applying size limits.
- Maintain two omission counters, preserve bounded download limits and existing deterministic order.
- Add counters to `coverage` and incorporate into the `complete` predicate.
- **Observed in local harness:** `node --test test/*.test.mjs` passed 9/9 after implementation.

## Task 3 — Docs and deferred integration gate
- Update plugin README and audit roadmap with coverage behavior.
- Do not claim actual SDK connection was tested; no npm network access (`EAI_AGAIN`).
- In a network-enabled checkout, run root installation and plugin `npm run check`, then MCP Inspector and ChatGPT connection checks before public readiness.

## Review focus
- Supported source file size edge cases and overstatement of completeness.
- No fetching secret-like/test/build paths or oversized sources.
- No behavior change to revision pinning, private-repo refusal or safety limits.
