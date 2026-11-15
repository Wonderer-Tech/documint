# DocuMint ChatGPT Plugin — implementation and release gate

**Branch:** `feat/chatgpt-mcp-plugin`  
**Scope:** ChatGPT personal custom MCP plugin preview; public GitHub codebases; read-only  
**Workflow policy:** **Do not dispatch GitHub Actions, open a PR, push a tag, or publish a VSIX while implementing this integration.** The isolated feature branch is intentionally not a release.

## Implemented

- Isolated `integrations/chatgpt-plugin/` package: does not change the existing extension package/lockfile or introduce a VS Code runtime dependency into the plugin server.
- Headless adapter reuses `SourceAnalyzer`, `buildLocalDocumentationModel`, and existing Local Markdown renderers; no parallel/invented parser.
- Public GitHub collector: strict owner/repo input validation; fixed API/raw GitHub hosts; immutable default-branch commit pinning (tree, source files, optional root files); test/build/secret-like filters; bounded file/byte counts, timeouts, no redirects and no code execution.
- Three read-only MCP tools: repository overview, a focused file explanation, and a bounded Local Markdown documentation excerpt.
- MCP Streamable HTTP endpoint at `/mcp`, health check, basic request throttling; no custom UI.
- Local test harness with mocked GitHub responses and direct malformed-input/security checks; container build and ChatGPT connection instructions.
- Root `.vscodeignore` excludes `integrations/**` from the VSIX.

## Must verify locally before connection

From a network-enabled checkout:

1. `npm ci --no-audit --no-fund` (root existing lockfile).
2. `cd integrations/chatgpt-plugin && npm install --no-audit --no-fund`.
3. `npm run check` — must pass both core bundle and adapter tests.
4. `npm start`; inspect `http://127.0.0.1:8787/health`.
5. MCP Inspector: connect `http://127.0.0.1:8787/mcp`; confirm all 3 tools; test a small public repo and malformed URL/private repo rejections.
6. Connect via Secure MCP Tunnel or controlled HTTPS endpoint in ChatGPT. Explicit user action required.
7. Verify ChatGPT's tool results cite source paths, report partial coverage, and do not claim private-repo/local-disk access.

**Not yet verified:** actual MCP SDK runtime handshake, live GitHub fetch, end-to-end ChatGPT invocation and production hosting. Do not mark public plugin ready or claim it is installed until those checks pass.

## Production follow-ups (not part of this preview)

- Commit a plugin-specific dependency lockfile from a network-enabled environment; pin toolchain, repeat container build.
- Production-grade identity/auth for private repositories (OAuth 2.1 and explicit scopes).
- Distributed per-user rate limits, metrics, budget tracking and abuse protections.
- Full-project pagination/incremental analysis for large repos rather than silently sampling; robust revision pinning.
- Persistent HTTPS deployment with availability/monitoring; privacy and security review; public plugin submission steps.
- Optional MCP Apps visualization for architecture and dependency graphs only after the headless tools qualify.

## Follow-up hardening (2026-11-15)

- Pin the public default branch to an immutable Git commit SHA before requesting tree, source files and optional root files. Return commit SHA and revision URL to MCP clients so citations can refer to a stable revision.
- Expand mocked regression coverage for commit pinning, invalid Git refs and slash-containing branch names. A separate local Node.js fixture exercised 6/6 related cases successfully, including private-repo rejection and truncated-tree coverage.
- **Not yet verified:** the full repository-installed test suite, actual MCP SDK handshake, live GitHub fetch and end-to-end ChatGPT connection. Do not call the preview production-ready based on the mocked tests.
