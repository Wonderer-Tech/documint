# Changelog

All notable changes to DocuMint are documented here.

## Unreleased

### Changed

- Hardened provider runtime behavior so OpenAI-compatible providers normalize cancellation, timeout, authentication, rate-limit, and HTTP failure handling consistently.
- Improved exhausted-retry reporting for transient provider failures so HTTP 408/425 responses and transport timeout codes retain accurate timeout/retry context.
- Read `Retry-After` and `Retry-After-Ms` case-insensitively from plain provider response-header objects so retry timing is preserved across compatible HTTP clients/gateways.
- Centralized provider/model defaults to reduce stale cross-provider model behavior.
- Kept custom OpenAI-compatible API keys optional across both file generation and project-summary/raw-prompt generation paths.
- Required HTTPS for remote custom OpenAI-compatible endpoints while keeping plain HTTP available for localhost/loopback development servers; IPv6 loopback detection now correctly recognizes `[::1]`.
- Rejected custom endpoint URLs that embed credentials or URL fragments, while preserving legitimate query strings such as provider API-version parameters.
- Applied the canonical custom-endpoint policy at the public generation-command boundary so sidebar, command-palette, and programmatic runs share the same validation before generation starts; local `127.x`, IPv6 loopback, and `*.localhost` endpoints no longer inherit external-provider consent behavior.
- Trimmed leading/trailing paste whitespace before API keys are persisted so a locally valid key is not later sent with invisible whitespace.
- Normalized provider names before building Secret Storage keys so store/get/delete operations cannot drift by casing or surrounding whitespace.
- Centralized OpenAI context/output limits in one capability table used by both provider budgeting and shared model metadata, including current GPT-4.1, GPT-5, GPT-5.4, and GPT-5.6 families.
- Added canonical GPT-5.6 Sol/Terra/Luna capability support (1.05M context, 128K max output) for both direct OpenAI and OpenRouter-routed generation without changing DocuMint's default OpenAI model.
- Reused the canonical OpenAI capability table for OpenRouter-routed OpenAI models so routed GPT/o-series context and max-output budgeting no longer diverge from direct OpenAI behavior.
- Normalized OpenRouter routing variants such as `:free`, `:online`, `:nitro`, and `:floor` before capability lookup so variant-tagged models retain their base model's context and output limits.
- Centralized DeepSeek capability metadata so direct DeepSeek and OpenRouter-routed DeepSeek models share the current 1M context and 384K max-output limits; current `deepseek-flash`/`deepseek-v4-pro` IDs are distinguished from retained V4 Flash compatibility aliases.
- Replaced retired `deepseek-chat` and `deepseek-reasoner` selections with the current DeepSeek fallback model before requests are sent.
- Replaced retired Anthropic model selections (including retired Claude 2/3, Sonnet 3.7, Sonnet 4, Opus 4, and Opus 4.1 IDs) with the current Anthropic fallback before requests are sent, while preserving active Claude 4.5+ and Claude 5 model choices.
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
- Bumped the generation cache compatibility policy to v9 so documentation generated under earlier capability/generation semantics is safely regenerated.
- Kept README-only demo media out of the packaged VSIX while retaining runtime icons.

### Tests

- Added regression coverage for provider runtime normalization, transient retry/error/header handling, optional custom-provider API keys, custom-endpoint transport/URL-shape/command-boundary policy, API-key storage normalization, normalized Secret Storage keys, canonical OpenAI, Anthropic, DeepSeek, and OpenRouter-routed model capabilities including GPT-5.6 and routing variants, retired DeepSeek and Anthropic model replacement, OpenAI-compatible usage/text fallbacks, Anthropic cache-token accounting, modern module dependency resolution, canonical generator prompt-cache binding, HTML offline hardening, package contents, scanner extension policy, and release documentation accuracy.

## 1.0.4

- Faster repeat documentation generation through cache reuse and parallel file generation.
- Added generation-aware cache invalidation for material provider/model/settings changes.
- Improved generated HTML navigation, project visuals, dependency graph, and documentation presentation.
- Added support for OpenAI, Anthropic, OpenRouter, DeepSeek, and custom OpenAI-compatible providers.
