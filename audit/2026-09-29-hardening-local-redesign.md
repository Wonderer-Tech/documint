# DocuMint Audit & Implementation Roadmap

**Repository:** `Wonderer-Tech/documint`  
**Baseline reviewed:** `main` at `10f59abf` / DocuMint `1.0.7`  
**Created:** 2026-09-29  
**Status:** Source of truth for the next implementation cycle

> Do not treat the redesign as a visual-only change. The first requirement is trustworthy source analysis. Every Markdown section, HTML visual, search result, dependency count, reading path, and file card must come from the same verified project model.

---

## 1. Goal

Make DocuMint answer the questions a developer actually asks, in this order:

1. What is this project?
2. How do I run/build/test it?
3. Where should I start reading?
4. Where is a particular responsibility implemented?
5. What does this file do?
6. What does it use and what uses it?
7. Which parts have the widest dependency reach?

The Local mode must remain:

- deterministic;
- source-grounded;
- provider-independent;
- usable without sending source code anywhere;
- fully functional without required network assets;
- explicit when a description or conclusion is unavailable instead of inventing one.

---

# 2. Locked implementation order

Do the work in this order. Do not jump directly to the prototype UI.

## Phase 0 — Make the repository safe to change

### 0.1 Fix normal CI

Current problem:

- `.github/workflows/ci.yml` runs only when `.github/ci-trigger` changes.
- Pull requests are not automatically tested.

Required change:

```yaml
on:
  workflow_dispatch:
  pull_request:
  push:
    branches:
      - main
```

Required checks:

- TypeScript typecheck;
- esbuild bundle;
- regression tests;
- later, targeted browser acceptance for the generated HTML.

### 0.2 Commit `package-lock.json` and use `npm ci`

Current problem:

- `package-lock.json` is ignored;
- workflows use `npm install`.

Required change:

- remove `package-lock.json` from `.gitignore`;
- generate and commit the lockfile;
- use `npm ci --no-audit --no-fund` in CI/release workflows.

### 0.3 Retire self-modifying repair/release workflows

Current problem:

- `navigation-repair.yml` and `reader-release.yml` run Python source-repair scripts;
- they can modify source and push directly to `main`;
- `contents: write` is granted to those jobs.

Required direction:

- move all already-shipped 1.0.6/1.0.7 repair logic into normal reviewed source code;
- remove the permanent source-repair workflow pattern;
- remove obsolete repair triggers/scripts after verifying their final changes are present in source;
- CI validates code; CI must not rewrite application source.

Do not delete these files blindly. First compare the scripts against current `main` and confirm no intended source change exists only inside a repair script.

---

# 3. Phase 1 — Fix analyzer correctness before adding new visuals

This is the highest-priority product change.

Current Local documentation and the prototype depend on source-analysis data. A polished visual based on incomplete imports/exports is worse than a plain accurate document.

## 3.1 Replace regex-only TS/JS structural analysis with the TypeScript Compiler API

Use `typescript` and `ts.createSourceFile` for:

- `.ts`
- `.tsx`
- `.mts`
- `.cts`
- `.js`
- `.jsx`
- `.mjs`
- `.cjs`

Keep existing non-TS/JS language analysis for now.

### Must correctly detect

#### Imports

- normal imports;
- multiline imports;
- side-effect imports;
- namespace imports;
- type-only imports;
- dynamic imports when statically resolvable;
- re-exports;
- wildcard re-exports.

Example that must work:

```ts
import {
  a,
  b,
} from "./x";
```

#### Declarations / exports

- function declarations;
- multiline function parameters;
- classes;
- `abstract class`;
- `export abstract class`;
- default exports;
- interfaces;
- types;
- enums;
- top-level constants/variables;
- exported arrow functions;
- class methods;
- re-exported symbols where deterministically available.

Example that must work:

```ts
export abstract class BaseAIProvider implements AIProvider {
}
```

### Must distinguish scope

Add structural scope information instead of treating every matching line as a project symbol.

Suggested model:

