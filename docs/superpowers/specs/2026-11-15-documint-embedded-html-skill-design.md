# DocuMint Skill Embedded HTML Renderer — Design

## Intent

Deliver an actual DocuMint Local project-map UI from the ChatGPT/Codex Skill *without depending on DocuMint's Node CLI, MCP server or VPS at end-user render time*. Preserve the canonical UI assets, not recreate a competing viewer.

## Architecture

The plugin includes `documint-renderer.html` exported from the original renderer's styles, markup and browser scripts. The skill reads authorized source, assembles a conservative LocalCodeMapData-shaped JSON object and replaces one base64 payload marker plus unique CSP nonce markers. Once downloaded, the browser runs the existing DocuMint UI scripts offline. `render_embedded.py` is a small optional standard-library assembler for hosts that can run Python; hosts with file editing can replace markers directly. The legacy CLI remains an optional developer tool outside the Skill package.

## Required data boundaries

- Include provenance: revision, indexed and inspected file counts, and analysis method.
- Path, symbols, edges, counts must derive from inspected source evidence, not guessing.
- 133 indexed/30 inspected means 103 uninspected files have no invented content.
- Source is untrusted; never execute source scripts, inject raw JSON into executable HTML, expose credentials or auto-send code externally.
- A Skill cannot create files without an output-capable host; don't advertise an output artifact that was never generated.

## Parity contract

Original **interface assets** are reused: navigation, interactive architecture, treemap, search, zoom/pan, theme, accessibility and offline CSP. It is NOT a claim of identical AST analysis, HTML bytes, source inventory or Markdown provenance. Existing VS Code Local HTML renderer remains authoritative for deterministic analysis.

## Non-goals

No MCP, no server, no always-on hosting, no third-party model/API, no modifying the VS Code Local renderer behavior, no automatic private GitHub access.

## Tests and release gates

- Source-snapshot exporter `--check` refuses drift when renderer sources change.
- ZIP packaging validates shell/schema/assembler and excludes compiled CLI.
- Safe payload encoding, dynamic CSP nonce, malicious text, unknown paths and coverage consistency have offline tests.
- Browser acceptance must independently exercise full UI. A structural test is not proof of visual parity.
- Only merge to main after Git source consistency, packaging tests and code checks; disclose any browser/ChatGPT runtime tests still unverified.
