# Changelog

All notable changes to DocuMint are documented here.

## Unreleased

### Changed

- Hardened provider runtime behavior so OpenAI-compatible providers normalize cancellation, timeout, authentication, rate-limit, and HTTP failure handling consistently.
- Improved exhausted-retry reporting for transient provider failures so HTTP 408/425 responses and transport timeout codes retain accurate timeout/retry context.
- Normalized gateway-style HTTP status shapes, including `statusCode` and numeric-string statuses, so custom/OpenAI-compatible provider failures retain correct retry and user-facing error handling.
- Read `Retry-After` and `Retry-After-Ms` case-insensitively from plain provider response-header objects so retry timing is preserved across compatible HTTP clients/gateways.
- Honored explicit zero-delay `Retry-After` responses instead of replacing them with exponential backoff, allowing providers to request an immediate bounded retry.
- Added a canonical AI/Local generation-mode foundation with AI preserved as the compatibility default; the sidebar suppresses provider/authentication controls in Local mode and the host routes Local runs through a dedicated deterministic generator before any provider/model selection or cloud-consent flow.
- Connected Local Documentation end to end: scan source, analyze symbols/imports/dependencies, assemble deterministic project/architecture/file sections, render Markdown/HTML, sanitize outputs, report progress/cancellation, and write normal DocuMint documentation files without creating an AI provider.
- Kept Local File, Folder, and Workspace generation on the same scanner semantics as AI mode; selected files/folders are passed as exact target paths to scanner discovery instead of scanning the whole workspace and filtering later.
- Added a deterministic per-file Local Documentation renderer that produces Markdown from source-analysis facts only, including exported APIs, other detected symbols, imports, internal dependencies, known dependents, line counts, and TODO/FIXME/HACK evidence without provider or prompt inference.
- Added a deterministic Local project-overview renderer with project totals, language and top-level module summaries, detected entry points, external dependencies, structurally connected files, and a stable source tree derived only from scanner/analyzer evidence.
- Added deterministic Local architecture output with cross-module relationship counts, complete internal file dependency edges, Mermaid module/file graphs, and D2 module source generated from resolved imports without assigning inferred architecture roles.
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
- Bumped the generation cache compatibility policy to v11 so documentation generated under earlier capability/generation semantics is safely regenerated.
- Kept README-only demo media out of the packaged VSIX while retaining runtime icons.

### Tests

- Added regression coverage for provider runtime normalization, transient retry/error/header handling including gateway `statusCode`/numeric-string statuses and zero-delay `Retry-After`, AI/Local generation-mode normalization, dedicated no-provider Local execution, complete Local document assembly and File/Folder/Workspace target routing, deterministic Local per-file/project-overview/architecture rendering, fallback-aware provider selection including OpenAI o-series cross-provider correction, optional custom-provider API keys including short custom bearer tokens, dynamic custom-endpoint locality, custom-endpoint transport/URL-shape/command-boundary policy, API-key storage normalization, normalized Secret Storage keys, canonical OpenAI, Anthropic, DeepSeek, and OpenRouter-routed model capabilities including GPT-5.6, o4-mini, and routing variants, metadata/provider context-window precedence, retired OpenAI/DeepSeek/Anthropic model replacement, OpenAI-compatible usage/text fallbacks, Anthropic cache-token accounting, command manifest/runtime registration parity, modern module dependency resolution, canonical generator prompt-cache binding, HTML offline hardening, package contents, scanner extension policy, and release documentation accuracy.

## 1.0.4

- Faster repeat documentation generation through cache reuse and parallel file generation.
- Added generation-aware cache invalidation for material provider/model/settings changes.
- Improved generated HTML navigation, project visuals, dependency graph, and documentation presentation.
- Added support for OpenAI, Anthropic, OpenRouter, DeepSeek, and custom OpenAI-compatible providers.
