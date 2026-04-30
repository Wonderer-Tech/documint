# DocuMint - AI Code Documentation Generator for VS Code

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.110.0-blue)
![Version](https://img.shields.io/badge/version-0.1.0-green)

DocuMint is a VS Code extension that generates code documentation for an entire workspace, a selected folder, or a selected file using AI providers such as OpenAI, Anthropic, OpenRouter, Ollama, LM Studio, or a custom OpenAI-compatible endpoint.

It produces:
- `docs/documentation.md`
- `docs/documentation.html`

## Table of Contents

- [What It Does](#what-it-does)
- [How It Works](#how-it-works)
- [Supported Providers](#supported-providers)
- [Supported Languages](#supported-languages)
- [Install](#install)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Output](#output)
- [Project Structure](#project-structure)
- [Development](#development)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

## What It Does

DocuMint scans source files, sends code to the configured AI provider, and builds project-level documentation with:
- Project overview and stats
- Per-file documentation sections
- Markdown and/or HTML output
- HTML table of contents with navigation and search
- Mermaid diagram rendering support in generated HTML

The extension runs directly inside VS Code through a sidebar webview.

## How It Works

1. Resolve provider and model from sidebar payload or VS Code settings.
2. Scan workspace files through `WorkspaceScanner`.
3. Optionally narrow generation to selected file/folder path.
4. Build a project summary prompt from file manifests.
5. Generate documentation file-by-file via the selected provider.
6. Save output into `docs/` as Markdown, HTML, or both.

Core pipeline entry point: `src/services/docGenerator.ts`.

## Supported Providers

Configured using `aiDocGenerator.aiProvider`:
- `openai`
- `anthropic`
- `openrouter`
- `custom`
- `ollama`
- `lmstudio`

Provider implementations live in `src/providers/`.

## Supported Languages

Current workspace scanner patterns include:
- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- Python (`.py`)
- Java (`.java`)
- Go (`.go`)
- Rust (`.rs`)
- Ruby (`.rb`)

Notes:
- Single-file picker UI allows additional extensions, but workspace scanning currently documents the language set above.
- Exclusions include `node_modules`, `dist`, `build`, `.git`, `docs`, test/spec files, lockfiles, and other common non-source artifacts.

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
code --install-extension documint-0.1.0.vsix
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

Internal scope commands used by sidebar:
- `aiDocGenerator.pickAndGenerateFile`
- `aiDocGenerator.pickAndGenerateFolder`

## Configuration

All settings are under `aiDocGenerator`.

### Key Settings

- `aiDocGenerator.aiProvider` (`openai` by default)
- `aiDocGenerator.model` (`gpt-4` by default)
- `aiDocGenerator.documentationDepth` (`simple | basic | standard | comprehensive`)
- `aiDocGenerator.outputFormat` (`markdown | html | both`)
- `aiDocGenerator.targetLanguages` (language hint list)
- `aiDocGenerator.maxTokens`
- `aiDocGenerator.temperature`
- `aiDocGenerator.rateLimitDelay`
- `aiDocGenerator.excludePatterns`
- `aiDocGenerator.customApiEndpoint`
- `aiDocGenerator.localModelUrl`
- `aiDocGenerator.localModelName`
- `aiDocGenerator.localModelTimeout`
- `aiDocGenerator.generateUmlDiagrams`
- `aiDocGenerator.enableDiffTracking`

### Example `settings.json`

```json
{
  "aiDocGenerator.aiProvider": "openai",
  "aiDocGenerator.model": "gpt-4o-mini",
  "aiDocGenerator.documentationDepth": "standard",
  "aiDocGenerator.outputFormat": "both",
  "aiDocGenerator.maxTokens": 4000,
  "aiDocGenerator.temperature": 0.3,
  "aiDocGenerator.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**"
  ],
  "aiDocGenerator.localModelUrl": "http://localhost:11434",
  "aiDocGenerator.localModelTimeout": 60000,
  "aiDocGenerator.generateUmlDiagrams": true,
  "aiDocGenerator.enableDiffTracking": true
}
```

## Output

Generated output is written to a `docs/` directory in the workspace root:
- `documentation.md`
- `documentation.html`

The HTML renderer includes:
- Sidebar TOC
- Section anchors
- Search
- Theme toggle
- Syntax highlighting
- Mermaid rendering
- Copy-to-clipboard for code blocks

## Project Structure

```text
src/
|-- extension.ts                  # Activation and command wiring
|-- types.ts                      # Shared types and error models
|-- config/
|   |-- secretStorage.ts          # VS Code secret storage wrapper
|   `-- apiKeyConfiguration.ts    # API key configuration helper
|-- scanner/
|   `-- workspaceScanner.ts       # Workspace file discovery and filtering
|-- providers/
|   |-- aiProvider.ts             # Base provider and prompt/chunking pipeline
|   |-- providerFactory.ts        # Provider resolution and creation
|   |-- openaiProvider.ts
|   |-- anthropicProvider.ts
|   |-- openrouterProvider.ts
|   |-- ollamaProvider.ts
|   |-- lmstudioProvider.ts
|   `-- customProvider.ts
|-- services/
|   |-- docGenerator.ts           # Orchestration + writing docs output
|   |-- htmlTemplate.ts           # Full HTML document template
|   `-- modelMetadataService.ts   # Context window metadata fetch/cache
`-- views/
    `-- sidebarProvider.ts        # Sidebar UI webview and state sync
```

## Development

### Prerequisites

- Node.js 18+
- npm 9+
- VS Code 1.110.0+

### Commands

```bash
npm install
npm run compile
npm run watch
npm test
```

Package extension:

```bash
npx @vscode/vsce package
```

## Known Limitations

- The scanner currently includes a fixed set of language globs (see [Supported Languages](#supported-languages)).
- `npm test` points to `./out/test/runTest.js`; test harness files may need setup depending on your local branch state.
- API key setup command currently defaults to `openai` when invoked without provider context.

## Contributing

Issues and PRs are welcome.

- Repository: https://github.com/Wonderer-Tech/documint
- Issues: https://github.com/Wonderer-Tech/documint/issues

## License

MIT. See [LICENSE](LICENSE).