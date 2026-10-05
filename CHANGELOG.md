# Changelog

All notable changes to DocuMint are documented here.

## 1.0.10 — First-activation review prompt fix

1.0.10 republishes the 1.0.9 build with the finalized review/feedback cadence. v1.0.9 had already been released before this behavior change landed.

### Fixed

- Show the review prompt once on first DocuMint activation after install instead of waiting for three successful generations.
- Keep postponed prompts limited to once every seven days.
- Preserve legacy review-prompt state and explicit opt-out/completion state.
- Prevent duplicate prompts when activation and generation events occur close together.
- Keep Marketplace review and GitHub improvement feedback as separate explicit actions.

## 1.0.9 — Marketplace hotfix

1.0.9 republishes the 1.0.8 feature set with the final browser-navigation acceptance fix and the revised first-activation review prompt. The Marketplace had already received 1.0.8 before those final changes landed, so 1.0.9 is the corrected Marketplace build.

### Fixed

- Replaced a timing-sensitive Local Project Map hash-navigation browser assertion with a state-based wait so release validation is stable in CI as well as locally.
- Review/feedback prompting now appears once on the first DocuMint activation after install instead of waiting for three successful generations; postponed prompts remain limited to once every seven days.
- Kept the 1.0.8 Local Project Map, source-analysis, UI, review/feedback, privacy, and release-hardening feature set unchanged.

## 1.0.8 — Local Project Map & source-grounded insights

DocuMint 1.0.8 turns Local Documentation into a much more useful codebase-reading experience. The generated HTML now answers practical developer questions directly, while keeping Local mode deterministic, provider-independent, and source-grounded.

### 1.0.8 Highlights

- **Question-first Local Project Map** with At a glance, Big picture, Runtime flow, How to run, Project interfaces, Data model, Security boundaries, Failure paths, What's inside, Start here, Dependency reach, Verification, and file lookup.
- **Big Picture architecture map** with Major/All link modes, zoom, pan, semantic zoom, clearer module routing, relationship counts, and suggested start files.
- **Stronger TypeScript/JavaScript analysis** using the TypeScript compiler AST for more reliable imports, declarations, exports, methods, module scope, and environment references.
- **Source-grounded Data model, Security boundaries, and Failure paths** that appear only when direct evidence exists.
- **Better onboarding** through runtime flow, project interfaces, build/run facts, verification commands, treemap sizing, dependency reach, and suggested reading order.
- **Refined generated UI** with the paper-grid visual system, restrained Jelly softness, improved dark/light presentation, and reduced-motion-aware transitions.
- **Ollama and LM Studio presets** with local model discovery, no API key requirement, and hardened loopback network behavior.
- **Review & feedback prompt** after meaningful use, with direct Marketplace review, GitHub improvement feedback, seven-day cooldown, and opt-out.
- **Release hardening** through lockfile-only installs, browser acceptance, Local self-audit, CSP/network protections, and one-command release readiness.

### Changed

- Added `npm run lockfile:bootstrap` as a GitHub CLI dispatcher for the manual Lockfile Bootstrap workflow on the current branch, with explicit repo/ref overrides and authenticated-`gh` preflight.

- Lockfile artifact adoption now verifies Bootstrap `package-lock.sha256` metadata when present and refuses checksum- or package-identity-mismatched artifacts without replacing the existing root lockfile.

- Added `npm run lockfile:adopt -- <artifact-or-package-lock>`, backed by the same shared lockfile policy as validation, so Bootstrap artifacts are validated before replacing the root lockfile and the adopted SHA-256 is rechecked.
- Lockfile validation policy now lives in one shared module consumed by both `lockfile:validate` and artifact adoption; the validator also accepts an explicit lockfile file/directory path.

- Added a manual-only **Lockfile Bootstrap** workflow that generates `package-lock.json` on a network-enabled runner, validates clean locked installation/dependency resolution, records SHA-256 metadata, and uploads the lockfile as an artifact without repository write permission. Its default `run_readiness=true` input also runs full verify/browser/VSIX readiness against the transient lockfile so release behavior can be tested before committing it.
- Added `npm run lockfile:validate` so readiness/bootstrap reject lockfiles whose root name/version or dependency maps drift from `package.json`.
- CI now treats the committed `package-lock.json` as mandatory and installs only with `npm ci --no-audit --no-fund`; the temporary no-lockfile `npm install` fallback has been removed.

