# Implementation Plan — MCP Security and Network Efficiency (2026-11-15)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development.

**Goal:** Improve source integrity, bounded HTTP fetching and public-Host safety on the existing feature branch.

**Spec:** docs/superpowers/specs/2026-11-15-mcp-security-and-efficiency-design.md

**Tech stack:** Node.js >=22.6, ES modules, node:test, existing GitHub public collector, MCP v1 SDK (runtime smoke blocked by network).

## Global constraints
No modification to `main`; do not dispatch Actions, create PR, tag, release or deploy. Preserve public-only read-only GitHub scope and deterministic DocuMint analyzer.

## Task 1: request-byte reservation
- RED: 40 tree entries (120 KiB each), old collector fetched 40 despite 4 MiB budget; expected 34 requests.
- Add `sourceBudget.mjs` and `test/sourceBudget.test.mjs`.
- Call `reserveSourceBytes()` after focus ordering but before raw fetches.
- Keep `omittedByFileLimit` separate from byte-budget omissions.
- GREEN: local Node fixture verified raw request count and complete=false.

## Task 2: Git blob hash integrity
- RED: corrupt raw source with a valid Git tree blob SHA passed into `files`.
- Add `blobIntegrity.mjs` and tests covering known Git object hash and invalid SHA.
- On hash mismatch reject source; verify optional README/Makefile/Dockerfile if Git tree SHA available.
- GREEN: local verified raw SHA fixture passed.

## Task 3: Host allowlist and real MCP smoke contract
- RED: Host policy module did not exist; tests exercise rebinding and malformed allowlist.
- Add `hostPolicy.mjs` and tests. Require allowed Host on every HTTP route.
- Add an actual-server Host rejection test to the pre-existing MCP SDK smoke suite. This SDK test is not marked green until SDK becomes available.

## Task 4: packaging and documentation
- Add all new imports to Docker runtime COPY stage.
- Update README, audit roadmap, deployment/tunnel configuration, explicit verification gates.
- Run Node test suite locally, source syntax checks and repository diff review. Full `npm run check` remains pending where npm dependencies unavailable.

## Review focus
Unexpected actual decoded-byte growth; Git raw content differing from blob identity; invalid Host and alternate Host casing; container runtime missing imported helper; focus path omitted under budget pressure; SDK streaming behavior untested here.
