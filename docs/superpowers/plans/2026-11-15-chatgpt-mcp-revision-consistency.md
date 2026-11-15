# Plan — pin DocuMint MCP repository scans (2026-11-15)

**Scope:** Continue the existing feature branch without dispatching CI, opening a PR, deploying or publishing.
**Spec:** `docs/superpowers/specs/2026-11-15-chatgpt-mcp-revision-consistency-design.md`

## Task 1 — failing regression first
- Files: `integrations/chatgpt-plugin/test/repositoryFetch.test.mjs`
- Add mocked Git ref and commit snapshot expectations. Validate that raw requests and optional root files use the immutable SHA, not the mutable default branch.
- RED: local standalone revision-consistency tests initially failed (3/3) against the pre-change fetcher.
- Expected: old fetcher does not call `git/ref/heads/` or expose `commitSha`.

## Task 2 — collector pinning
- File: `integrations/chatgpt-plugin/repositoryFetch.mjs`
- Resolve default branch through the GitHub Git refs API, validate commit SHA, fetch tree and content at that SHA, and expose `commitSha`.
- GREEN: local standalone Node test command `node --test test/*.test.mjs` passed 6/6 on a local copy of the updated collector; no third-party dependencies were used.

## Task 3 — result contract and documentation
- File: `integrations/chatgpt-plugin/server.mjs`
- Include `commitSha` and stable `revisionUrl` in the MCP response scope.
- Files: `integrations/chatgpt-plugin/README.md` and `audit/chatgpt-plugin-roadmap.md`; explain stable source attribution and remaining gates.

## Verification gates before claiming full readiness
1. From a network-enabled checkout: `npm ci --no-audit --no-fund` at root; install plugin dependencies separately.
2. In plugin directory: `npm run check`; review complete output, including original tests.
3. Run MCP Inspector against `/mcp`; test tools/list, all three tools and invalid input refusals.
4. Verify live GitHub results for source metadata and ChatGPT invocation with a controlled HTTPS endpoint.
5. Keep incomplete tests and external registration explicitly marked pending. No workflow dispatch, PR, tag or release.

## Review focus
- Incorrect ref paths for slash-containing branch names.
- SHA validation and tampered metadata.
- Accidental authorization header leakage to raw source host.
- False completeness or mixed-revision output when default branch changes.