- Added a manual-only **Release Readiness** workflow that runs the same strict local readiness gate and uploads evidence/VSIX artifacts without enabling normal main-push CI.
- Browser acceptance scripts now use a cross-platform Python 3 launcher (`python3`, `python`, or Windows `py -3`) with an optional `DOCUMINT_PYTHON` override.
- Release readiness now preflights the actual Python Playwright/Chromium runtime before spending time on verification/package phases.

- Added a one-command `npm run release:readiness` gate that requires the lockfile, reuses normal verification and full browser acceptance, packages with the installed local VSCE binary, validates the VSIX archive, and emits machine-readable timing/size/hash/self-audit/browser evidence.
- Release packaging now excludes `tools/**`, `audit/**`, and `release-artifacts/**` so readiness evidence and audit/reference material cannot inflate or recursively contaminate the VSIX.
- Tag releases now reuse the same release-readiness command and upload its evidence alongside browser artifacts before publishing the VSIX.

- Reworked Local Documentation around a canonical source-factual project model shared by Markdown and HTML.
- Added AST-backed TypeScript/JavaScript-family analysis using the TypeScript compiler API, including multiline imports/declarations, `export abstract class`, class methods, explicit export lists, and module-vs-function symbol scope.
- Removed function-local temporary variables from the default JS/TS module symbol inventory while preserving top-level internal declarations.
- Added trusted description provenance from explicit file/module JSDoc, documented single exports, Python module docstrings, Rust module documentation, Go package comments, and exact README path descriptions.
- Added second-level structural module grouping such as `src/providers`, `src/services`, and `src/scanner` instead of collapsing the project into a single `src` bucket.
- Added deterministic **Where is what**, **How to run**, **Suggested reading path**, **Core files**, **Undocumented files**, and conservative **Referenced environment variables** sections to Local project documentation.
- Extended **How to run** with concrete Makefile targets and Dockerfile source facts (`FROM`, stages, exposed ports, `ENTRYPOINT`, and `CMD`) without inventing Docker commands.
- Made per-file Local documentation compact: empty fact sections are omitted, Uses / Used by are concise, description provenance is visible, and source/API entries use portable relative links.
- Split Local Markdown and HTML architecture surfaces. Markdown no longer carries raw architecture, whiteboard, dependency-graph JSON, file-level Mermaid, or D2 payload duplication.
- Added the question-first Local HTML project map: canonical At-a-glance project summary, module overview, file-size treemap, suggested reading path, dependency-reach scatter, file/evidence search, connected file cards, source links, and an accessible in-map section navigator with current-section state plus valid-hash deep-link restoration.
- Reworked the Local HTML visual layer to use the redesign prototype as the source of truth: paper/grid surfaces, Atkinson/JetBrains/Kalam-compatible typography stacks, prototype light/dark palettes, flat reader chrome, module-specific tints, sketch-style module legend, compact cards, vertical reading path, full-width file lookup card, and bounded inverse tooltips. AI-format HTML keeps the existing Jelly UI shell.
- Big Picture now uses smaller module cards, reduced-crossing cubic routing, a dense-graph Major/All links switch, factual insight chips outside the canvas, and interactive Fit / +/- / wheel zoom plus drag-to-pan navigation so large dependency maps remain inspectable without turning into an arrow wall.
- Big Picture now uses semantic zoom: Fit/overview shows module names only, medium zoom reveals file/line metadata, deep zoom reveals suggested-start files, and disconnected modules are visually grouped in a muted lane. Project-overview reader chrome also removes duplicate project-name text and labels the root option simply as Overview.
- Local report module/file cards now wrap long labels inside their visual bounds, and reader location / Show in tree / section-jump controls live inside the fixed header instead of floating above content. The generated HTML title is mode-neutral and no longer adds a visible “Local Documentation” banner.
- Added conditional source-grounded Local HTML **Runtime flow**, **Project interfaces**, and **Verification** sections. Runtime flow follows resolved imports outward from detected entry points without claiming call order; Project interfaces aggregates detected VS Code commands/settings, host/package entry metadata, environment references, Docker-exposed ports, and entry-point exports; Verification groups only declared package scripts and Makefile targets that look like existing checks/build gates.
- Added conditional **Data model** documentation to Local HTML and Markdown. Direct Prisma models/enums, SQL tables, GraphQL types/inputs/interfaces/enums, OpenAPI schemas, Mongoose models/schemas, and Drizzle tables are surfaced only when declarations are detected; Prisma and GraphQL schema files are now scanned by default.
- Added conditional **Security boundaries** documentation to Local HTML and Markdown. It reports only direct evidence for secret-storage APIs, credential-like environment-variable names, explicit security policy/header names, and imported authentication libraries; it never includes environment values and explicitly does not present itself as a security audit.
- Added conditional **Failure paths** documentation to Local HTML and Markdown. It surfaces static literal throw/error-report messages with source locations and separately lists declared recovery-related symbol names (retry/recovery/fallback/backoff/resume) without claiming exhaustive runtime control flow or inferring behavior from a name.
- Softened Local HTML with restrained Jelly-style surfaces: translucent/gradient cards, softer edges and radii, subtle depth, and a blur/saturation treatment on the shell/navigation while preserving the paper-grid visual language and avoiding per-element heavy blur.
- Added a soft-transition motion layer across Local Jelly controls, cards, file tiles, Big Picture states, reader-header controls, active-section underlines, search focus, and tooltips using bounded 140–360ms easing. Motion respects `prefers-reduced-motion`, and no blanket `transition: all` is used.
- Added a native VS Code review/feedback prompt cadence: the first prompt is eligible after three successful generations, then no more than once every seven days (including on later activation when due). **Review on Marketplace** opens the Marketplace review section directly with no intermediate DocuMint page; **Tell us what to improve** opens a prefilled GitHub feedback issue directly. Review, feedback, and opt-out actions stop future prompts, and no feedback is sent automatically.
- Added one question-first Local HTML **How to run** surface backed by the canonical model: package scripts/manager, extension entry, VS Code commands/settings, Makefile targets, Dockerfile facts, and referenced environment variables. The HTML overview no longer duplicates those onboarding headings; Markdown keeps its standalone onboarding sections.
- Local HTML file cards now retain canonical internal symbols plus TODO/FIXME/HACK source-note evidence instead of dropping those analyzer facts after model construction.
- Local file lookup now uses deterministic token-aware search across paths, trusted descriptions, exported/internal symbols, environment references, and TODO/FIXME/HACK source-note text. Multi-word queries may match one factual field or multiple file facts, results label why they matched, and ranked results keep a compact top nine with an explicit Show all path to every remaining match.
- Big Picture module nodes now retain trusted description provenance and canonical suggested start files from the shared model instead of dropping those facts at the HTML data boundary.
- Uses / Used by cards keep the first 12 relations compact while placing every remaining project relation in an expandable, navigable list instead of replacing them with an inaccessible count.
- Browser acceptance now encodes the roadmap's 30-second newcomer discovery checks for API-key storage, provider integration, and build/test commands using the actual Local project-map search/onboarding UI.
- Local HTML now owns project orientation through **At a glance** (totals, description coverage, languages, entry points, external dependencies) and suppresses duplicate legacy Project Facts, Language Summary, Module Summary, Entry Points, External Dependencies, and Source Tree sections. Documentation coverage is actionable there: undocumented files open their file cards, large lists expand without losing access. **Big picture** now exclusively owns Local HTML architecture, so the duplicate Architecture & Dependencies / Module Relationships table is suppressed in HTML; the retired architecture `summary` renderer path was removed. Markdown keeps the standalone project, coverage, and deterministic architecture sections for direct text use.
- Added entry-point-driven layered layout, module hover/focus isolation, factual handwritten-style module notes, and cross-view navigation in the Local project map.
- Local `Ctrl/Cmd+K` now focuses project-file search while `/` continues to search documentation headings.
- Local HTML is generated with external assets disabled; the Local project-map experience does not require CDN scripts/styles.
- Bumped Local cache compatibility to v29 so conditional Failure paths regenerate once for unchanged Local reports.
- Retired the old source-repair and VSIX self-commit workflows; CI/release automation no longer rewrites application source or force-adds a VSIX through those workflows.
- Removed obsolete VS Code activation-event declarations and the deprecated `@types/marked` stub dependency.
- Split the generated HTML shell into dedicated base-style, runtime-script, and policy modules; `htmlTemplate.ts` is now a small composition shell.
- Split the sidebar webview into host/state, HTML template, styles, and client-runtime modules while preserving the nonce CSP boundary.
- Added weekly Dependabot updates for npm and GitHub Actions.
- Made Local Documentation the default generation mode for new/unconfigured installs while retaining AI fallback for malformed/legacy programmatic mode values.
- Lowered the default AI file-generation concurrency from 15 to 5 while preserving the configurable maximum of 15.
- Published the canonical `documint.*` settings namespace. Existing explicit `aiDocGenerator.*` values remain supported as deprecated aliases, with explicit new-namespace values taking precedence.
- Added explicit Ollama and LM Studio AI-provider presets using fixed loopback OpenAI-compatible endpoints, no API key, no cloud-source-transfer consent, and an explicit local-model requirement.
- Added local `/v1/models` discovery for Ollama and LM Studio, with sidebar suggestions, non-blocking manual fallback, and deterministic auto-selection when exactly one model is reported.
- Local provider selection now clears inherited cloud-default model IDs so switching from OpenAI/Anthropic/OpenRouter/DeepSeek cannot silently send an invalid cloud model name to a local runtime.
- Moved future VSIX packaging to a tag-based GitHub Release workflow and removed committed VSIX binaries from the current source tree. Historical blobs remain in existing Git history.

