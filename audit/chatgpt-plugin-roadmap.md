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

## Follow-up hardening (2026-11-15, partial-coverage safety)

- Corrected a false-completeness condition: supported source paths excluded by the 128 KiB per-file limit or missing/invalid Git-tree sizes now force `coverage.complete = false`.
- Added `omittedOversizedSourceFiles` and `omittedUnknownSizeSourceFiles` counts and three security/coverage regression cases. A local dependency-free Node.js harness verified RED (3/3 failures) before code changes and GREEN (9/9 total local cases passing) after changes.
- MCP SDK installation and handshake remain unverified here: npm registry requests failed with `EAI_AGAIN` (DNS resolution). No deployment, PR, or GitHub Actions were initiated.

## Next milestone (2026-11-15, MCP protocol smoke gate)

- Added `integrations/chatgpt-plugin/smoke/mcpProtocol.test.mjs` to spin up the real server over loopback and connect using the v1 MCP SDK `Client` + `StreamableHTTPClientTransport`.
- The test checks SDK initialization, exact tool registry/read-only annotations, three invalid-repository tool errors, HTTP 413 body-limit rejection and Origin rejection. It intentionally avoids external GitHub traffic.
- Wired `npm run check` to run build + adapter tests + the new `npm run test:mcp` gate.
- **Not verified yet:** the SDK smoke test execution because `@modelcontextprotocol/sdk` cannot be installed in this sandbox (`EAI_AGAIN`). `node --check` of the new test script succeeded; this is only a syntax-level check.

## Source integrity hardening (2026-11-15)

- Count in-scope Git gitlinks (submodules) as `omittedSubmodules`, forcing partial coverage without downloading nested repositories.
- Detect standard Git LFS pointer contents among fetched source blobs; report `omittedLfsPointerFiles` and exclude pointer text from analysis. Plain source comments mentioning Git LFS remain source code.
- Dependency-free local Node regression tests: 3 new tests were red before implementation; four new source-integrity cases and nine preexisting local fixture tests passed after implementation (13/13). This local suite used a faithful collector copy because the whole repository and SDK dependencies are not mounted here.
- Real MCP SDK smoke test still blocks on unavailable SDK installation; `ERR_MODULE_NOT_FOUND` was reproduced. This is not a verified ChatGPT connection or deployable release.


## Large follow-up batch (2026-11-15): integrity, efficiency and Host boundary

- Added dependency-free `sourceBudget.mjs`: pre-reserves 4 MiB total
  source bytes to avoid fetching files that cannot fit. Maintains
  separate byte-budget and file-count omission accounting.
- Added `blobIntegrity.mjs`: compares fetched UTF-8 bytes against
  GitHub tree-provided Git blob SHA-1/SHA-256. A mismatching source blob
  is excluded; optional root documentation is checked the same way.
- Added `hostPolicy.mjs` with strict loopback allowlist and an
  explicit `MCP_ALLOWED_HOSTS` override for known proxy/tunnel Hosts.
  Every route rejects unknown Host with HTTP 421.
- Updated container runtime-stage COPY to include the new modules,
  extended real MCP smoke test for Host rejection, and added five
  dependency-free test files.
- **Observed local verification:** 15 new test cases and 13 existing
  local regression fixtures: 28/28 passed with Node.js v22.16.0.
  This local collector fixture is not an exact runtime check of the remote
  GitHub branch, which is not directly cloneable in this environment.
- **Open gates:** full `npm run check`, MCP SDK handshake, Docker
  build and end-to-end ChatGPT installation not run (npm/GitHub DNS
  unavailable in this sandbox). Do not deploy as public production
  service based only on these results.


## Live GitHub acceptance gate (2026-11-15)

- New `smoke/liveRepositoryAcceptance.test.mjs` invokes real Streamable
  HTTP MCP server, then analyzes, explains and generates Markdown from
  the public `Wonderer-Tech/documint` repository (10 source files max).
- New `smoke/liveAcceptanceAssertions.mjs` checks revision attribution,
  repository identity, true partial coverage, requested file identity and
  bounded Markdown. Eight dependency-free contract tests were RED before
  implementation and GREEN afterwards in the local Node.js 22 harness.
- Added `npm run test:live` with `DOCUMINT_LIVE_ACCEPT=1` requirement,
  and `npm run check:live` to run both offline and real live checks.
- Independent GitHub connector reads found public default branch `main`,
  commit `3233ea1a18585df4ed9f0d3524a722a6c605c3ea`,
  241 tree entries and 103 size-eligible source files; raw
  `src/analyzer/sourceAnalyzer.ts` content matched the file API result
  for that pinned commit. These are **GitHub API checks**, not a successful
  live MCP tool invocation.
- The sandbox lacks npm SDK installation/network DNS, so full
  `npm run check:live` has **not** been executed here. User's prior
  Ubuntu run confirmed 29 offline tests and 3 MCP smoke tests passed
  before this change. No public deployment, ChatGPT connection or release.
