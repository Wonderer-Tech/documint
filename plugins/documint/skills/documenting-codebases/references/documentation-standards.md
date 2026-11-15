# DocuMint documentation standards

These conventions apply to **AI-assisted Markdown fallback** only. When the executable DocuMint Local CLI runs, the actual VS Code Local Mode analyzer and HTML renderer produce the full interactive HTML and deterministic Markdown.

## Project / folder document

- **At a glance — What exists?** State purpose (from README/source evidence), languages/configuration, scope and revision. Counts only when backed by a complete inventory or explicitly labeled sample.
- **Big picture — How is it organized?** Describe modules/subsystems by source paths, their responsibilities and *directly observed* import relationships. Use a Mermaid graph only for verified relationships and label unresolved links separately.
- **Start here — Which files should I read?** Give a short, justified reading order using entry points, exposed APIs, or concrete import references.
- **How to run — What is configured?** Quote script names/commands only when actually found in manifests. Explicitly distinguish configured commands from executed/successful commands.
- **Runtime flow — What might happen?** Describe only visible handlers/functions/call sites. Label paths not proven by execution as static inferences.
- **Project interfaces — What is exposed?** Enumerate explicit exports, routes, CLI flags, settings or schemas only if inspected.
- **Data model — What information is stored?** Include only observed SQL/Prisma/GraphQL/OpenAPI/schema declarations; avoid inferring database state.
- **Security boundaries — Where are the trust points?** Discuss observed authentication checks, env variable *names*, input validation or permissions. Do not declare the system secure from static reading.
- **Failure paths — What errors are visible?** Cite explicit thrown/rejected/error-handled branches. Unknown recovery behavior must be marked unverified.
- **Dependencies and verification — What is known?** Reference source imports, manifest dependencies and declared test commands, never claim tests were run unless they were.
- **Source and coverage — How confident are we?** State inspected path list/range, revision (if available), excluded sources, partial status and key unknowns.

Remove irrelevant sections instead of filling them with boilerplate. Never manufacture evidence to populate a template. Prefer concise, developer-facing prose, a compact table for modules, and citations inline with claims.

## Single-file document

Identify file path/revision, role, imports and exports, key symbols, data flow, explicit exceptions, and source evidence. Differentiate declaration, direct call, and suspected purpose. When surrounding files weren't read, limit cross-file claims to literal imports.

## Quality review

1. Each relationship maps to evidence; no invented import edges, Mermaid nodes, symbols or file counts.
2. Sources and limitations remain visible even for a short output.
3. No secrets or private source are exposed without authorization.
4. No claim of successful build/test or runtime invocation unless observed through a permitted tool.
5. Claim the real DocuMint Local engine ran only when the CLI was executed and its output files were verified.
6. Prefer interactive HTML plus Markdown when execution supports the CLI; otherwise provide honest Markdown-only fallback.
