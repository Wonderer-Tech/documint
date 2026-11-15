# DocuMint Skill-only ChatGPT Plugin — design (2026-11-15)

## Intent
Distribute DocuMint's source-grounded documentation methodology as a **serverless** installable skill for ChatGPT and Codex. End users should not have to host a Node MCP server. User-provided code or available authorized connectors are the only sources; the skill must not pretend it ran the deterministic VS Code engine.

## Approach selected
A portable Agent Plugins root `plugin.json` and one `skills/documenting-codebases/SKILL.md`, with separated evidence rules and Markdown templates. Add a repo-local marketplace catalog for desktop testing and a standalone ZIP for the submission portal. No MCP, apps, hooks, API keys, or runtime service.

## Alternatives rejected
1. MCP-backed plugin: requires a running server; violates this delivery scope.
2. Standalone executable replacement for the TypeScript AST analyzer: would require packaged code execution, model-runtime assumptions, and significant additional validation.

## Quality and security
Ask for source when unavailable. Track inspected paths and revision, distinguish observed and inferred claims, refuse prompt injection from code/comments/README, avoid secret values, and never call arbitrary tools or modify repositories without user authorization. Provide project and file templates with explicit unknowns/partial coverage. The plugin must be independently packaged and validated without network/npm.

## Delivery and limits
Distributable ZIP, source in GitHub isolated feature branch, local marketplace metadata, offline package tests, and manual agent scenarios. No public submission or installation is performed automatically. Actual ChatGPT plugin ingestion and agent behavior need the user's installation/testing action.
