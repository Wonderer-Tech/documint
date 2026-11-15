# Live MCP acceptance implementation plan (2026-11-15)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development.

**Goal:** Provide repeatable real GitHub end-to-end MCP acceptance check without destabilizing offline tests.
**Spec:** docs/superpowers/specs/2026-11-15-mcp-live-acceptance-design.md
**Tech stack:** Node.js >=22.6, node:test, existing MCP SDK and DocuMint plugin.

## Constraints
No Actions, PR, main merge, release, deployment or automatic live network traffic in standard npm check.

### Task 1: Offline reply contract RED → GREEN
- [x] Write test/liveAcceptanceAssertions.test.mjs for repository identity, valid commit SHA and revision, deliberate partial coverage, file identity, bounded Markdown and malformed responses.
- [x] RED: 8 tests failed using unimplemented validators.
- [x] Implement smoke/liveAcceptanceAssertions.mjs.
- [x] GREEN: 8/8 tests passed in local Node.js 22.16.0.

### Task 2: Opt-in live MCP runner
- [x] Add smoke/liveRepositoryAcceptance.test.mjs with explicit DOCUMINT_LIVE_ACCEPT=1 guard.
- [x] Start local MCP server with ephemeral loopback port, use real SDK client, call all three tools with max_files=10, validate outputs, print revision evidence and close client/child process.
- [x] Wire package scripts test:live and check:live, leaving normal check isolated.
- [x] Node.js syntax checks passed locally.
- [ ] Real SDK + GitHub test run: blocked in sandbox; requires network-enabled checkout.

### Task 3: Documentation and acceptance gates
- [x] Update README and audit roadmap, describe opt-in invocation and limits.
- [ ] On user's Ubuntu: npm run check:live; inspect TAP failures and commit hashes.
- [ ] Separate production gate: verified HTTPS endpoint, auth/abuse safeguards, explicit ChatGPT plugin connection.

## Review focus
Tool result envelope compatibility, source coverage not falsely complete, SHA changing between separate invocations, process cleanup, GitHub API rate-limit errors, Markdown truncation, and failure without opt-in.