### Fixed

- Fixed multiline TypeScript/JavaScript imports that previously disappeared from dependency graphs.
- Fixed exported abstract classes and multiline declarations that regex analysis could miss, including DocuMint's `BaseAIProvider`.
- Added AST coverage for named export aliases, namespace re-exports, and top-level destructured bindings while keeping wildcard re-exports source-factual instead of inventing symbol names.
- Fixed JS/TS symbol noise caused by function-local variables being reported as project symbols.
- Added static environment-reference detection that ignores JS/TS comments/strings and uses a comment/string-aware Python scanner.
- Repaired stale Local regression fixtures discovered while migrating to the canonical model.

### Security

- Added a per-render nonce Content Security Policy to the VS Code sidebar webview.
- Neutralized raw HTML and unsafe rendered Markdown URLs before generated HTML is assembled in both Local and AI modes. `javascript:`, active `data:` URLs, protocol-relative URLs, remote Markdown images, and unsafe image data types are blocked while normal web/source links and raster data images remain supported.
- Blocked HTTP redirects for Ollama, LM Studio, and custom OpenAI-compatible provider requests so a loopback/no-consent endpoint cannot redirect source-bearing requests to another host.
- Local model discovery also blocks redirects, bypasses environment HTTP proxies, and caps the model-list response size. Source-bearing Ollama/LM Studio requests bypass proxies as well; local custom endpoints disable proxy routing while remote custom endpoints retain normal proxy behavior.
- Local generated HTML no longer needs third-party CDN assets for the Local project-map experience.

