# DocuMint — Skill-only ChatGPT Plugin

**Serverless, no MCP configuration.** This folder is the complete, portable skill plugin. It packages one skill, `documenting-codebases`, with source-evidence standards and Markdown templates.

## What it does

Using files the user provides or repositories accessible through existing authorized tools, the skill prepares source-grounded architecture maps, reading paths, project Markdown documentation, and file walkthroughs. It declares scanned scope, evidence and uncertainty. It does **not** invoke DocuMint's deterministic VS Code parser, produce that extension's exact HTML, authenticate to GitHub by itself, or add new tools to ChatGPT.

## Install and test

The portable package uses root `plugin.json` and the official `extensions.com.openai` listing metadata; it includes publication policy links and a submission worksheet.

- **ChatGPT plugin submission:** package this directory alone as a ZIP with `plugin.json` at the ZIP root. In the plugin submission portal, choose **Skills only**, upload, review automated checks, and submit for review. Publishing is a separate action; source-code commits alone do not install a plugin for end users.
- **Local ChatGPT desktop / Codex:** use the repository's `.agents/plugins/marketplace.json` after checking out the feature branch; install DocuMint from that local marketplace. Availability depends on your product surface.
- **Manual skill usage:** select `documenting-codebases` with an attached folder/repository source and request a project map or file explanation. If the source is inaccessible, it should state the access limitation instead of inventing results.

See the repository's `tests/documint-skill/SCENARIOS.md` for manual behavior tests. Package integrity can be checked with `python3 tools/documint_skill_plugin.py check` from the repository root. To rebuild the ZIP, use `python3 tools/documint_skill_plugin.py package --output documint-skill-plugin.zip`.

## Scope boundaries

No `mcp.json`, `.mcp.json`, server, hooks, outbound API keys or runtime service are bundled. This plugin is **AI-assisted instruction-driven documentation**, not a replacement for the deterministic VS Code extension's Local Mode. Private code must not be copied to unrelated services without explicit permission.

Privacy policy: [PRIVACY.md](PRIVACY.md) · Terms: [TERMS.md](TERMS.md) · Support: https://github.com/Wonderer-Tech/documint/issues
