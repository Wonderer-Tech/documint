# Changelog

All notable changes to DocuMint are documented here.

## Unreleased

### Changed

- Hardened provider runtime behavior so OpenAI-compatible providers normalize cancellation, timeout, authentication, rate-limit, and HTTP failure handling consistently.
- Centralized provider/model defaults to reduce stale cross-provider model behavior.
- Improved generated HTML resilience when optional CDN assets fail to load.
- Preserved Mermaid source for editable/exportable diagram workflows.
- Removed legacy hard-coded Code Workflow output so generated documentation remains source-grounded.
- Expanded scanner coverage for common C and C++ source/header extensions, including `.h`, `.cc`, `.cxx`, `.hh`, `.hpp`, and `.hxx`.
- Bumped the generation cache compatibility policy to v3 so documentation generated under older release semantics is safely regenerated.
- Kept README-only demo media out of the packaged VSIX while retaining runtime icons.

### Tests

- Added regression coverage for provider runtime normalization, HTML offline hardening, package contents, scanner extension policy, and release documentation accuracy.

## 1.0.4

- Faster repeat documentation generation through cache reuse and parallel file generation.
- Added generation-aware cache invalidation for material provider/model/settings changes.
- Improved generated HTML navigation, project visuals, dependency graph, and documentation presentation.
- Added support for OpenAI, Anthropic, OpenRouter, DeepSeek, and custom OpenAI-compatible providers.
