# DocuMint — Code Documentation Generator for VS Code

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.110.0-blue)
![Version](https://img.shields.io/badge/version-1.0.10-green)
![Marketplace installs](https://img.shields.io/badge/Marketplace%20installs-400%2B-brightgreen)

**Understand a codebase without reading every file first.**

DocuMint turns a VS Code workspace, folder, or file into navigable Markdown and HTML documentation. Use **Local Documentation — No AI** for deterministic, source-grounded docs that stay on your machine, or switch to AI mode when you want provider-enhanced explanations.

**🎉 400+ downloads and counting.** Thank you to everyone who has tried DocuMint and helped shape it.

> **1.0.10 release:** the full 1.0.8 Local Project Map upgrade plus the final browser-navigation/release fixes and the corrected first-activation review-prompt behavior.

DocuMint writes generated documentation to:

- `documint/documentation.md`
- `documint/documentation.html`

## Table of Contents

- [What's New in 1.0.10](#whats-new-in-1010)
- [1.0.7 vs 1.0.10](#107-vs-1010)
- [See 1.0.10 in Action](#see-1010-in-action)
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

## What's New in 1.0.10

1.0.10 is the corrected Marketplace build containing the full Local Documentation upgrade plus the final first-activation review-prompt fixes that landed after v1.0.9 had already been released.

Instead of giving you a long generated document and asking you to figure out where to begin, DocuMint now answers the questions developers usually ask when they open an unfamiliar repository.

### The highlights

- **Question-first Local Project Map** — jump between *At a glance*, *Big picture*, *Runtime flow*, *How to run*, *Project interfaces*, *Data model*, *Security boundaries*, *Failure paths*, *What's inside*, *Start here*, *Dependency reach*, *Verification*, and file lookup.
- **A much clearer Big Picture** — structural modules are laid out as a dependency map with Major/All link modes, zoom, pan, semantic detail levels, connection counts, and suggested starting files.
- **Better source analysis** — TypeScript/JavaScript-family files use the TypeScript compiler AST for multiline imports/declarations, exports, methods, module scope, environment references, and more reliable dependency evidence.
- **Data model discovery** — direct Prisma, SQL, GraphQL, OpenAPI, Mongoose, and Drizzle declarations can appear automatically when they exist.
- **Security boundaries** — DocuMint can surface direct evidence such as secret-storage usage, credential-like environment references, security policy/header names, and imported authentication libraries without exposing values.
- **Failure paths** — explicit static throw/error-report messages and recovery-related symbols are easier to find without pretending static analysis knows the full runtime path.
- **Runtime, interfaces, and verification** — entry-point dependency flow, exposed project interfaces, package/Make checks, Docker facts, VS Code commands/settings, and environment references are brought together where they are useful.
- **A softer generated UI** — the paper-grid visual system now has restrained Jelly-style depth, light/dark support, smoother interactions, and reduced-motion-aware transitions.
- **Local AI runtimes** — Ollama and LM Studio are first-class presets with local model discovery and no API key requirement.
- **Cleaner privacy boundaries** — Local Documentation remains provider-independent and self-contained; generated Local HTML does not require CDN assets.
- **Review & feedback flow** — DocuMint can show one review prompt on first activation, then no more than once every seven days when postponed; Marketplace review, GitHub improvement feedback, and explicit opt-out remain separate actions.
- **Release hardening** — locked installs, browser acceptance, self-audit, CSP/network hardening, and reproducible release-readiness checks are now part of the release path.

## 1.0.7 vs 1.0.10

| Area | 1.0.7 | 1.0.10 |
| --- | --- | --- |
| Main focus | Folder-first reader navigation | Codebase understanding + reader navigation |
| Local HTML | Navigable generated documentation | Question-first interactive project map |
| Architecture | Reader-oriented navigation around generated docs | Canonical **Big Picture** module map with Major/All links, zoom and pan |
| Source analysis | Existing cross-language static analysis | Stronger AST-backed TS/JS analysis and cleaner source facts |
| Data model | No dedicated project-level surface | Conditional Prisma / SQL / GraphQL / OpenAPI / Mongoose / Drizzle view |
| Security | General documentation/security hardening | Conditional **Security boundaries** orientation surface |
| Errors & recovery | Mainly available inside file documentation | Project-level **Failure paths** with source locations |
| Onboarding | Reader tree + search | **At a glance**, **Start here**, **How to run**, runtime flow, interfaces and verification |
| Project scale | File navigation and existing charts | Treemap + dependency-reach scatter + architecture insights |
| Local AI providers | Cloud/custom provider flow | Adds first-class **Ollama** and **LM Studio** presets |
| Generated UI | Reader navigation polish | Paper-grid + restrained Jelly softness + soft transitions |
| Feedback | No dedicated cadence | Marketplace review / GitHub improvement feedback with cooldown and opt-out |

## See 1.0.10 in Action

These screenshots are generated from DocuMint's own source tree, so the views below show the product documenting itself.

### At a glance — understand the repository before opening files

Counts, languages, entry points, dependencies, documentation coverage, symbols, exports, and more are grouped into one readable starting point.

![DocuMint 1.0.10 At a glance](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/Screenshot%20From%202026-10-01%2012-18-49.png)

### Big picture — see how modules connect

The module graph shows structural relationships without turning the page into an unreadable arrow wall. You can switch connection density and zoom into more detail in the generated report.

![DocuMint 1.0.10 Big picture](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/Screenshot%20From%202026-10-01%2012-19-21.png)

### What's inside — spot where the code actually lives

The treemap makes repository size and module/file distribution visual, so large files and dense areas stand out immediately.

![DocuMint 1.0.10 What's inside](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/Screenshot%20From%202026-10-01%2012-20-05.png)

### Start here — get a practical reading order

DocuMint uses detected entry points and resolved dependencies to suggest a source-backed place to begin reading. It is guidance, not an invented claim about the only correct order.

![DocuMint 1.0.10 Start here](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/Screenshot%20From%202026-10-01%2012-20-27.png)

### Dependency reach — find widely used files

The dependency-reach view helps you see which files are depended on by more of the project and how that relates to source size.

![DocuMint 1.0.10 Dependency reach](https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/Screenshot%20From%202026-10-01%2012-20-38.png)

## How It Works

DocuMint always starts by scanning the selected Workspace, Folder, or File and extracting source facts such as imports, exports, symbols, entry points, TODO/FIXME/HACK comments, environment references, and resolved project dependencies.

From there you choose one of two paths:

### Local Documentation — No AI

Use this when privacy, determinism, or zero-provider setup matters.

- No API key required.
- No AI provider is called.
- No source code is sent anywhere.
- Project/file documentation is built from scanner and analyzer evidence.
- Markdown and HTML use the same canonical Local model.
- A separate source/output fingerprint cache safely reuses unchanged Local output.
- Local HTML is self-contained and does not require external CDN assets.

### AI Documentation

Use this when you want source-grounded explanations beyond what deterministic static analysis can establish.

- Choose OpenAI, Anthropic, OpenRouter, DeepSeek, Ollama, LM Studio, or a custom OpenAI-compatible endpoint.
- Cloud source transfer requires confirmation.
- Ollama and LM Studio stay on loopback and require no API key.
- Provider/model/settings-aware caching avoids unnecessary regeneration.
- Generated output is validated and sanitized before it is written.

Both modes save their rendered documentation under `documint/`.

## Local Project Map

The Local Project Map is designed around real developer questions rather than a fixed list of generic documentation sections:

- **At a glance** — What is this project made of?
- **Big picture** — How do the parts fit together?
- **Runtime flow** — From an entry point, what project code comes next?
- **How to run** — How do I build, test, or start this project?
- **Project interfaces** — Where can people or external systems interact with it?
- **Data model** — What structured data shapes are directly declared?
- **Security boundaries** — Where does the source handle security-sensitive inputs or policies?
- **Failure paths** — What failures does the source explicitly signal?
- **What's inside** — Where does the code live, and which files are large?
- **Start here** — I'm new. What should I read first?
- **Dependency reach** — Which files are used by the most project files?
- **Verification** — What checks does the project already provide?
- **Look up a file** — What does this file do, and who uses it?

The project map stays conservative: when a fact is not supported by source evidence, DocuMint does not invent one.

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
- Prisma schema (`.prisma`)
- GraphQL schema (`.graphql`, `.gql`)

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
npm ci --no-audit --no-fund
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

### Review & Feedback Prompt

On the first DocuMint activation after install, DocuMint may show one native VS Code review prompt: **“If you love DocuMint and it genuinely helps your work, please review us on the Marketplace.”** If dismissed or postponed, it can appear again no more than once every 7 days. A successful generation can also surface the prompt when that seven-day window is due. **Review on Marketplace** opens DocuMint's Marketplace review section directly with no intermediate DocuMint page. **Tell us what to improve** opens a prefilled GitHub feedback issue directly. Choosing either review/feedback action or **Don't ask again** stops future prompts. The cadence is stored in VS Code extension global state; DocuMint does not send feedback automatically.

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

Normal development loop:

```bash
npm ci --no-audit --no-fund
npm run check
```

`npm run check` runs TypeScript type checking plus the fast unit/regression suite. It does not launch a browser, run the Local self-audit, package a VSIX, or require Python/Playwright.

Use the heavier commands only when they are relevant:

```bash
npm run watch
npm run compile
npm run audit:self
npm run verify
npm run release:readiness
```

`npm run release:readiness` is a **release-candidate gate**, not a normal edit-loop command. It is the only canonical command that chains verification, browser acceptance, VSIX packaging, archive validation, and release evidence.

Self-audit:

`npm run audit:self` documents DocuMint's own `src/` plus `package.json` and checks release-critical Local Documentation invariants such as AST export detection, compact Markdown, Local code-map presence, run scripts, and Local HTML CDN independence.

`npm run verify` runs the regression suite and then the self-audit.

### Browser acceptance

Browser acceptance is for Local HTML/browser changes and final release validation; it is not required for ordinary extension development or for end users installing the VSIX.

Install Python Playwright once on a development/release machine when browser acceptance is needed. A virtual environment is recommended:

```bash
python3 -m venv ~/.venvs/documint-browser
~/.venvs/documint-browser/bin/python -m pip install playwright
export DOCUMINT_PYTHON="$HOME/.venvs/documint-browser/bin/python"
```

Browser scripts use `tools/run-python.mjs`, which selects an available Python 3 runtime (`python3`, `python`, or Windows `py -3`). Set `DOCUMINT_PYTHON=/custom/python` to force a specific interpreter.

If Chrome/Chromium is already installed locally, reuse it instead of downloading Playwright's bundled browser:

```bash
export CHROMIUM_EXECUTABLE="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser)"
```

If no local Chrome/Chromium executable is available, install Playwright Chromium instead:

```bash
"$DOCUMINT_PYTHON" -m playwright install chromium
```

Then run the provider-free generated-HTML acceptance command:

```bash
npm run test:browser
```

The suite verifies navigation, reader controls, Local code-map interactions, responsive behavior, offline/external-request isolation, and AI-format chart failure isolation.

When dependency registry access is available, `npm run lockfile:generate` creates/refreshes `package-lock.json` without running package scripts. `npm run lockfile:validate` then checks the lockfile's root package identity and dependency maps against `package.json`.

If the local machine cannot reach the npm registry, run the manual **Lockfile Bootstrap** GitHub Actions workflow. It generates and validates `package-lock.json` on a network-enabled runner and uploads the lockfile plus SHA-256/metadata as an artifact without committing or pushing to the repository. Its default `run_readiness=true` input also runs the complete verify → browser acceptance → VSIX packaging/evidence gate against that transient lockfile, so the branch can be fully tested before the lockfile is committed.

With GitHub CLI installed/authenticated, the workflow can be dispatched from the current branch without opening the Actions UI:

```bash
gh auth login
npm run lockfile:bootstrap
```

Optional overrides: `DOCUMINT_BOOTSTRAP_REF=<branch>` and `DOCUMINT_BOOTSTRAP_REPO=owner/repo`.

After downloading and extracting the lockfile artifact, adopt it safely from the repository root:

```bash
npm run lockfile:adopt -- /path/to/extracted/documint-package-lock-artifact
```

The adopter uses the same shared lockfile policy as `lockfile:validate`; it validates the candidate before touching the root lockfile, verifies the Bootstrap artifact's `package-lock.sha256` when that metadata is present, replaces via a temporary file, and re-verifies the adopted SHA-256. Passing the artifact directory or its `package-lock.json` file is supported.

### Release readiness

Run this only for a release candidate, not after every source edit.

After the lockfile is committed, Python Playwright is installed, and either `CHROMIUM_EXECUTABLE` points to a local Chrome/Chromium binary or Playwright Chromium is installed, run the complete release gate with one command:

```bash
npm run release:readiness
```

It requires the local locked `@vscode/vsce` binary and does not download packaging tools at runtime. The command runs `npm run verify`, the full browser acceptance suite, packages `release-artifacts/documint-<version>.vsix`, checks the archive, and writes machine-readable evidence to `release-artifacts/readiness/readiness.json`. The evidence includes verify/browser/package timings, Local self-audit timing/report, bundle and VSIX sizes, VSIX SHA-256, and browser-result summaries.

To record a size delta against an older VSIX:

```bash
DOCUMINT_BASELINE_VSIX=/path/to/previous.vsix npm run release:readiness
```

The tag-release workflow uses this same readiness command before publishing the GitHub Release asset. After `package-lock.json` is committed, the manual **Release Readiness** GitHub Actions workflow can run the same gate on demand without enabling automatic main-push CI.

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
