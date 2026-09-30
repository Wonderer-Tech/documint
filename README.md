# DocuMint - Code Documentation Generator for VS Code

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.110.0-blue)
![Version](https://img.shields.io/badge/version-1.0.7-green)

DocuMint is a VS Code extension that generates code documentation for an entire workspace, a selected folder, or a selected file. Generate deterministic documentation entirely on your machine with **Local Documentation — No AI**, or use AI providers such as OpenAI, Anthropic, OpenRouter, DeepSeek, **Ollama**, **LM Studio**, or a custom OpenAI-compatible endpoint for enhanced explanations.

![DocuMint Demo](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/demo.gif)

![DocuMint Screenshot](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/screenshot1.png)

Generated documentation preview:

![DocuMint Generated Documentation](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/s2.png)

It produces:

- `documint/documentation.md`
- `documint/documentation.html`

## Table of Contents

- [What It Does](#what-it-does)
- [How It Works](#how-it-works)
- [Local Project Map](#local-project-map)
- [Supported Providers](#supported-providers)
- [Supported Languages](#supported-languages)
- [Install](#install)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Documentation Modes](#documentation-modes)
- [Output](#output)
- [Project Structure](#project-structure)
- [Development](#development)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

## What It Does

DocuMint scans and analyzes source files first, then follows one of two generation paths:

- **Local Documentation — No AI:** generates deterministic documentation from detected source facts only. No API key, internet connection, AI model, or external provider is required.
- **AI Documentation:** sends selected source/code context to the configured provider after consent and generates richer semantic explanations.

Both paths support workspace, folder, and file scope and can produce:

- Project overview and stats
- Per-file documentation sections
- Detected imports, exports, symbols, TODO/FIXME/HACK comments, and project links
- Source-derived architecture and dependency information
- Markdown and/or HTML output
- HTML table of contents with navigation and search
- Question-first Local project map plus source-derived architecture/dependency views
- Mermaid rendering for AI-format/source blocks when the optional renderer is available

Local mode also maintains its own source/output fingerprint cache so unchanged Local documentation can be reused without touching AI-generation cache state.

The extension runs directly inside VS Code through a sidebar webview.

## How It Works

Common first steps:

1. Select Workspace, Folder, or File scope.
2. Scan source files through `WorkspaceScanner` using the exact selected target paths when applicable.
3. Analyze source files for imports, exports, symbols, TODOs, entry points, and resolved internal dependencies.

**Local Documentation — No AI** then:

4. Builds deterministic project, architecture, dependency, and per-file sections from source-analysis facts.
5. Renders Markdown and/or HTML without resolving a provider or model.
6. Sanitizes the generated output and records a separate Local cache fingerprint plus sanitized-output hashes.
7. Reuses the Local output only when the source fingerprint and requested output-file hashes still match.

**AI Documentation** instead:

4. Resolves provider/model and verifies external-provider consent when required.
5. Verifies compatible AI-generation cache identity and resets stale AI cache when material generation settings change.
6. Builds prompt context from verified source facts and generates detailed file documentation through the selected provider.
7. Validates and sanitizes generated documentation before writing output.

Both modes save normal DocuMint output into `documint/`.

Public AI-generation facade: `src/services/docGenerator.ts`. Local runtime orchestration lives in `src/services/localDocumentationGenerator.ts` and uses deterministic renderers under `src/services/local*Documentation.ts`.

## Local Project Map

Local HTML now starts with a question-first project map built from the same deterministic model used by Local Markdown:

- **Big picture** — structural modules and resolved cross-module import counts.
- **What's inside** — a file-size treemap grouped by structural module.
- **Start here** — a suggested reading path derived from detected entry points and dependency reach.
- **How to run** — package scripts/manager, VS Code commands/settings, concrete Makefile targets, and Dockerfile source facts when those files are present.
- **Dependency reach** — file size versus incoming project dependents.
- **Look up a file** — search by path, trusted description, exported symbol, or referenced environment variable, then inspect Uses / Used by relationships and exported API.

For TypeScript/JavaScript-family files, DocuMint uses the TypeScript compiler AST for multiline imports/declarations, export modifiers, class methods, and module-vs-function scope. This prevents function-local temporary variables from flooding Local API documentation.

Local descriptions are source-backed only: explicit file/module docs, safe declaration comments, supported language module/package docs, or exact README path descriptions. When no trusted description exists, DocuMint says so instead of inventing one.

Local Markdown is intentionally compact and does not carry raw architecture/whiteboard/dependency JSON payloads. Local HTML uses the interactive project map as its rich visual layer and does not require CDN assets to render that Local experience.

## Supported Providers

AI mode is configured using `documint.aiProvider`:

- `openai`
- `anthropic` — current fallback model: `claude-sonnet-5`
- `openrouter`
- `deepseek` — current fallback model: `deepseek-flash`
- `ollama` — local OpenAI-compatible preset at `http://127.0.0.1:11434/v1/chat/completions`
- `lmstudio` — local OpenAI-compatible preset at `http://127.0.0.1:1234/v1/chat/completions`
- `custom`

Ollama and LM Studio do not require an API key or cloud-source-transfer consent. When one of these presets is selected, DocuMint queries the fixed loopback `/v1/models` endpoint and offers the models reported by that runtime. If exactly one model is reported it is selected automatically; otherwise choose a suggestion or enter a model ID manually.

Local Documentation mode does not use any AI provider.

Provider implementations live in `src/providers/`.

## Supported Languages

The following scanner languages are enabled by default on new installs:

- TypeScript (`.ts`, `.mts`, `.cts`, `.tsx`)
- JavaScript (`.js`, `.mjs`, `.cjs`, `.jsx`)
- Python (`.py`)
- Java (`.java`)
- C (`.c`, `.h`)
- C++ (`.cc`, `.cpp`, `.cxx`, `.hh`, `.hpp`, `.hxx`)
- C# (`.cs`)
- Go (`.go`)
- Rust (`.rs`)
- PHP (`.php`)
- Ruby (`.rb`)
- Swift (`.swift`)
- Kotlin (`.kt`)
- Scala (`.scala`)
- Shell (`.sh`)
- YAML (`.yaml`, `.yml`)
- JSON (`.json`)
- XML (`.xml`)
- HTML (`.html`)
- CSS / SCSS (`.css`, `.scss`)
- SQL (`.sql`)

Notes:

- `documint.targetLanguages` controls which languages are scanned.
- Workspace scans exclude `node_modules`, generated/build folders, `.git`, `docs`, the generated `documint` folder, test/spec files, lockfiles, `.env` files, logs, and other common non-source artifacts by default.
- Deliberately selecting a folder relaxes DocuMint's default test/spec exclusion, but explicit user-configured exclusions remain authoritative.

## Install

### Marketplace

Install from VS Code Marketplace:

- https://marketplace.visualstudio.com/items?itemName=wonderertech.documint

Or run:

```text
ext install wonderertech.documint
```

### VSIX

Tagged releases publish the packaged VSIX as a GitHub Release asset instead of committing binaries to the source tree.

1. Open the repository's **Releases** page.
2. Download `documint-<version>.vsix`.
3. Install it:

```bash
code --install-extension /path/to/documint-<version>.vsix
```

### Build from Source

```bash
git clone https://github.com/Wonderer-Tech/documint.git
cd documint
npm install
npm run compile
```

## Quick Start

1. Open a project folder in VS Code.
2. Open the **Documint** view in the activity bar.
3. Choose **Local Documentation — No AI** or **AI Documentation**.
4. For Local mode, choose Output Format and generate immediately. No API key or model setup is required.
5. For AI mode, select provider/model. Cloud providers may require **Configure API Key**; Ollama and LM Studio do not.
6. Click **Generate Documentation** / **Generate Local Documentation** for workspace scope, or use **File** / **Folder** quick buttons.
7. Open generated files from `documint/`.

## Commands

Contributed commands:

- `aiDocGenerator.generateDocumentation` - Generate documentation
- `aiDocGenerator.cancelGeneration` - Cancel generation
- `aiDocGenerator.configureApiKey` - Configure API key
- `aiDocGenerator.clearCache` - Clear AI documentation, visual, generation-settings, and Local documentation cache markers

Internal scope commands used by sidebar:

- `aiDocGenerator.pickAndGenerateFile`
- `aiDocGenerator.pickAndGenerateFolder`

## Configuration

New settings are published under `documint.*`. Existing explicit `aiDocGenerator.*` settings remain supported as deprecated compatibility aliases; explicit `documint.*` values take precedence.

### Key Settings

- `documint.generationMode` (`ai | local`, `local` by default)
- `documint.aiProvider` (`openai | anthropic | openrouter | deepseek | ollama | lmstudio | custom`; `openai` by default; AI mode only)
- `documint.model` (`gpt-5.4-nano` by default; AI mode only)
- `documint.documentationDepth` (`simple | basic | standard | comprehensive`; AI mode only)
- `documint.outputFormat` (`markdown | html | both`)
- `documint.targetLanguages` (all listed supported scanner languages by default)
- `documint.maxTokens`
- `documint.temperature`
- `documint.rateLimitDelay`
- `documint.concurrentRequests`
- `documint.excludePatterns`
- `documint.customApiEndpoint`

### Local `settings.json`

```json
{
  "documint.generationMode": "local",
  "documint.outputFormat": "both"
}
```

### AI `settings.json`

```json
{
  "documint.generationMode": "ai",
  "documint.aiProvider": "openai",
  "documint.model": "gpt-5.4-nano",
  "documint.documentationDepth": "standard",
  "documint.outputFormat": "both",
  "documint.maxTokens": 4000,
  "documint.temperature": 0.3,
  "documint.concurrentRequests": 5,
  "documint.rateLimitDelay": 1000,
  "documint.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**"
  ]
}
```

Anthropic example:

```json
{
  "documint.generationMode": "ai",
  "documint.aiProvider": "anthropic",
  "documint.model": "claude-sonnet-5"
}
```

DeepSeek example:

```json
{
  "documint.generationMode": "ai",
  "documint.aiProvider": "deepseek",
  "documint.model": "deepseek-flash"
}
```

Local AI provider examples:

```json
{
  "documint.generationMode": "ai",
  "documint.aiProvider": "ollama",
  "documint.model": "qwen3:8b"
}
```

```json
{
  "documint.generationMode": "ai",
  "documint.aiProvider": "lmstudio",
  "documint.model": "your-loaded-model-id"
}
```

Custom endpoint example:

```json
{
  "documint.generationMode": "ai",
  "documint.aiProvider": "custom",
  "documint.model": "your-model-name",
  "documint.customApiEndpoint": "https://api.example.com/v1/chat/completions"
}
```

## Documentation Modes

### Generation Mode

| Mode | Network / API Key | What It Generates |
|------|-------------------|-------------------|
| `local` | None required | Deterministic project facts, source tree, trusted descriptions, detected APIs/imports/TODOs/environment references, resolved dependencies, a compact module Mermaid view in Markdown, and the interactive Local project map in HTML. No semantic AI inference is added. |
| `ai` | Depends on provider | Source-grounded documentation enhanced with provider-generated explanations, examples, architecture/design notes, and other semantic sections when supported by source evidence. |

Local mode deliberately hides provider/model/authentication and Documentation Depth controls because they do not affect Local output.

### AI Documentation Depth

`documint.documentationDepth` applies only to AI mode.

| Depth | Best For | What It Generates |
|------|----------|-------------------|
| `simple` | Fast plain-English understanding | Short purpose, key capabilities, and input/output summary for each file. |
| `basic` | Lightweight developer reference | Module metadata, overview, exported API reference, quick start, and related modules. |
| `standard` | Default production documentation | Full API reference, dependencies, usage examples, side effects, errors, configuration, security, concurrency, and testing notes when source evidence exists. |
| `comprehensive` | Detailed enterprise documentation | Architecture/design notes, module boundaries, exhaustive API reference, data flow, configuration, errors/recovery, security, limitations, TODO/FIXME inventory, and performance/resource notes when source evidence exists. |

Notes:

- `simple`, `basic`, and `standard` can batch small files for faster AI generation.
- `comprehensive` can batch small files, but large files are not truncated. They are generated as full single-file requests, and files that exceed the provider context window are split into chunks before the output is merged.

## Output

Generated output is written to a dedicated `documint/` directory in the workspace root:

- `documint/documentation.md`
- `documint/documentation.html`
- `documint/.documint-cache.json` — AI documentation cache
- `documint/.documint-visual-cache.json` — AI visual cache
- `documint/.documint-generation-cache-key.json` — AI cache compatibility marker
- `documint/.documint-local-cache.json` — Local source/output cache manifest

DocuMint no longer writes generated output into your project's `docs/` directory. Existing legacy `docs/` files are not moved or deleted automatically.

Local and AI modes use the same output paths, so the latest successful generation replaces the previous rendered documentation files.

The HTML renderer includes:

- Folder-first sidebar navigation
- Section anchors and ranked documentation search
- Local file/description/export search with Ctrl/Cmd+K
- Theme toggle
- Question-first Local project map
- File-size treemap and dependency-reach view
- Suggested reading path
- Connected file cards with Uses / Used by relationships
- Portable source-file and line links
- Project tree and deterministic architecture/dependency facts
- Copy-to-clipboard for code blocks

AI output can additionally include richer source-grounded visual/semantic sections depending on the selected depth and available evidence.

## Project Structure

```text
src/ # VS Code extension source
|-- analyzer/ # Source analysis, symbols, imports, and dependency facts
|   |-- sourceAnalyzer.ts          # Public analyzer facade + AST-backed JS/TS routing
|   `-- sourceAnalyzerBase.ts      # Core cross-language analysis and non-JS/TS facts
|-- extension.ts                   # Public VS Code activation entry point
|-- extensionBase.ts               # Activation, commands, AI/Local routing, consent, cache clearing
|-- types.ts                       # Shared types and error models
|-- config/ # Settings migration, API-key validation, and Secret Storage
|   |-- apiKeyValidation.ts        # Local API-key sanity checks
|   |-- configuration.ts           # documint.* settings bridge + legacy fallback
|   |-- configurationPreference.ts # Pure namespace-precedence policy
|   `-- secretStorage.ts           # VS Code secret storage wrapper
|-- scanner/ # Workspace/file discovery, language filtering, and exclusions
|   `-- workspaceScanner.ts        # Workspace/selected-path discovery and filtering
|-- providers/ # Cloud and local AI-provider runtimes, models, retry, and limits
|   |-- aiProvider.ts              # Base provider and prompt/chunking pipeline
|   |-- providerFactory.ts         # Provider resolution and creation
|   |-- localProviderPolicy.ts     # Ollama/LM Studio loopback + model policy
|   |-- localOpenAICompatibleProvider.ts # Keyless local OpenAI-compatible runtime
|   |-- localProviderDiscovery.ts  # Fixed-loopback /v1/models discovery
|   |-- providerModelGuard.ts      # Prevents stale cross-provider model IDs
|   |-- providerMetadataDecorator.ts # Context-window metadata/override layer
|   |-- openAICapabilities.ts      # Canonical OpenAI context/output capability table
|   |-- anthropicCapabilities.ts   # Canonical Anthropic context/output capability table
|   |-- deepSeekCapabilities.ts    # Canonical DeepSeek context/output capability table
|   |-- openaiProvider.ts
|   |-- anthropicProvider.ts
|   |-- openrouterProvider.ts
|   |-- deepseekProvider.ts
|   `-- customProvider.ts
|-- services/ # Local/AI generation, cache, rendering, navigation, and output policy
|   |-- docGenerator.ts                 # Public AI generator facade
|   |-- docGeneratorBase.ts             # AI orchestration + canonical prompt/cache binding
|   |-- generationMode.ts               # Canonical AI/Local mode normalization
|   |-- localDocumentationGenerator.ts  # Local scan/analyze/write/cache runtime
|   |-- localDocumentationDocument.ts   # Complete deterministic Local document assembly
|   |-- localDocumentationModel.ts      # Canonical Local facts/model shared by Markdown and HTML
|   |-- localReadmeFacts.ts             # Exact README path-description extraction
|   |-- localBuildFacts.ts              # Makefile targets and Dockerfile source facts
|   |-- structuralModule.ts             # Shared structural module grouping
|   |-- localCodeMapData.ts             # Local interactive project-map data contract
|   |-- htmlLocalCodeMap.ts             # Question-first Local HTML project map
|   |-- localProjectDocumentation.ts    # Deterministic Local project overview
|   |-- localArchitectureDocumentation.ts # Deterministic dependency diagrams/edges
|   |-- localFileDocumentation.ts       # Deterministic per-file facts/API sections
|   |-- localDocumentationCache.ts      # Separate Local source/output fingerprint cache
|   |-- generationCacheIdentity.ts      # Canonical AI generation/cache identity versions
|   |-- generationCachePolicy.ts        # Invalidates AI-doc cache on material generation changes
|   |-- documentationValidator.ts       # Checks AI docs against source facts
|   |-- outputSanitizer.ts              # Removes unsafe/non-source-grounded output sections
|   |-- htmlTemplate.ts                 # Small HTML document composition shell
|   |-- htmlTemplatePolicy.ts           # External-asset/timestamp/local-surface policy
|   |-- htmlBaseStyles.ts               # Generated HTML base/Jelly UI styles
|   |-- htmlBaseScript.ts               # Generated HTML reader/visual runtime
|   `-- modelMetadataService.ts         # Context window metadata fetch/cache
`-- views/ # Sidebar webview host, template, styles, and client runtime
    |-- sidebarProvider.ts              # Sidebar host/state/message bridge
    |-- sidebarTemplate.ts              # CSP-aware sidebar HTML composition
    |-- sidebarStyles.ts                # Sidebar webview styles
    `-- sidebarClientScript.ts          # Sidebar webview client runtime
```

The `*Base.ts` modules are implementation details. Runtime AI code should import the public facade modules (`extension.ts`, `analyzer/sourceAnalyzer.ts`, and `services/docGenerator.ts`) so endpoint, dependency-resolution, and cache-version policies cannot be bypassed.

## Development

### Prerequisites

- Node.js 18+
- npm 9+
- VS Code 1.110.0+

### Commands

```bash
npm install
npm run compile
npm run typecheck
npm run watch
npm test
npm run audit:self
npm run verify
```

Self-audit:

`npm run audit:self` documents DocuMint's own `src/` plus `package.json` and checks release-critical Local Documentation invariants such as AST export detection, compact Markdown, Local code-map presence, run scripts, and Local HTML CDN independence.

`npm run verify` runs the regression suite and then the self-audit.

When dependency registry access is available, `npm run lockfile:generate` creates/refreshes `package-lock.json` without running package scripts.

Package extension:

```bash
npx @vscode/vsce package
```

## Known Limitations

- TypeScript/JavaScript-family structure uses the TypeScript compiler AST; other languages use deterministic language-specific static analysis. Local mode is not a full semantic program prover for every language.
- Local mode does not invent business-logic explanations, intent, usage examples, or architectural rationale that cannot be established from static source evidence.
- AI documentation quality depends on the selected model and the source code/context available in the workspace.
- Cloud providers receive selected source code only after confirmation. Use Local Documentation when code must remain entirely on the machine.
- `documint.concurrentRequests` defaults to `5` for broader provider compatibility. Increase it only when your provider rate limits allow.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development rules and regression-test expectations.

- Repository: https://github.com/Wonderer-Tech/documint
- Issues: https://github.com/Wonderer-Tech/documint/issues
- Security policy: [SECURITY.md](SECURITY.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
