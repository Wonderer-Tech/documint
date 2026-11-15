# DocuMint MCP — immutable source revision consistency (2026-11-15)

## Intent
Resume the existing read-only public-GitHub ChatGPT MCP integration without replacing DocuMint's analyzer or affecting the shipped VS Code extension. Ensure that generated documentation represents a single, identifiable source revision, even if a GitHub repository's default branch advances during the scan.

## Constraints
- Preserve the existing public-only, GET-only, size/time-bounded collector.
- Reuse the canonical analyzer and Local Markdown renderers.
- Stay on `feat/chatgpt-mcp-plugin`; do not touch `main`, create a PR, trigger GitHub Actions, tag or release.
- No new runtime dependencies; no access to private repos or local files.

## Approaches
1. **Pin commit SHA via GitHub Git refs API (selected):** resolve default branch once, then fetch tree and raw content by SHA. Adds one bounded API request and makes scan revision stable.
2. Re-fetch branch metadata and compare at scan completion: can detect a race but wastes work and still cannot guarantee atomic reads.
3. Use the GitHub Contents API per file at a supplied ref: larger responses and additional API-budget cost for the same immutable-snapshot goal.

## Design
After verifying `metadata.private === false`, request `/git/ref/heads/<default-branch>`, validate `object.type === "commit"` and a hexadecimal commit SHA, and fetch `/git/trees/<commit-sha>?recursive=1`. Build all `raw.githubusercontent.com` paths from that SHA, including README, Makefile and Dockerfile. Return `commitSha` in the collector output and `revisionUrl` in tool metadata. Continue returning `treeSha` and explicit coverage.

## Acceptance
Mocked tests detect wrong revision paths, invalid ref responses and slash-containing default branches; original private-repo, path exclusion and coverage tests continue passing. Full MCP Inspector/live GitHub/ChatGPT checks remain release gates and are not implied by local unit tests.