```ts
type SourceSymbolScope =
  | "module"
  | "class"
  | "function"
  | "unknown";
```

Default Local documentation should show:

- module-level functions;
- classes;
- methods;
- interfaces;
- types;
- enums;
- top-level constants;
- exported variables.

Default Local documentation should not list function-local temporary variables such as:

- `files`;
- `content`;
- `text`;
- `stat`;
- loop-local variables;
- callback-local temporaries.

Do not remove useful non-exported module-level APIs simply because they are not exported.

## 3.2 Add regression fixtures before changing the renderer

Tests must prove at least:

1. multiline TS import resolves to the correct internal dependency;
2. multiline import imported-symbol names are captured;
3. `export abstract class BaseAIProvider` is detected and exported;
4. multiline function declaration is detected;
5. local `const files = ...` inside a function is not surfaced as module API;
6. top-level non-exported constant can still be represented as module-level internal API;
7. line numbers are correct;
8. existing non-TS language tests keep passing;
9. source analyzer public facade remains the supported import boundary.

Add a self-regression assertion using the DocuMint source fixture if practical:

- `src/providers/aiProvider.ts` must contain exported `BaseAIProvider`.

## 3.3 Measure parser cost

After the AST implementation:

- run `npm test`;
- package the VSIX;
- record VSIX size before/after;
- measure a representative Local scan of DocuMint;
- avoid a large unexplained activation-time regression.

Correctness wins over a small size increase, but the cost must be measured.

---

# 4. Phase 2 — Add trustworthy descriptions and a canonical documentation model

Do not make Markdown and HTML independently re-derive project facts.

Create one canonical project-documentation model consumed by both renderers.

Suggested shape:

```ts
interface ProjectDocumentationModel {
  project: ProjectFacts;
  modules: ModuleDocumentation[];
  files: FileDocumentation[];
  dependencies: DependencyEdge[];
  entryPoints: string[];
  gettingStarted?: GettingStartedFacts;
  suggestedReadingPath: ReadingPathItem[];
  visuals: VisualModel;
}
```

Names can change, but the boundary should exist.

## 4.1 File descriptions

Do not use "first JSDoc in the file" blindly.

Description precedence should be:

1. explicit file/module header documentation;
2. `@file` / `@module` style documentation;
3. Python module docstring / Rust module doc / Go package comment where applicable;
4. description attached to the primary exported declaration, only when it can safely represent the file;
5. README project-structure description mapped to the exact file;
6. otherwise no description.

Every description must carry provenance:

```ts
description?: {
  text: string;
  source: "file-comment" | "declaration-comment" | "readme";
}
```

Local mode must not invent a sentence from filenames.

If no trusted description exists, show:

> No module-level description found.

This should also feed an optional "Undocumented files" list.

## 4.2 Structural module grouping

Stop grouping every `src/*` file into one `src` module.

Use a single shared structural module function everywhere.

Expected examples:

- `src/providers`
- `src/services`
- `src/scanner`
- `src/analyzer`
- `src/config`
- `src/views`
- direct `src/` files may remain `src`

Reuse the existing structural grouping idea already present in `localVisualBlueprint.ts`; do not maintain different module rules in project overview, architecture, and visuals.

---

# 5. Phase 3 — Rebuild Local Markdown for signal, not volume

Markdown must be a compact human document, not a transport layer for HTML visual JSON.

## 5.1 Remove raw visual payloads from Markdown

Remove these raw payload blocks from the human Markdown output:

- `architecture-blueprint` JSON;
- `excalidraw-blueprint` JSON;
- dependency-graph JSON.

Do not duplicate the same blueprint JSON multiple times.

Rich visual data should live in the HTML rendering model, not inside the Markdown document.

## 5.2 Keep Markdown visuals intentionally small

Markdown may include:

- one compact module-level Mermaid diagram;
- preferably fewer than about 15 module nodes;
- compact dependency/module tables when useful.

Do not include the entire file-level graph in Markdown by default.

The large interactive file graph belongs in HTML and should initially be collapsed or contextual.

## 5.3 Hide empty per-file sections

