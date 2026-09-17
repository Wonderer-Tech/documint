# Changelog

All notable changes to DocuMint are documented here.

## Unreleased

### Changed

- Hardened provider runtime behavior so OpenAI-compatible providers normalize cancellation, timeout, authentication, rate-limit, and HTTP failure handling consistently.
- Improved exhausted-retry reporting for transient provider failures so HTTP 408/425 responses and transport timeout codes retain accurate timeout/retry context.
- Centralized provider/model defaults to reduce stale cross-provider model behavior.
- Kept custom OpenAI-compatible API keys optional across both file generation and project-summary/raw-prompt generation paths.
- Required HTTPS for remote custom OpenAI-compatible endpoints while keeping plain HTTP available for localhost/loopback development servers; IPv6 loopback detection now correctly recognizes `[::1]`.
- Rejected custom endpoint URLs that embed credentials or URL fragments, while preserving legitimate query strings such as provider API-version parameters.
- Trimmed leading/trailing paste whitespace before API keys are persisted so a locally valid key is not later sent with invisible whitespace.
- Normalized provider names before building Secret Storage keys so store/get/delete operations cannot drift by casing or surrounding whitespace.
- Aligned GPT-4.1, GPT-4.1 Mini, and GPT-4.1 Nano metadata with the provider runtime so their 1,000,000-token context window is not collapsed to the conservative 8,192-token fallback.
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
- Bumped the generation cache compatibility policy to v3 so documentation generated under older release semantics is safely regenerated.
- Kept README-only demo media out of the packaged VSIX while retaining runtime icons.

### Tests

- Added regression coverage for provider runtime normalization, transient retry error reporting, optional custom-provider API keys, custom-endpoint transport and URL-shape policy, API-key storage normalization, normalized Secret Storage keys, GPT-4.1 context metadata, OpenAI-compatible usage/text fallbacks, Anthropic cache-token accounting, modern module dependency resolution, canonical generator prompt-cache binding, HTML offline hardening, package contents, scanner extension policy, and release documentation accuracy.

## 1.0.4

- Faster repeat documentation generation through cache reuse and parallel file generation.
- Added generation-aware cache invalidation for material provider/model/settings changes.
- Improved generated HTML navigation, project visuals, dependency graph, and documentation presentation.
- Added support for OpenAI, Anthropic, OpenRouter, DeepSeek, and custom OpenAI-compatible providers.
