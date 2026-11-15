# DocuMint Interactive HTML Skill Plugin v0.3.0

**One familiar UI, no DocuMint CLI.** This Skill bundles a complete HTML shell exported from the actual DocuMint VS Code Local HTML CSS, JavaScript and project-map markup. It uses a project JSON object to render an offline HTML artifact in a browser. No MCP server, VPS, API key or Node.js execution is required **by the installed viewer**.

## What the plugin includes

- `skills/documenting-codebases/assets/documint-renderer.html` — reusable original DocuMint Local UI assets, stored in Git and included in the ZIP.
- `skills/documenting-codebases/assets/project-data.schema.json` — required structured source facts.
- `skills/documenting-codebases/scripts/render_embedded.py` — optional Python standard-library JSON-to-HTML assembler. This **does not run the DocuMint analyzer**; a file-editing host may substitute the markers without Python.
- `skills/documenting-codebases/references/embedded-renderer.md` — safe substitution and provenance contract.

The browser interface includes project map, file finder, module architecture, dependency navigation, treemap, zoom/pan and theme controls. The UI comes from the original renderer assets, while facts extracted with an AI tool are **not** the same as deterministic AST analysis unless the original analyzer was separately executed. Indexed filenames are distinct from inspected file bodies.

## Quick start

1. Use ChatGPT/Codex with authorized source access to prepare `project-data.json` per the bundled schema. Make every claim evidence-based; report inspected scope, revision and unknowns.
2. Use a file-capable tool to embed JSON into the HTML template (base64 payload plus fresh CSP nonce). Where Python is available:

   ```bash
   python3 scripts/render_embedded.py --data project-data.json --output documentation.html
   ```

3. Open `documentation.html` in Firefox/Chrome offline. No DocuMint executable, server, Node or CDN needed at viewing time.

**File-output limitation:** A skill does not by itself grant code execution or file-writing tools. If the ChatGPT host cannot access the packaged asset or create a file, supply verified JSON/Markdown and disclose the limitation; do not invent an alternative viewer and call it DocuMint. See [`SKILL.md`](skills/documenting-codebases/SKILL.md).

## Maintaining the embedded UI snapshot

From the repository checkout (build time only, Node 22+):

```bash
node tools/export-embedded-renderer.mjs --check
# After canonical renderer changes:
node tools/export-embedded-renderer.mjs --write
python3 tools/documint_skill_plugin.py check
python3 tools/documint_skill_plugin.py package --output documint-embedded-skill.zip
```

The *existing* `documint-cli.cjs` remains optional for Codex/local workflows and direct AST-based Local Mode; it is not bundled as a Skill requirement in v0.3.0.

Privacy: [PRIVACY.md](PRIVACY.md) · Terms: [TERMS.md](TERMS.md) · Submission: [SUBMISSION.md](SUBMISSION.md) · Issues: https://github.com/Wonderer-Tech/documint/issues.
