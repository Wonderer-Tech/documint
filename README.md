# DocuMint - Code Documentation Generator for VS Code

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.110.0-blue)
![Version](https://img.shields.io/badge/version-1.0.4-green)

DocuMint is a VS Code extension that generates code documentation for an entire workspace, a selected folder, or a selected file. Generate deterministic documentation entirely on your machine with **Local Documentation — No AI**, or use AI providers such as OpenAI, Anthropic, OpenRouter, DeepSeek, or a custom OpenAI-compatible endpoint for enhanced explanations.

![DocuMint Demo](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/demo.gif)

![DocuMint Screenshot](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/screenshot1.png)

Generated documentation preview:

![DocuMint Generated Documentation](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/s2.png)

It produces:

- `docs/documentation.md`
- `docs/documentation.html`

## Table of Contents

- [What It Does](#what-it-does)
- [What's New in 1.0.4](#whats-new-in-104)
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

## What's New in 1.0.4

DocuMint 1.0.4 is focused on speed, cache reuse, and a cleaner premium generated-document experience.

**Headline:** super fast generation after the first run. The first generation builds full docs and cache; the second generation can reuse unchanged file docs, project overview data, and visual blueprint cache, so repeat runs are much faster.

### 1.0.4 Highlights

- Super fast generation flow: file documentation runs in parallel, with the default parallel request limit set to `15`.
- Smarter local CPU prep: DocuMint analyzes source structure, dependencies, symbols, imports, and prompt context locally before calling the provider.
- First run builds cache, second run is fast: unchanged docs, project overview, and visual blueprints can be reused instead of regenerated.
- Generation-aware cache safety: provider/model/depth/token/temperature/context-window/custom-endpoint changes invalidate AI-generated documentation cache instead of reusing stale output.
- Old cache wipe button: clear stale documentation and visual cache directly from the sidebar.
- Cleaner generated HTML: default dark theme, improved layout width, fixed right-side gap, and better dark-mode readability.
- Premium navigation: wider sidebar, VS Code-style project tree, folder/file icons, and `+` / `-` folder controls.
- Better project flow: HTML content follows the same order as the Project Tree.
- Visual upgrades: colored Module Scale Chart pie view, source-derived architecture map, editable diagram exports, whiteboard sketch, and interactive dependency graph.
- Cleaner output: empty "no data found" style sections are removed when useful data is not available.
- UI Storyboard removed from generated HTML so the output stays source-grounded and avoids fake-looking UI mockups.
- Better provider support: OpenAI, Anthropic, OpenRouter, DeepSeek, and custom OpenAI-compatible endpoints are supported.
- Updated defaults: OpenAI starts with `gpt-5.4-nano`; Anthropic fallback uses the active `claude-sonnet-5`; DeepSeek fallback uses `deepseek-flash`.
- Cleaner VSIX output: generated docs and README-only demo media are excluded from the packaged extension.

### Estimated 100-Page Website Generation Time

These are practical estimates, not fixed benchmarks. Actual time depends on provider speed, selected model, rate limits, project size, file changes, and network latency.

| Scenario | Before 1.0.4 | 1.0.4 first run | 1.0.4 second run with cache |
|---|---:|---:|---:|
| Standard documentation | 45-90 minutes | 10-25 minutes | 1-5 minutes |
| Comprehensive documentation | 2+ hours | 20-45 minutes | 2-8 minutes |

### Design Improvements

| Area | 1.0.4 improvement |
|---|---|
| Generated HTML | Default dark theme, cleaner spacing, stronger visual hierarchy |
| Sidebar | Wider premium panel with project-tree style navigation |
| Project Tree | Folder/file icons, better nesting, and `+` / `-` expand controls |
| Visual Blueprints | Source-derived architecture map, editable diagram exports, whiteboard sketch, and dependency graph |
| Module Scale Chart | Colored pie chart with clearer module scale comparison |
| Content Order | Documentation sections follow Project Tree order |
| Cache Control | Clear Cache button plus automatic invalidation when generation-affecting settings change |
| Output Cleanliness | Empty or low-value sections are hidden instead of shown as noise |

### Visual Preview

Interactive Dependency Graph:

![DocuMint Interactive Dependency Graph](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/s3.png)

Editable Diagram Export:

![DocuMint Editable Diagram Export](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/s4.png)

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

Both modes save normal DocuMint output into `docs/`.

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
- Workspace scans exclude `node_modules`, generated/build folders, `.git`, `docs`, test/spec files, lockfiles, `.env` files, logs, and other common non-source artifacts by default.
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
code --install-extension documint-1.0.4.vsix
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
7. Open generated files from `docs/`.

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

Generated output is written to a `docs/` directory in the workspace root:

- `documentation.md`
- `documentation.html`

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
|   |-- docGenerator.ts                 # Public AI generator facade + prompt-cache binding
|   |-- docGeneratorBase.ts             # AI orchestration + writing docs output
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
