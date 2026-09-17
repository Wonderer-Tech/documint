# DocuMint - Code Documentation Generator for VS Code

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.110.0-blue)
![Version](https://img.shields.io/badge/version-1.0.4-green)

DocuMint is a VS Code extension that generates code documentation for an entire workspace, a selected folder, or a selected file using providers such as OpenAI, Anthropic, OpenRouter, DeepSeek, or a custom OpenAI-compatible endpoint.

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

DocuMint scans source files, sends code to the configured provider, and builds project-level documentation with:

- Project overview and stats
- Per-file documentation sections
- Detected imports, exports, symbols, and project links
- Quality notes when generated docs miss detected source facts
- Markdown and/or HTML output
- HTML table of contents with navigation and search
- Mermaid diagram rendering support in generated HTML

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

1. Resolve provider and model from sidebar payload or VS Code settings.
2. Verify that cached AI documentation was generated with compatible provider/model/generation settings; reset that cache when those settings materially change.
3. Scan workspace files through `WorkspaceScanner`.
4. Optionally narrow generation directly to a selected file/folder path.
5. Analyze source files for imports, exports, symbols, TODOs, and internal links.
6. Build a project map and file-level context from verified source facts.
7. Prepare local CPU context for each file, including dependency graph links, symbols, imports, and prompt inputs.
8. Generate detailed file documentation in parallel via the selected provider.
9. Validate generated docs against detected symbols.
10. Save output into `docs/` as Markdown, HTML, or both.

Public generation facade: `src/services/docGenerator.ts`. The orchestration implementation lives in `src/services/docGeneratorBase.ts`, with the facade binding runtime cache semantics to the canonical generation identity.

## Supported Providers

Configured using `aiDocGenerator.aiProvider`:

- `openai`
- `anthropic` — current fallback model: `claude-sonnet-5`
- `openrouter`
- `deepseek` — current fallback model: `deepseek-flash`
- `custom`

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
3. Select provider and model.
4. Run **Configure API Key** if using a cloud provider.
5. Click **Generate Documentation** for workspace scope, or use **File** / **Folder** quick buttons.
6. Open generated files from `docs/`.

## Commands

Contributed commands:

- `aiDocGenerator.generateDocumentation` - Generate documentation
- `aiDocGenerator.cancelGeneration` - Cancel generation
- `aiDocGenerator.configureApiKey` - Configure API key
- `aiDocGenerator.clearCache` - Clear documentation, visual, and generation-settings cache markers

Internal scope commands used by sidebar:

- `aiDocGenerator.pickAndGenerateFile`
- `aiDocGenerator.pickAndGenerateFolder`

## Configuration

All settings are under `aiDocGenerator`.

### Key Settings

- `aiDocGenerator.aiProvider` (`openai` by default)
- `aiDocGenerator.model` (`gpt-5.4-nano` by default)
- `aiDocGenerator.documentationDepth` (`simple | basic | standard | comprehensive`)
- `aiDocGenerator.outputFormat` (`markdown | html | both`)
- `aiDocGenerator.targetLanguages` (all listed supported scanner languages by default)
- `aiDocGenerator.maxTokens`
- `aiDocGenerator.temperature`
- `aiDocGenerator.rateLimitDelay`
- `aiDocGenerator.concurrentRequests`
- `aiDocGenerator.excludePatterns`
- `aiDocGenerator.customApiEndpoint`

### Example `settings.json`

```json
{
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
  "aiDocGenerator.aiProvider": "anthropic",
  "aiDocGenerator.model": "claude-sonnet-5"
}
```

DeepSeek example:

```json
{
  "aiDocGenerator.aiProvider": "deepseek",
  "aiDocGenerator.model": "deepseek-flash"
}
```

Custom endpoint example:

```json
{
  "aiDocGenerator.aiProvider": "custom",
  "aiDocGenerator.model": "your-model-name",
  "aiDocGenerator.customApiEndpoint": "https://api.example.com/v1/chat/completions"
}
```

## Documentation Modes

Use `aiDocGenerator.documentationDepth` to control how detailed the generated documentation should be.

| Mode | Best For | What It Generates |
|------|----------|-------------------|
| `simple` | Fast plain-English understanding | Short purpose, key capabilities, and input/output summary for each file. |
| `basic` | Lightweight developer reference | Module metadata, overview, exported API reference, quick start, and related modules. |
| `standard` | Default production documentation | Full API reference, dependencies, usage examples, side effects, errors, configuration, security, concurrency, and testing notes when source evidence exists. |
| `comprehensive` | Detailed enterprise documentation | Architecture/design notes, module boundaries, exhaustive API reference, data flow, configuration, errors/recovery, security, limitations, TODO/FIXME inventory, and performance/resource notes when source evidence exists. |

Notes:

- Project tree, source-derived architecture visuals, whiteboard-style diagrams, and interactive dependency graphs are available in generated HTML output across all modes.
- `simple`, `basic`, and `standard` can batch small files for faster generation.
- `comprehensive` can batch small files, but large files are not truncated. They are generated as full single-file requests, and files that exceed the provider context window are split into chunks before the output is merged.

## Output

Generated output is written to a `docs/` directory in the workspace root:

- `documentation.md`
- `documentation.html`

The HTML renderer includes:

- Sidebar TOC
- Route-based folder/file navigation
- Section anchors
- Search
- Theme toggle
- Syntax highlighting
- Mermaid rendering
- Project tree
- Architecture blueprint
- Draw.io export for Mermaid diagrams
- D2 source export
- Excalidraw-style whiteboard diagram
- Interactive dependency graph
- Copy-to-clipboard for code blocks

## Project Structure

```text
src/
|-- analyzer/
|   |-- sourceAnalyzer.ts          # Public analyzer facade + modern module compatibility
|   `-- sourceAnalyzerBase.ts      # Core cross-language import/export/symbol analysis
|-- extension.ts                   # Public VS Code activation entry point
|-- extensionBase.ts               # Activation, commands, and canonical custom-endpoint validation/consent
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
|   |-- openaiProvider.ts
|   |-- anthropicProvider.ts
|   |-- openrouterProvider.ts
|   |-- deepseekProvider.ts
|   `-- customProvider.ts
|-- services/
|   |-- docGenerator.ts            # Public generator facade + canonical prompt-cache binding
|   |-- docGeneratorBase.ts        # Core orchestration + writing docs output
|   |-- generationCacheIdentity.ts # Canonical generation/cache identity versions
|   |-- generationCachePolicy.ts   # Invalidates AI-doc cache on material generation changes
|   |-- documentationValidator.ts  # Checks generated docs against source facts
|   |-- outputSanitizer.ts         # Removes unsafe/non-source-grounded output sections
|   |-- htmlTemplate.ts            # Full HTML document template
|   `-- modelMetadataService.ts    # Context window metadata fetch/cache
`-- views/
    `-- sidebarProvider.ts         # Sidebar UI webview and state sync
```

The `*Base.ts` modules are implementation details. Runtime code should import the public facade modules (`extension.ts`, `analyzer/sourceAnalyzer.ts`, and `services/docGenerator.ts`) so endpoint, dependency-resolution, and cache-version policies cannot be bypassed.

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

- Static analysis is intentionally lightweight. It improves accuracy, but it is not a full compiler for every language.
- Documentation quality still depends on the selected model and the source code that is available in the workspace.
- Cloud providers receive selected source code after confirmation. Use a localhost custom endpoint when code must stay local.
- `aiDocGenerator.concurrentRequests` defaults to `15` for faster generation. Lower it in settings if your cloud provider rate-limits requests.

## Contributing

Issues and PRs are welcome.

- Repository: https://github.com/Wonderer-Tech/documint
- Issues: https://github.com/Wonderer-Tech/documint/issues

## License

MIT. See [LICENSE](LICENSE).
