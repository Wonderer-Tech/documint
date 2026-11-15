# DocuMint ChatGPT MCP — Source Integrity and HTTP Boundary Hardening

Date: 2026-11-15. Branch: feat/chatgpt-mcp-plugin.

## Intent
Continue the existing read-only public GitHub MCP preview without claiming a successful SDK handshake while SDK installation is blocked. Reduce unnecessary network traffic, ensure raw GitHub files match tree object identities when available, and protect loopback/tunneled HTTP endpoints against untrusted Host headers.

## Approaches considered
1. Selected: small standalone, dependency-free helper modules for request budgeting, Git blob integrity and Host checking; integrate into existing collector/server, exercise mock fetcher and pure guards with Node's built-in test runner.
2. Alternative: rewrite remote MCP server and GitHub collector, risking regressions and breaking the shipped extension.
3. Alternative: rely solely on a new live external-host integration test, which cannot run without npm/network access and would not exercise offline security branches.

## Contract
- A 4 MiB source budget is reserved using GitHub tree file sizes *before* requests. Keep post-download actual byte validation and mark `omittedByByteLimit` for both planned and actual omissions. Preserve focus-first semantics and accurate `omittedByFileLimit`.
- When a GitHub tree entry supplies a 40/64-hex blob SHA, compute Git's native `blob <length>\\0<bytes>` SHA-1/SHA-256 hash from the fetched text. Skip mismatches (count as failed fetch); apply the same verification to optional root metadata files. Missing SHA is unknown, not verification.
- The HTTP MCP server permits loopback Host names by default, rejects untrusted Hosts (421) before any route including /health, and may opt-in trusted tunnel hostnames via `MCP_ALLOWED_HOSTS`. Never rely on X-Forwarded-Host.
- Container runtime stage includes all newly imported files; no CI dispatch, merge, PR, deployment or plugin installation.

## Qualification boundary
Mocked local fetcher tests and stand-alone helper tests establish only their observed behaviors. Full MCP SDK initialization, tools, Docker build, live GitHub fetch, and ChatGPT connection remain explicit unresolved release gates until actually executed.