## 1.0.7 — Reader navigation

Folder-first navigation now has persistent, report-scoped open/closed state, Expand all / Collapse all, file counts, clearable filtering, keyboard navigation, current-file context and a section selector. Ranked search supports Ctrl/Cmd+K, arrow selection, Enter and Escape; all results point to real document headings. Mobile uses the same folder tree in a focus-managed drawer. Wide tables scroll within the report; charts and documentation facts remain unchanged. Local cache v5 refreshes older generated HTML once.

## 1.0.6 — Generated navigation repair

Local and AI-format HTML now share working folder-wise collapsible navigation. Local TOCs emit the canonical link classes and explicit file identity, including route-group and spaced filenames. The chart function/map collision is fixed; optional chart failures cannot block navigation or search. Module chart totals include every emitted module. Local cache v4 regenerates older HTML once. Browser acceptance covers collapse, filtering, anchors, themes, charts, offline rendering and failure isolation.

## 1.0.5 — 2026-09-18

### Changed

- Generated all DocuMint-owned output under a dedicated root-level `documint/` folder instead of the project's `docs/` directory; AI/Local output, cache manifests, cache-compatibility markers, and visual caches now stay together while legacy `docs/` content is left untouched.

- Hardened provider runtime behavior so OpenAI-compatible providers normalize cancellation, timeout, authentication, rate-limit, and HTTP failure handling consistently.
- Improved exhausted-retry reporting for transient provider failures so HTTP 408/425 responses and transport timeout codes retain accurate timeout/retry context.
- Normalized gateway-style HTTP status shapes, including `statusCode` and numeric-string statuses, so custom/OpenAI-compatible provider failures retain correct retry and user-facing error handling.
- Read `Retry-After` and `Retry-After-Ms` case-insensitively from plain provider response-header objects so retry timing is preserved across compatible HTTP clients/gateways.
- Honored explicit zero-delay `Retry-After` responses instead of replacing them with exponential backoff, allowing providers to request an immediate bounded retry.
- Added a canonical AI/Local generation-mode foundation with AI preserved as the compatibility default; the sidebar suppresses provider/authentication controls in Local mode and the host routes Local runs through a dedicated deterministic generator before any provider/model selection or cloud-consent flow.
- Connected Local Documentation end to end: scan source, analyze symbols/imports/dependencies, assemble deterministic project/architecture/file sections, render Markdown/HTML, sanitize outputs, report progress/cancellation, and write normal DocuMint documentation files without creating an AI provider.
- Kept Local File, Folder, and Workspace generation on the same scanner semantics as AI mode; selected files/folders are passed as exact target paths to scanner discovery instead of scanning the whole workspace and filtering later.
- Added a separate Local Documentation cache fingerprinted by selected source path/language/content plus a Local renderer policy version; cache reuse additionally verifies hashes of the sanitized Markdown/HTML outputs so deleted or manually edited output files regenerate safely.
- Integrated Local cache cleanup into the existing Clear Cache command while keeping Local cache identity fully separate from AI prompt/provider/model cache state.
- Polished Local sidebar UX so provider/model/authentication and AI-only Documentation Depth controls disappear in Local mode, the primary action reads `Generate Local Documentation`, and VS Code settings/marketplace metadata clearly distinguish Local/shared controls from AI-only settings.
- Added a deterministic per-file Local Documentation renderer that produces Markdown from source-analysis facts only, including exported APIs, other detected symbols, imports, internal dependencies, known dependents, line counts, and TODO/FIXME/HACK evidence without provider or prompt inference.
- Added a deterministic Local project-overview renderer with project totals, language and top-level module summaries, detected entry points, external dependencies, structurally connected files, and a stable source tree derived only from scanner/analyzer evidence.
- Fixed Local HTML table-of-contents slugs so escaped heading entities such as `&amp;` decode before anchor generation; headings like `Architecture & Dependencies` now link to `#architecture-dependencies` instead of an `-amp-` artifact.
- Added deterministic Local architecture output with cross-module relationship counts, complete internal file dependency edges, Mermaid module/file graphs, and D2 module source generated from resolved imports without assigning inferred architecture roles.
- Rejected AI generation when the selected context window leaves no positive code-token budget for source text, preventing non-advancing chunk loops; direct chunk splitting now independently rejects zero, negative, or non-finite budgets.
- Kept raw-prompt, normal, and chunked response budgets inside the remaining model context instead of forcing a 1,024-token minimum; prompts with no response room now fail clearly before an API call.
- Replaced future request-slot reservation with a serialized actual-start scheduler so cancelling a request while it waits for rate-limit spacing no longer leaves a phantom delay for later requests.
- Normalized AI documentation depth once at the command boundary so blank, mixed-case, or unsupported programmatic values resolve to the configured supported depth (then `standard`) and the exact same value drives both cache identity and runtime generation.
- Made sidebar API-key status provider-aware: keyless custom OpenAI-compatible endpoints now show a neutral `API Key optional` state, while provider switches immediately refresh the selected provider's Secret Storage state instead of carrying stale auth status.
- Centralized provider/model defaults to reduce stale cross-provider model behavior.
- Treated whitespace-only per-run provider overrides as absent so the configured provider is preserved instead of unexpectedly falling back to OpenAI.
- Kept custom OpenAI-compatible API keys optional across both file generation and project-summary/raw-prompt generation paths.
- Allowed custom OpenAI-compatible endpoints to use short provider-defined bearer tokens while retaining the existing length sanity check for built-in cloud providers and still rejecting empty, whitespace-containing, placeholder, or punctuation-only credentials.
- Required HTTPS for remote custom OpenAI-compatible endpoints while keeping plain HTTP available for localhost/loopback development servers; IPv6 loopback detection now correctly recognizes `[::1]`.
- Rejected custom endpoint URLs that embed credentials or URL fragments, while preserving legitimate query strings such as provider API-version parameters.
- Applied the canonical custom-endpoint policy at the public generation-command boundary so sidebar, command-palette, and programmatic runs share the same validation before generation starts; local `127.x`, IPv6 loopback, and `*.localhost` endpoints no longer inherit external-provider consent behavior.
- Resolved custom-provider locality from the current endpoint setting instead of construction-time state so switching between local and remote custom endpoints keeps consent/request pacing behavior accurate.
- Trimmed leading/trailing paste whitespace before API keys are persisted so a locally valid key is not later sent with invisible whitespace.
- Normalized provider names before building Secret Storage keys so store/get/delete operations cannot drift by casing or surrounding whitespace.
- Centralized OpenAI context/output limits in one capability table used by both provider budgeting and shared model metadata, including current GPT-4.1, GPT-5, GPT-5.4, and GPT-5.6 families.
- Added canonical GPT-5.6 Sol/Terra/Luna capability support (1.05M context, 128K max output) for both direct OpenAI and OpenRouter-routed generation without changing DocuMint's default OpenAI model.
- Added canonical `o4-mini` capability support (200K context, 100K max output) for direct OpenAI, shared model metadata, OpenRouter-routed generation, and routed variants without conflating the separate `o4-mini-deep-research` model family.
- Replaced already-shut-down OpenAI model selections (including retired GPT-3.5 Turbo snapshots, GPT-4 0314/32K/vision snapshots, GPT-4 Turbo Preview aliases, and GPT-4.5 Preview) with the current OpenAI fallback before requests are sent, while preserving OpenAI IDs whose published shutdown date has not yet passed.
- Generalized cross-provider guarding for OpenAI `o`-series reasoning models so `o4-*` and future `o<digit>-*` IDs cannot be sent unchanged to Anthropic or treated as bare OpenRouter model IDs; correctly routed IDs such as `openai/o4-mini` remain supported.
- Reused the canonical OpenAI capability table for OpenRouter-routed OpenAI models so routed GPT/o-series context and max-output budgeting no longer diverge from direct OpenAI behavior.
- Normalized OpenRouter routing variants such as `:free`, `:online`, `:nitro`, and `:floor` before capability lookup so variant-tagged models retain their base model's context and output limits.
- Prevented estimated model metadata from shrinking a provider's own known context window; provider API metadata remains authoritative when available, while unresolved routed OpenRouter metadata can no longer collapse a large-model budget to the conservative 8K estimate.
- Centralized DeepSeek capability metadata so direct DeepSeek and OpenRouter-routed DeepSeek models share the current 1M context and 384K max-output limits; current `deepseek-flash`/`deepseek-v4-pro` IDs are distinguished from retained V4 Flash compatibility aliases.
- Replaced retired `deepseek-chat` and `deepseek-reasoner` selections with the current DeepSeek fallback model before requests are sent.
- Replaced retired Anthropic model selections (including both retired Claude 3.5 Sonnet IDs, Claude 2/3, Sonnet 3.7, Sonnet 4, Opus 4, and Opus 4.1 IDs) with the current Anthropic fallback before requests are sent, while preserving active Claude 4.5+ and Claude 5 model choices.
- Centralized verified Anthropic context/output limits in one capability table used by direct Anthropic generation, shared model metadata, and OpenRouter-routed Claude models, including current Claude 5, Claude 4.6-4.8, and Haiku 4.5 families.
- Preserved token-usage reporting across OpenAI-compatible providers that expose split `prompt_tokens`/`completion_tokens` or `input_tokens`/`output_tokens` fields instead of `total_tokens`.
- Accepted legacy `choices[0].text` output from OpenAI-compatible completion gateways while keeping chat-message content authoritative when both are present.
- Included Anthropic prompt-cache creation/read tokens in usage totals when the Messages API reports them.
- Improved generated HTML resilience when optional CDN assets fail to load.
- Preserved Mermaid source for editable/exportable diagram workflows.
- Removed legacy hard-coded Code Workflow output so generated documentation remains source-grounded.
- Expanded scanner coverage for common C and C++ source/header extensions, including `.h`, `.cc`, `.cxx`, `.hh`, `.hpp`, and `.hxx`.
- Expanded JavaScript/TypeScript discovery to include modern module extensions: `.mjs`, `.cjs`, `.mts`, and `.cts`.
- Resolved extensionless JavaScript/TypeScript imports and directory index imports into `.mjs`, `.cjs`, `.mts`, and `.cts` files so the project dependency graph matches scanner coverage.
- Bound the generator's per-entry prompt cache version to the canonical `GENERATION_PROMPT_SCHEMA_VERSION`, removing runtime drift between internal and release-level cache identities.
- Removed the facade-time prompt-version mutation: `docGeneratorBase.ts` now binds its per-entry cache version directly to the canonical prompt schema constant, eliminating the stale internal literal without changing generation semantics.
- Bumped the generation cache compatibility policy to v11 so documentation generated under earlier capability/generation semantics is safely regenerated.
- Kept README-only demo media out of the packaged VSIX while retaining runtime icons.

