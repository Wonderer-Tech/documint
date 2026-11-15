# DocuMint Interactive HTML Skill Plugin v0.3.2

**One familiar UI, no DocuMint CLI.** This Skill bundles a complete HTML shell exported from the actual DocuMint VS Code Local HTML CSS, JavaScript and project-map markup. It uses a project JSON object to render an offline HTML artifact in a browser. No MCP server, VPS, API key or Node.js execution is required **by the installed viewer**.

## What the plugin includes

- `skills/documenting-codebases/assets/documint-renderer.html` — reusable original DocuMint Local UI assets, stored in Git and included in the ZIP.
- `skills/documenting-codebases/assets/project-data.schema.json` — required structured source facts.
- `skills/documenting-codebases/scripts/render_embedded.py` — optional Python standard-library JSON-to-HTML assembler. This **does not run the DocuMint analyzer**; a file-editing host may substitute the markers without Python.
- `skills/documenting-codebases/references/embedded-renderer.md` — safe substitution and provenance contract.

The browser interface includes project map, file finder, module architecture, dependency navigation, treemap, zoom/pan and theme controls. The UI comes from the original renderer assets, while facts extracted with an AI tool are **not** the same as deterministic AST analysis unless the original analyzer was separately executed. Indexed filenames are distinct from inspected file bodies.

## ChatGPT trigger and format selection

Type **Use DocuMint**. The Skill then offers **HTML**, **Markdown (.md)** or **Both** as a one-time conversational choice unless the format was already specified. It uses source already available, or requests authorized source files if missing.

| Choice | Downloadable output |
| --- | --- |
| HTML | `documentation.html` — original bundled DocuMint HTML viewer with structured project JSON |
| Markdown | `documentation.md` — source-grounded Markdown |
| Both | `documentation.html` and `documentation.md` from one evidence model |

A **skill-only plugin cannot force clickable ChatGPT checkboxes**. Interactive custom forms require a supported UI extension, typically MCP-backed; this Skill intentionally needs no MCP/server and no Google Drive permissions. File downloads require file-writing tools in the host. The original HTML UI assets are reused, but AI-assisted facts and Markdown are not byte-identical to VS Code Local SourceAnalyzer outputs.

## Ready-to-download HTML is mandatory

**HTML selection must produce a finished \`documentation.html\`, not a generator script.** The installed asset \`skills/documenting-codebases/assets/documint-renderer.html\` is the original full DocuMint viewer and is SHA-pinned as Git blob \`ec66c180f09a0df8ef2eb6f3c8765b185716d8f6\`. The packager rejects truncated/lookalike assets, and the renderer verifies that only project JSON and CSP nonce are substituted.

For a prior generator-only ZIP, using the **installed skill** (not a script inside the input archive):

\`\`\`bash
python3 skills/documenting-codebases/scripts/render_embedded.py \
  --input-zip /path/to/DocuMint_PEVS_Original_Renderer_Package.zip \
  --format both --out-dir ./finished \
  --zip-out ./DocuMint_READY.zip
\`\`\`

This extracts only \`project-data.json\` from that ZIP, never executes archive scripts, and writes \`finished/documentation.html\`, \`finished/documentation.md\` and a ready ZIP containing actual documentation. With no ability to access/materialize the pinned renderer or create files, report generation failure—not success with a generator package. Google Drive, MCP servers and internet connectivity are not required by the renderer.

## Quick start

1. Use ChatGPT/Codex with authorized source access to prepare `project-data.json` per the bundled schema. Make every claim evidence-based; report inspected scope, revision and unknowns.
2. Select HTML/Markdown/Both. For HTML, embed JSON into the bundled original template (base64 payload plus fresh CSP nonce); Markdown is assembled from the same evidence. Where Python is available:

   ```bash
   python3 scripts/render_embedded.py --data project-data.json --format both --out-dir ./documint
   ```

3. Download only the requested file(s). If HTML was selected, open `documentation.html` in Firefox/Chrome offline. No DocuMint executable, server, Node or CDN is needed at viewing time.

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

The *existing* `documint-cli.cjs` remains optional for Codex/local workflows and direct AST-based Local Mode; it is not bundled as a Skill requirement in v0.3.2.

Privacy: [PRIVACY.md](PRIVACY.md) · Terms: [TERMS.md](TERMS.md) · Submission: [SUBMISSION.md](SUBMISSION.md) · Issues: https://github.com/Wonderer-Tech/documint/issues.
