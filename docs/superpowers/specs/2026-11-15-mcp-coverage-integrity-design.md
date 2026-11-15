# DocuMint MCP — trustworthy scan coverage (2026-11-15)

## Intent
Prevent source-grounded architecture results from being falsely represented as complete when supported public source files were silently skipped because of GitHub tree size limits.

## Constraints
- Work only on `feat/chatgpt-mcp-plugin`; do not create a PR, dispatch Actions, tag or publish.
- Keep read-only public GitHub inputs, immutable revision pinning, and bounded fetch behavior.
- Do not fetch oversized or otherwise excluded paths, reveal source content in errors, or raise resource limits.

## Approaches
1. **Track excluded supported-source sizes (chosen).** Separate source-path eligibility from tree-size eligibility, count oversized/missing-size entries, and mark results partial. Minimal change; no extra GitHub requests.
2. Re-fetch oversized files until a byte cap trips: wastes traffic and conflicts with size safety.
3. Mark every deliberately ignored file as missing: overstates incomplete source coverage for tests and secret-like paths.

## Contract
After selecting non-symlink supported source paths, classify missing/invalid sizes versus entries larger than 128 KiB, and only fetch safe-sized candidates. Add `omittedOversizedSourceFiles` and `omittedUnknownSizeSourceFiles` to `coverage`. `coverage.complete` must be false when either counter is nonzero, even if every fetched candidate succeeded. Excluded generated/test/secret files do not count as eligible source.

## Acceptance
An oversized file makes coverage partial without being fetched; a missing/negative size also makes coverage partial; intentionally excluded paths do not pollute omission counts. Preserve all existing behavior. Do not claim full SDK/ChatGPT runtime readiness without an actual MCP handshake test.
