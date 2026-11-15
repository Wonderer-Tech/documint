# Live DocuMint MCP acceptance — design (2026-11-15)

## Goal
Qualify the actual read-only MCP server against live public GitHub content, beyond the 29 offline repository-fetch tests and three SDK smoke tests already completed by the user.

## Approaches
- **Selected:** opt-in local test runner using real MCP SDK Client and StreamableHTTPClientTransport; call all 3 tools against a bounded public DocuMint repository scan.
- Alternative: always run live fetch in npm check, rejected due rate limits, network flakiness and CI coupling.
- Alternative: validate only GitHub API metadata without MCP invocations, insufficient for end-to-end qualification.

## Functional contract
Analyze Wonderer-Tech/documint with max_files=10, explain src/analyzer/sourceAnalyzer.ts with the same limit, generate source-based Markdown with max_chars=5000. Every tool result must identify the public repository, branch, SHA and pinned GitHub revision URL; disclose omitted files and partial coverage; return meaningful analysis or Markdown; and never write to GitHub. Each call may reference a different valid SHA if main advances between requests.

## Execution safety
Public GET-only Github fetches, ephemeral loopback MCP server, process cleanup. No main modification, PR, GitHub Actions, release, tunnel or public deployment. Require explicit opt-in for network calls. Do not consider tests passed until run in a network-enabled checkout.

## Observed environment
GitHub connector live metadata independently confirmed public repository, 103 size-eligible source files, and a pinned raw source file matching file API output. Sandbox Node.js has no installed SDK package or public network access; end-to-end acceptance remains pending.
