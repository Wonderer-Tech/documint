# Protected MCP Preview Implementation Plan (2026-11-15)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development.

**Goal:** Optional single-operator MCP authorization and robust HTTP boundary errors, without changing the normal local anonymous workflow.
**Spec:** docs/superpowers/specs/2026-11-15-mcp-protected-preview-design.md
**Tech stack:** Node.js >=22.6, node:crypto, node:http, existing StreamableHTTP MCP SDK.

## Global constraints
No remote deployment, Actions, PR, merge, release or token in Git. No custom OAuth or write tools. Docker's wildcard binding must not allow an accidental anonymous preview.

### Task 1: Bearer-token guard
- [x] RED: local Node unit tests for absent token, valid/invalid Bearer, malformed secrets, startup required mode.
- [x] Implement authPolicy.mjs: SHA-256 digest, timingSafeEqual, strict token and header grammar, explicit required configuration.
- [x] GREEN: unit suite passed locally.
- [x] Integrate only on /mcp, leaving minimal /health accessible.

### Task 2: Bounded body status
- [x] RED: local tests for invalid content-type, streamed oversized JSON, malformed JSON, declared oversize.
- [x] Implement bodyPolicy.mjs and map HttpRequestError to 400/413/415 in server.mjs.
- [x] GREEN: local unit tests and real Node HTTP streaming 413 test passed.
- [x] Add HTTP timeouts and max requests per socket.

### Task 3: Docker and SDK acceptance
- [x] Default container to MCP_REQUIRE_ACCESS_TOKEN=1 and bundle both policy modules.
- [x] Add smoke/protectedMcp.test.mjs to spawn the real SDK server in required-token mode and validate HTTP 401/400/413/415.
- [x] Keep existing SDK smoke and live acceptance in explicit anonymous loopback mode.
- [ ] Execute full npm run check and npm run check:live in network-enabled checkout; sandbox SDK not installed.
- [ ] Docker build and local-only container startup, with and without operator token.

## Review focus
Host header check precedes authorization; OAuth not implied by token mode; rate limits apply only to authenticated /mcp calls; request body errors are sanitized; streamed body >32768 returns 413; container opt-out restricted to loopback mapping.
