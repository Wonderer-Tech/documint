# Embedded renderer contract

The asset at `../assets/documint-renderer.html` is exported from the DocuMint repository's canonical renderer sources (`htmlTemplate`, `htmlBaseStyles`, `htmlReaderStyles`, `htmlLocalCodeMap`, `htmlBaseScript`, `htmlReaderNavigation`, `htmlReaderSearch`). It retains the real DocuMint Local project map, search, file cards, dependency diagrams, treemap, zoom/pan, theme and offline CSP.

## Source-to-output contract

1. Construct a conservative `LocalCodeMapData`-shaped JSON conforming to `../assets/project-data.schema.json`. AI-inspected content must carry `provenance.analysisMode=ai-assisted`; tree-indexed filenames are not parsed files. Preserve actual revision/coverage.
2. Encode `json.dumps(data, ensure_ascii=True, separators=(",", ":"))` as UTF-8 base64. Replace the **single** `__DOCUMINT_DATA_BASE64__` marker in the provided shell; never paste JSON directly into executable script text.
3. Generate a fresh high-entropy base64url nonce. Replace **every** `__DOCUMINT_CSP_NONCE__` marker. Keep CSP restrictions and all other HTML untouched.
4. Save as `documentation.html`; test local open and controls. The browser renders data by reading the embedded JSON; it does not need a web server or bundled Node executable.

The optional `scripts/render_embedded.py` helper handles steps 2–4, validates obvious data inconsistency, and prevents raw input markup from being injected. A Python execution tool is convenient but not required if another trusted file-writing tool can safely make these substitutions. With no ability to write artifact files, a skill alone cannot deliver a newly rendered HTML file.

**Parity:** same renderer *UI assets*, not necessarily the same analysis inventory, document prose, timestamp or exact bytes produced by VS Code. The original renderer's source-specific features rely on the completeness and accuracy of structured facts supplied in the JSON.

**Updating the snapshot:** from the DocuMint source root, run `node tools/export-embedded-renderer.mjs --write` and verify `node tools/export-embedded-renderer.mjs --check`. The exporter fails on unknown source changes instead of silently dropping UI components.
