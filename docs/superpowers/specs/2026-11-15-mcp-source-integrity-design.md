# Source integrity design — submodules and Git LFS (2026-11-15)

## Goal
Keep DocuMint's public GitHub analysis source-grounded. When repository entries cannot be analyzed as real source content, do not report full scan coverage.

## Scope and guardrails
Read-only public GitHub repository collector; existing immutable commit SHA, file size and byte budgets remain unchanged. Do not recursively request Git submodules or download LFS objects. Do not change the VS Code extension, run Actions, merge, tag, release or connect ChatGPT without the user's UI action.

## Approaches
- **Selected:** Treat in-scope GitHub tree gitlinks as missing source; recognize standard Git LFS text pointers after bounded fetch and exclude them. Adds no external dependencies or extra GitHub API requests.
- Recurse through submodule and Git LFS hosting: introduces cross-repository trust and storage/network budget issues.
- Ignore these entries and claim complete scan: misleading and rejected.

## Contract
`fetchPublicRepository` returns `coverage.omittedSubmodules` and `coverage.omittedLfsPointerFiles`, both integers. In-scope `type: "commit", mode: "160000"` gitlinks increase the first count, but intentionally excluded `tests/`, `.github/`, etc. do not. Git LFS pointer text matching canonical v1 pointer syntax increases the latter count and is never included in `files`. Any non-zero omission counter makes `coverage.complete` false. Ordinary source code that merely mentions Git LFS is not excluded.

## Release gate
The mocked collector behavior is testable without npm registry. Actual MCP SDK handshake, GitHub live fetch and ChatGPT connection still require separate verification.
