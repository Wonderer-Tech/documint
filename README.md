# DocuMint - Code Documentation Generator for VS Code

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.110.0-blue)
![Version](https://img.shields.io/badge/version-1.0.6-green)

DocuMint is a VS Code extension that generates code documentation for an entire workspace, a selected folder, or a selected file. Generate deterministic documentation entirely on your machine with **Local Documentation — No AI**, or use AI providers such as OpenAI, Anthropic, OpenRouter, DeepSeek, or a custom OpenAI-compatible endpoint for enhanced explanations.

![DocuMint Demo](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/demo.gif)

![DocuMint Screenshot](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/screenshot1.png)

Generated documentation preview:

![DocuMint Generated Documentation](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/s2.png)

It produces:

- `documint/documentation.md`
- `documint/documentation.html`

## Table of Contents

- [What It Does](#what-it-does)
- [What's New in 1.0.5](#whats-new-in-105)
- [How It Works](#how-it-works)
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
- Mermaid diagram rendering support in generated HTML

Local mode also maintains its own source/output fingerprint cache so unchanged Local documentation can be reused without touching AI-generation cache state.

The extension runs directly inside VS Code through a sidebar webview.

## What's New in 1.0.5

DocuMint 1.0.5 adds a complete **Local Documentation — No AI** path and hardens the AI pipeline for safer production use.

### 1.0.5 Highlights

- **Local Documentation — No AI:** generate source-grounded documentation entirely on-device with no API key, internet connection, model, or provider.
- **File / Folder / Workspace parity:** Local mode uses the same exact target-path scanner semantics as AI mode.
- **Deterministic Local project docs:** project facts, language/module summaries, source tree, entry points, dependencies, exported APIs, symbols, imports, dependents, and TODO/FIXME/HACK evidence.
- **Local architecture visuals:** source-derived module/file dependency views now include the interactive architecture dashboard, Files/Lines Module Scale Chart, Mermaid, D2, whiteboard/Excalidraw export, and searchable dependency graph—without invented architecture roles.
- Local mode now renders the same visual surfaces directly from scanner/analyzer facts; no provider call is made to build those charts or maps.
- **Separate Local cache:** source fingerprints plus sanitized-output hashes allow safe reuse while keeping Local cache identity isolated from AI caches.
- **Cleaner Local UX:** provider, model, authentication, custom endpoint, and AI-only Documentation Depth controls disappear in Local mode; the primary action becomes **Generate Local Documentation**.
- **Safer AI context budgeting:** non-positive chunk budgets fail clearly instead of risking non-advancing loops, and raw/normal/chunked output budgets never exceed the remaining context window.
- **Cancellation-safe provider pacing:** cancelled requests no longer reserve phantom future rate-limit slots.
- **Canonical AI depth handling:** blank, mixed-case, or unsupported programmatic depth values normalize once and the same value drives runtime generation and cache identity.
- **Provider/auth hardening:** custom OpenAI-compatible endpoints may run without a key, keyless custom providers show **API Key optional**, provider switching refreshes the correct Secret Storage state, and custom endpoint locality/URL rules are enforced consistently.
- **Updated model capability handling:** current OpenAI GPT-5.6 and o4-mini, Anthropic, DeepSeek, and OpenRouter-routed capability metadata share canonical context/output limits and retired model IDs are guarded.
- **Broader scanner coverage:** C/C++ headers and modern JS/TS module extensions such as `.mjs`, `.cjs`, `.mts`, and `.cts` are included in discovery/dependency resolution.
- **Output resilience:** generated HTML preserves Mermaid source when rendering/CDN assets fail, and Local TOC anchors decode escaped heading entities correctly.
- **Soft Jelly UI:** generated HTML now uses floating rounded navigation, softer cards/tables/code surfaces, calmer borders and shadows, improved spacing, smoother focus/hover states, and reduced-motion-aware interactions in both dark and light themes.
- **Verified build:** current release code passes TypeScript typecheck, esbuild bundle, and the full **218/218 regression suite** in GitHub Actions.
- Cleaner VSIX output: generated docs and README-only demo media are excluded from the packaged extension.

### Local vs AI

| Area | Local Documentation | AI Documentation |
|---|---|---|
| API key | Not required | Depends on provider |
| Internet | Not required | Required for cloud providers |
| Semantic inference | None | Yes, source-grounded |
| File / Folder / Workspace | Yes | Yes |
| Markdown / HTML | Yes | Yes |
| Project facts and APIs | Deterministic static analysis | Static analysis + provider enhancement |
| Architecture/dependencies | Resolved source relationships + chart/map/whiteboard/dependency visuals | Source relationships + AI explanation |
| Cache | Separate Local fingerprint/output cache | Provider/model/settings-aware AI cache |

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

## Supported Providers

AI mode is configured using `aiDocGenerator.aiProvider`:

- `openai`
- `anthropic` — current fallback model: `claude-sonnet-5`
- `openrouter`
- `deepseek` — current fallback model: `deepseek-flash`
- `custom`

Local mode does not use a provider.

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

- `aiDocGenerator.targetLanguages` controls which languages are scanned.
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

```bash
code --install-extension documint-1.0.6.vsix
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
5. For AI mode, select provider/model and run **Configure API Key** when required.
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

All settings are under `aiDocGenerator`.

### Key Settings

- `aiDocGenerator.generationMode` (`ai | local`, `ai` by default)
- `aiDocGenerator.aiProvider` (`openai` by default; AI mode only)
- `aiDocGenerator.model` (`gpt-5.4-nano` by default; AI mode only)
- `aiDocGenerator.documentationDepth` (`simple | basic | standard | comprehensive`; AI mode only)
- `aiDocGenerator.outputFormat` (`markdown | html | both`)
- `aiDocGenerator.targetLanguages` (all listed supported scanner languages by default)
- `aiDocGenerator.maxTokens`
- `aiDocGenerator.temperature`
- `aiDocGenerator.rateLimitDelay`
- `aiDocGenerator.concurrentRequests`
- `aiDocGenerator.excludePatterns`
- `aiDocGenerator.customApiEndpoint`

### Local `settings.json`

```json
{
  "aiDocGenerator.generationMode": "local",
  "aiDocGenerator.outputFormat": "both"
}
```

### AI `settings.json`

```json
{
  "aiDocGenerator.generationMode": "ai",
  "aiDocGenerator.aiProvider": "openai",
  "aiDocGenerator.model": "gpt-5.4-nano",
  "aiDocGenerator.documentationDepth": "standard",
  "aiDocGenerator.outputFormat": "both",
  "aiDocGenerator.maxTokens": 4000,
  "aiDocGenerator.temperature": 0.3,
  "aiDocGenerator.concurrentRequests": 15,
  "aiDocGenerator.rateLimitDelay": 1000,
  "aiDocGenerator.excludePatterns": [
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
  "aiDocGenerator.generationMode": "ai",
  "aiDocGenerator.aiProvider": "anthropic",
  "aiDocGenerator.model": "claude-sonnet-5"
}
```

DeepSeek example:

```json
{
  "aiDocGenerator.generationMode": "ai",
  "aiDocGenerator.aiProvider": "deepseek",
  "aiDocGenerator.model": "deepseek-flash"
}
```

Custom endpoint example:

```json
{
  "aiDocGenerator.generationMode": "ai",
  "aiDocGenerator.aiProvider": "custom",
  "aiDocGenerator.model": "your-model-name",
  "aiDocGenerator.customApiEndpoint": "https://api.example.com/v1/chat/completions"
}
```

## Documentation Modes

### Generation Mode

| Mode | Network / API Key | What It Generates |
|------|-------------------|-------------------|
| `local` | None required | Deterministic project facts, source tree, detected APIs/symbols/imports/TODOs, resolved dependencies, module relationships, and source-derived Mermaid/D2 diagrams. No semantic AI inference is added. |
| `ai` | Depends on provider | Source-grounded documentation enhanced with provider-generated explanations, examples, architecture/design notes, and other semantic sections when supported by source evidence. |

Local mode deliberately hides provider/model/authentication and Documentation Depth controls because they do not affect Local output.

### AI Documentation Depth

`aiDocGenerator.documentationDepth` applies only to AI mode.

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

- Sidebar TOC
- Route-based folder/file navigation
- Section anchors
- Search
- Theme toggle
- Syntax highlighting
- Mermaid rendering
- Project tree
- Architecture/dependency sections
- D2 source
- Copy-to-clipboard for code blocks

AI output can additionally include richer source-grounded visual/semantic sections depending on the selected depth and available evidence.

## Project Structure

```text
src/
|-- analyzer/
|   |-- sourceAnalyzer.ts          # Public analyzer facade + modern module compatibility
|   `-- sourceAnalyzerBase.ts      # Core cross-language import/export/symbol analysis
|-- extension.ts                   # Public VS Code activation entry point
|-- extensionBase.ts               # Activation, commands, AI/Local routing, consent, cache clearing
|-- types.ts                       # Shared types and error models
|-- config/
|   `-- secretStorage.ts           # VS Code secret storage wrapper
|-- scanner/
|   `-- workspaceScanner.ts        # Workspace/selected-path discovery and filtering
|-- providers/
|   |-- aiProvider.ts              # Base provider and prompt/chunking pipeline
|   |-- providerFactory.ts         # Provider resolution and creation
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
|-- services/
|   |-- docGenerator.ts                 # Public AI generator facade
|   |-- docGeneratorBase.ts             # AI orchestration + canonical prompt/cache binding
|   |-- generationMode.ts               # Canonical AI/Local mode normalization
|   |-- localDocumentationGenerator.ts  # Local scan/analyze/write/cache runtime
|   |-- localDocumentationDocument.ts   # Complete deterministic Local document assembly
|   |-- localProjectDocumentation.ts    # Deterministic Local project overview
|   |-- localArchitectureDocumentation.ts # Deterministic dependency diagrams/edges
|   |-- localFileDocumentation.ts       # Deterministic per-file facts/API sections
|   |-- localDocumentationCache.ts      # Separate Local source/output fingerprint cache
|   |-- generationCacheIdentity.ts      # Canonical AI generation/cache identity versions
|   |-- generationCachePolicy.ts        # Invalidates AI-doc cache on material generation changes
|   |-- documentationValidator.ts       # Checks AI docs against source facts
|   |-- outputSanitizer.ts              # Removes unsafe/non-source-grounded output sections
|   |-- htmlTemplate.ts                 # Full HTML document template
|   `-- modelMetadataService.ts         # Context window metadata fetch/cache
`-- views/
    `-- sidebarProvider.ts              # Sidebar UI webview and state sync
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
```

Package extension:

```bash
npx @vscode/vsce package
```

## Known Limitations

- Static analysis is intentionally lightweight. Local mode reports detected source facts; it is not a full compiler or semantic program prover for every language.
- Local mode does not invent business-logic explanations, intent, usage examples, or architectural rationale that cannot be established from static source evidence.
- AI documentation quality depends on the selected model and the source code/context available in the workspace.
- Cloud providers receive selected source code only after confirmation. Use Local Documentation when code must remain entirely on the machine.
- `aiDocGenerator.concurrentRequests` defaults to `15` for faster AI generation. Lower it in settings if your cloud provider rate-limits requests.

## Contributing

Issues and PRs are welcome.

- Repository: https://github.com/Wonderer-Tech/documint
- Issues: https://github.com/Wonderer-Tech/documint/issues

## License

MIT. See [LICENSE](LICENSE).

## 1.0.6 — Generated navigation repair

Local and AI-format HTML now share working folder-wise collapsible navigation. Local TOCs emit the canonical link classes and explicit file identity, including route-group and spaced filenames. The chart function/map collision is fixed; optional chart failures cannot block navigation or search. Module chart totals include every emitted module. Local cache v4 regenerates older HTML once. Browser acceptance covers collapse, filtering, anchors, themes, charts, offline rendering and failure isolation.


## Reader navigation — 1.0.7

Folder-first navigation now has persistent, report-scoped open/closed state, Expand all / Collapse all, file counts, clearable filtering, keyboard navigation, current-file context and a section selector. Ranked search supports Ctrl/Cmd+K, arrow selection, Enter and Escape; all results point to real document headings. Mobile uses the same folder tree in a focus-managed drawer. Wide tables scroll within the report; charts and documentation facts remain unchanged. Local cache v5 refreshes older generated HTML once.

Install `releases/documint-1.0.7.vsix`, reload VS Code, and regenerate documentation to update existing HTML.
