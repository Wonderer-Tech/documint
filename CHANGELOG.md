# Changelog

All notable changes to DocuMint are documented here.

## Unreleased

### Changed

- Hardened provider runtime behavior so OpenAI-compatible providers normalize cancellation, timeout, authentication, rate-limit, and HTTP failure handling consistently.
- Improved exhausted-retry reporting for transient provider failures so HTTP 408/425 responses and transport timeout codes retain accurate timeout/retry context.
- Centralized provider/model defaults to reduce stale cross-provider model behavior.
- Kept custom OpenAI-compatible API keys optional across both file generation and project-summary/raw-prompt generation paths.
- Trimmed leading/trailing paste whitespace before API keys are persisted so a locally valid key is not later sent with invisible whitespace.
- Aligned GPT-4.1, GPT-4.1 Mini, and GPT-4.1 Nano metadata with the provider runtime so their 1,000,000-token context window is not collapsed to the conservative 8,192-token fallback.
- Improved generated HTML resilience when optional CDN assets fail to load.
- Preserved Mermaid source for editable/exportable diagram workflows.
- Removed legacy hard-coded Code Workflow output so generated documentation remains source-grounded.
- Expanded scanner coverage for common C and C++ source/header extensions, including `.h`, `.cc`, `.cxx`, `.hh`, `.hpp`, and `.hxx`.
- Expanded JavaScript/TypeScript discovery to include modern module extensions: `.mjs`, `.cjs`, `.mts`, and `.cts`.
- Bumped the generation cache compatibility policy to v3 so documentation generated under older release semantics is safely regenerated.
- Kept README-only demo media out of the packaged VSIX while retaining runtime icons.

### Tests

- Added regression coverage for provider runtime normalization, transient retry error reporting, optional custom-provider API keys, API-key storage normalization, GPT-4.1 context metadata, HTML offline hardening, package contents, scanner extension policy, and release documentation accuracy.

## 1.0.4

- Faster repeat documentation generation through cache reuse and parallel file generation.
- Added generation-aware cache invalidation for material provider/model/settings changes.
- Improved generated HTML navigation, project visuals, dependency graph, and documentation presentation.
- Added support for OpenAI, Anthropic, OpenRouter, DeepSeek, and custom OpenAI-compatible providers.