Current renderer always emits six per-file sections.

New rule:

- no content -> no heading;
- no placeholder line for routine empty sections.

Examples:

- no imports -> omit Imports;
- no project dependencies -> omit Uses;
- no dependents -> omit Used by;
- no TODO/FIXME/HACK -> omit that section;
- no internal symbols -> omit internal-symbol section.

## 5.4 Show Local provenance once

The "generated locally / no AI" message belongs once near the top of the document.

Do not repeat it for every file.

## 5.5 Use simple labels

Preferred Local labels:

- `Known Dependents` -> `Used by`
- `Internal Dependencies` -> `Uses`
- `Structurally Connected Files` -> `Core files` or `Highly connected files`
- `Other Detected Symbols` -> `Internal API` / `Internal symbols`

Do not call everything "Internal functions" because the set may contain types, interfaces, constants, and other declarations.

## 5.6 Normalize signatures

Do not use raw `line.substring(0, 180)` as the final signature.

AST-backed TS/JS signatures should:

- support multiline declarations;
- collapse whitespace;
- remove body-opening `{`;
- exclude implementation body;
- preserve meaningful type information;
- be deterministic.

---

# 6. Phase 4 — Add deterministic onboarding information

## 6.1 "Where is what"

Put a structural project map near the top.

Local mode can reliably show:

- structural folder/module path;
- file count;
- lines;
- primary/high-connectivity files;
- trusted description only when it came from README/module docs.

Do not synthesize a semantic folder description from filename keywords in strict Local mode.

AI mode may add a semantic one-line module summary separately.

## 6.2 "How to run"

Extract deterministic manifest facts.

For Node/VS Code projects:

- `package.json.scripts`;
- extension commands;
- extension settings;
- extension entry point.

Later detectors may add:

- Makefile targets;
- Docker commands;
- referenced environment variables;
- framework-specific routes.

Wording matters:

- say "Referenced environment variables", not "Required environment variables", unless requiredness is proven;
- routes need framework-specific detection before claiming they are application routes.

## 6.3 Suggested reading path

Generate a short, explicitly heuristic reading path based on:

- detected entry points;
- dependency distance from entry point;
- high-connectivity orchestration files;
- public facade files.

Call it:

> Suggested reading path

Do not present it as an objectively correct order.

Every item should have a factual reason, for example:

- Entry point.
- Imported directly by the entry point.
- Used by N project files.
- Public facade for the analyzer.
- Description from README/module comment.

---

# 7. Phase 5 — Production HTML redesign target

Use the interactive prototype as the UX target, not as code to paste wholesale.

The generated HTML should be question-first.

## 7.1 Big picture

Question:

> How do the parts fit together?

Visual:

- structural module/folder map;
- only a small number of module boxes;
- import/dependency edge counts;
- hover/focus isolates relevant connections;
- click filters the file/treemap view.

Use sketch styling for conceptual overview only.

### Important truthfulness rule

Module-level edge counts must include all relevant resolved edges.

Do not suppress hub-file edges and still label the resulting number as "all imports".

If high-degree hubs are hidden from a file-level graph, state that explicitly.

## 7.2 What's inside

Question:

> Where does the code live, and which files are large?

Visual:

- treemap;
- tile area based on source line count;
- module/folder grouping;
- click opens the file card;
- tooltips show source-backed facts only.

## 7.3 Start here

Question:

> I'm new. What should I read first?

Visual:

- 5-8 step suggested reading path;
- every step opens the file card;
- reason for each step is visible;
- wording remains "suggested" / heuristic.

## 7.4 Dependency reach

Question:

> Which files have the widest dependency reach?

Visual:

- x-axis: file length;
- y-axis: incoming project dependents;
- click opens the file card.

Avoid unsupported wording such as:

- "this file will break the most things";
- "this file should be split".

Safer descriptions:

- "used by many project files";
- "large file with low fan-in";
- "wide dependency reach".

## 7.5 File lookup and file card

This is a core daily-use surface.

Search should match:

