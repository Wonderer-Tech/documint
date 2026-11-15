# DocuMint embedded renderer acceptance scenarios

These scenarios are acceptance criteria, not a claim of completed ChatGPT runtime tests.

1. **Original UI assets:** `node tools/export-embedded-renderer.mjs --check` verifies committed HTML snapshot against the canonical DocuMint Local renderer sources. Browser opens offline with project map, search, module relations, zoom/pan, treemap, file cards and theme.
2. **AI source coverage:** For 133 indexed but 30 source-read files, visible banner says `30 files inspected / 133 files indexed`; missing source is not assigned invented symbols or LOC.
3. **No CLI:** Build ZIP from a fresh Git checkout with no `dist/documint-cli.cjs`; ZIP includes HTML shell, schema and optional Python assembler. Browser needs no Node runtime.
4. **Unicode and injection:** Insert `</script><script>alert(1)</script>` and Unicode in a file description. Output contains only encoded data, never executable injected markup. CSP blocks remote requests.
5. **Data validity:** Reject unknown file relationships, malformed paths, missing provenance and inconsistent inventory counts. No fabricated full-analysis claim.
6. **Full source available:** When every file is accessible, encode evidence-backed files and relations. Viewer renders all indexed files using the original UI assets.
7. **No source available:** Inaccessible private repository → request authorized source rather than inventing file claims.
8. **No file output:** ChatGPT host lacking template access/file writing → transparent limitation and JSON/Markdown fallback; no independently redesigned HTML with misleading branding.
9. **Output integrity:** HTML still contains `data-documint-local-code-map`; nonce and base64 markers are completely replaced; file loads offline without CDN.
10. **Visual parity:** Browser compare with VS Code Local Mode on equal data; differentiate source-analysis/inventory mismatches from UI mismatches. Actual visual browser proof must be recorded separately.
