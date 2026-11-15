# DocuMint MCP — automated protocol smoke test design

Date: 2026-11-15
Scope: feature branch preview, no CI workflow, PR, tag, release, or production endpoint.

## Objective
Add a repeatable end-to-end protocol verification gate against the existing read-only MCP server. The test must exercise the real SDK transport and HTTP gateway, not a mocked MCP implementation.

## Approaches
- Selected: spawn existing local Node server with an ephemeral loopback port; connect with the SDK Client using StreamableHTTPClientTransport; exercise tools/list and deliberately invalid repository arguments. No live GitHub dependency.
- Rejected: test only static registration source, which does not validate protocol behavior.
- Rejected: rely on a public live GitHub repository for the basic handshake, which adds an avoidable network dependency and rate limit.

## Contract and security boundaries
The suite must verify that initialization succeeds, exactly three tools exist and are read-only, invalid public-repository inputs are refused without an external fetch, oversized request bodies are rejected, and browser-origin cross-site requests are blocked. It must terminate its child process and avoid publishing the service or using authentication tokens.

## Limitations
Tests require root esbuild bundle plus plugin MCP SDK dependencies. Current runtime cannot install those packages because npm DNS fails. Script syntax alone does not establish that the protocol tests pass. Do not claim the MCP server is connected to ChatGPT.