- filename;
- full path;
- trusted file description;
- exported symbol names, if performance allows.

Support:

- Ctrl/Cmd+K;
- Arrow Up/Down;
- Enter;
- Escape;
- accessible combobox/listbox semantics.

File card should show:

- path;
- lines;
- trusted description + provenance;
- Uses;
- Used by;
- public/module API;
- source line numbers;
- optional TODO/FIXME/HACK;
- links to related files.

Clicking a relation should stay inside the documentation and open the related file card.

---

# 8. Phase 6 — Keep Local HTML genuinely offline

The production Local HTML must not require remote assets.

Current generated HTML has CDN dependencies, and the redesign prototype still uses Google Fonts even though rough.js itself is inline.

Required:

- remove Google Fonts from the generated Local HTML;
- remove cdnjs highlight.js/Mermaid dependency, or bundle/vendor the required assets locally;
- prefer self-contained/static assets shipped with the extension or generated report;
- keep offline browser acceptance with external requests blocked.

If rough.js is retained:

- vendor/pin the exact version;
- include it locally/inlined;
- record its license in NOTICE/package policy as required.

---

# 9. Rules for automatic handwritten notes

Handwritten notes are allowed only when the underlying fact is mechanically supported.

Good examples:

- `start here` on a detected entry-point module;
- `used by 18 files`;
- `contains external HTTP calls`, when HTTP calls are statically detected;
- `largest file in this module`.

Avoid absolute semantic claims unless proven.

Do not automatically emit:

- "the only place that calls the internet";
- "everything passes through here";
- "this will break the most things";
- "good to split up".

Those may be useful human/AI interpretations, but they are not strict Local facts.

---

# 10. Source links

Never hard-code the DocuMint GitHub repository into the generic renderer.

Canonical model should retain:

- workspace-relative source path;
- source line.

Optionally detect:

- remote repository URL;
- commit SHA.

If a Git remote and commit SHA are available, HTML/Markdown may provide stable repository permalinks.

If no remote exists:

- keep the file path and line number;
- do not generate a broken public URL;
- extension-owned UI can later provide an Open in Editor action.

Do not embed machine-specific absolute local paths in shareable documentation.

---

# 11. Release acceptance criteria

A redesign is not complete because it looks good.

## 11.1 Correctness gates

For the DocuMint source itself:

- multiline TS imports are resolved;
- `BaseAIProvider` appears as exported API;
- function-local temporary variables do not pollute Local API docs;
- module totals use the shared structural grouping;
- every displayed dependency count is reproducible from the canonical dependency model;
- descriptions always include source/provenance internally.

## 11.2 Markdown gates

- no raw architecture/excalidraw/dependency JSON blocks;
- no repeated per-file Local banner;
- no routine empty section placeholders;
- no function-local symbol flood;
- module grouping is useful beyond just `src`;
- Markdown remains useful directly on GitHub without the HTML viewer.

Do not lock success to an arbitrary 2,000-line maximum. Record the before/after line count, but prioritize useful information density.

## 11.3 HTML gates

With network requests blocked:

- report opens;
- all primary sections render;
- Big picture interaction works;
- treemap works;
- reading path works;
- scatter/dependency-reach view works;
- file lookup works;
- relation navigation works;
- theme works;
- mobile layout remains usable;
- keyboard controls work.

## 11.4 30-second human test

Give the generated docs to someone unfamiliar with DocuMint.

They should answer each within about 30 seconds:

1. Where is the API key stored?
2. Where would I add a new AI provider?
3. How do I build/test the project?

For the current repository, the expected discovery paths are roughly:

- API key -> `src/config/secretStorage.ts`
- provider integration -> `src/providers/providerFactory.ts` and provider files
- build/test -> `package.json` scripts

This is a usability acceptance test, not a substitute for automated tests.

---

# 12. Phase 7 — Repository/release cleanup after the redesign is stable

After the main implementation is stable:

- replace committed VSIX artifacts with tag-based GitHub Release assets;
- stop force-adding `*.vsix`;
- remove obsolete committed release binaries from the current tree;
- optionally decide separately whether old binary history is worth rewriting;
- update README to current version only;
- move historical release details to CHANGELOG;
- fix README badge/version/install-command drift;
- add nonce-based CSP to the VS Code sidebar webview;
- add ESLint/Prettier;
- remove unnecessary `@types/marked`;
- simplify obsolete activation events;
- add CONTRIBUTING.md / SECURITY.md / issue templates;
- consider Ollama and LM Studio as explicit local-provider presets;
- consider VS Code extension-host E2E tests.

---

# 13. Files expected to change first

First analyzer slice:

- `src/analyzer/sourceAnalyzerBase.ts`
- `src/analyzer/sourceAnalyzer.ts`
- new TS/JS AST analyzer module(s), if splitting keeps the facade clean
- analyzer regression tests
- `test/all.test.ts` only if the aggregate importer requires an explicit import

Second data-model/renderer slice:

- `src/services/localFileDocumentation.ts`
- `src/services/localProjectDocumentation.ts`
- `src/services/localArchitectureDocumentation.ts`
- `src/services/localVisualBlueprint.ts`
- `src/services/localDocumentationDocument.ts`
- shared structural-module utility
- canonical documentation model modules
- Local documentation tests

HTML redesign slice:

- split current `htmlTemplate.ts` further;
- keep reader/search/navigation concerns modular;
- add dedicated data/visual renderer modules instead of growing one giant template;
- browser acceptance fixtures/tests.

---

# 14. Things we explicitly do NOT do first

Do not start with:

- copying the prototype HTML wholesale into `htmlTemplate.ts`;
- adding dagre/ELK before the underlying dependency model is correct;
- adding more charts to the current Markdown;
- AI-generated summaries in Local mode;
- filename-keyword semantic guesses;
- hard-coded DocuMint-specific folder names/positions;
- hard-coded GitHub URLs;
- arbitrary "risk" or "refactor" judgments from file size alone.

---

# 15. First implementation slice

When implementation starts, the first product slice after repository safety work is:

## "TS/JS analyzer correctness"

Deliver together:

1. AST-based TS/JS import extraction;
2. AST-based TS/JS export/symbol extraction;
3. scope-aware symbol classification;
4. multiline declaration support;
5. `export abstract class` support;
6. regression tests;
7. self-check that `BaseAIProvider` is detected;
8. before/after fixture metrics;
9. no renderer redesign yet.

Only after this slice is green do we build the new documentation model and UI.

---

# 16. Reference prototype observations

**Stored reference:** [`audit/reference/documint-code-map-redesign-prototype.html`](./reference/documint-code-map-redesign-prototype.html)

This file is the preserved Claude redesign prototype used during the audit. Treat it as a UX/interaction reference, not as production-ready source. The constraints and corrections in this roadmap take precedence over prototype-specific hard-coding.

The reviewed redesign prototype demonstrates these useful interaction patterns:

- question-first sections;
- module sketch;
- treemap by file lines;
- suggested reading path;
- dependency-reach scatter;
- searchable file cards;
- Uses / Used by relationship view;
- source-backed descriptions with provenance;
- keyboard search;
- cross-visual navigation.

Production implementation must keep the interaction principles while removing prototype-specific assumptions:

- hard-coded seven modules;
- hand-positioned boxes;
- manually written reading-path reasons;
- hard-coded GitHub repository URL;
- Google Fonts network dependency;
- absolute claims such as "the only place that calls the internet";
- hub-edge suppression that makes aggregate counts incomplete.

---

# 17. Definition of done for this roadmap

This roadmap is complete only when:

- repository safety net is normal CI, not trigger-file CI;
- Local TS/JS analysis is AST-backed and scope-aware;
- one canonical documentation model feeds Markdown and HTML;
- Markdown is compact and human-readable;
- HTML is question-first and interactive;
- Local HTML works without required external network assets;
- all displayed facts are traceable to source or explicitly marked as heuristic;
- DocuMint can document its own source in a way a new developer can navigate quickly.