### Tests

- Added regression coverage for provider runtime normalization, transient retry/error/header handling including gateway `statusCode`/numeric-string statuses and zero-delay `Retry-After`, AI/Local generation-mode normalization, dedicated no-provider Local execution, complete Local document assembly and File/Folder/Workspace target routing, deterministic Local per-file/project-overview/architecture rendering, Local TOC entity decoding, Local source/output cache identity and cache-clear lifecycle, final Local sidebar control isolation and marketplace metadata, non-positive chunk-budget rejection, context-safe output budgeting, cancellation-safe provider request scheduling, canonical AI depth normalization, provider-aware optional custom API-key status, fallback-aware provider selection including OpenAI o-series cross-provider correction, optional custom-provider API keys including short custom bearer tokens, dynamic custom-endpoint locality, custom-endpoint transport/URL-shape/command-boundary policy, API-key storage normalization, normalized Secret Storage keys, canonical OpenAI, Anthropic, DeepSeek, and OpenRouter-routed model capabilities including GPT-5.6, o4-mini, and routing variants, metadata/provider context-window precedence, retired OpenAI/DeepSeek/Anthropic model replacement, OpenAI-compatible usage/text fallbacks, Anthropic cache-token accounting, command manifest/runtime registration parity, modern module dependency resolution, canonical generator prompt-cache binding, HTML offline hardening, package contents, scanner extension policy, and release documentation accuracy.

## 1.0.4

- Faster repeat documentation generation through cache reuse and parallel file generation.
- Added generation-aware cache invalidation for material provider/model/settings changes.
- Improved generated HTML navigation, project visuals, dependency graph, and documentation presentation.
- Added support for OpenAI, Anthropic, OpenRouter, DeepSeek, and custom OpenAI-compatible providers.
