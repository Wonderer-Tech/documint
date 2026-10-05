# DocuMint Audit & Implementation Roadmap

**Repository:** `Wonderer-Tech/documint`  
**Baseline reviewed:** `main` at `10f59abf` / DocuMint `1.0.7`  
**Created:** 2026-09-29  
**Status:** Source of truth for the next implementation cycle

> Do not treat the redesign as a visual-only change. The first requirement is trustworthy source analysis. Every Markdown section, HTML visual, search result, dependency count, reading path, and file card must come from the same verified project model.

---

## Implementation status

_Last updated: 2026-10-01_

- ✅ Retired obsolete source-repair workflows/scripts and the old VSIX self-commit workflow.
- ✅ Current tree sanity check confirms obsolete repair/VSIX workflow artifacts and committed VSIX binaries are absent.
- ✅ Added a tag-only GitHub Release workflow for future VSIX assets; current source tree no longer carries committed VSIX binaries.
- ✅ Tag releases require `package-lock.json`, install with `npm ci`, run `npm run verify`, run full Chromium browser acceptance, retain browser evidence, and only then package/publish the VSIX.
- ✅ Pull requests now run CI automatically. Main-branch push CI remains intentionally trigger-file gated so the current implementation work does not auto-run CI.
- ✅ `package-lock.json` is committed and validated. Normal CI and release paths install strictly with `npm ci --no-audit --no-fund`; the temporary `npm install` fallback has been removed. Lockfile bootstrap/adoption tooling remains available only for future intentional lockfile regeneration.
- ✅ Added AST-backed JS/TS-family analysis using the TypeScript compiler API.
- ✅ Multiline imports/declarations, `export abstract class`, class methods, explicit export lists, named export aliases, namespace re-exports, destructured top-level bindings, module scope, static environment references, and comment-safe TODO extraction are structurally analyzed.
- ✅ JS/TS multiline signatures are normalized into compact API signatures without body braces, continuation whitespace, or trailing parameter commas.
- ✅ Function-local temporary variables no longer pollute the JS/TS module symbol list.
- ✅ Added Python environment-reference detection that ignores comments and strings.
- ✅ Added trusted description provenance from TS/JS file/module docs, safe declaration docs, Python module docstrings, Rust module docs, Go package comments, exact README file descriptions, and exact README structural-module descriptions.
- ✅ Added one canonical `LocalDocumentationModel` shared by Local Markdown and HTML.
- ✅ Structural modules use shared second-level grouping such as `src/providers`, `src/services`, and `src/scanner`.
- ✅ Local project docs are question-first: **Where is what**, **How to run**, **Referenced environment variables**, **Suggested reading path**, **Core files**, **Undocumented files**, and description-coverage facts.
- ✅ Local per-file docs are compact, omit empty routine sections, show trusted description provenance, show Uses / Used by, environment references, and portable source/line links.
- ✅ Portable source links strictly encode Markdown-sensitive path characters such as spaces, route-group parentheses, brackets, and `#`, while preserving `#Lx` line anchors.
- ✅ Local Markdown no longer carries raw architecture/whiteboard/dependency JSON, file-level graph payloads, or D2 duplication; it keeps one compact module Mermaid view.
- ✅ Local HTML uses the question-first code map as its rich visual layer: At-a-glance project summary, module map, treemap, suggested reading path, dependency-reach scatter, complete file-evidence search, connected file cards, source links, and factual handwritten notes.
- ✅ Local HTML project orientation is code-map owned: canonical totals, description coverage, languages, entry points, and external dependencies render in **At a glance**; duplicate legacy Project Facts / Language Summary / Module Summary / Entry Points / External Dependencies / Source Tree sections are suppressed in HTML while Markdown retains them.
- ✅ **Big picture** is the single Local HTML architecture answer; duplicate `Architecture & Dependencies` / `Module Relationships` output is suppressed in HTML while Markdown retains its deterministic architecture table and compact Mermaid view.
- ✅ Documentation coverage is actionable in **At a glance**: undocumented files open their file cards directly, long lists stay compact with an expandable remainder, and the duplicate HTML `Undocumented files` section is suppressed while Markdown retains it.
- ✅ Local HTML file cards retain canonical internal symbols and TODO/FIXME/HACK source-note evidence instead of dropping those analyzer facts after model construction.
- ✅ Local lookup uses deterministic token-aware matching across full file-card evidence: path, trusted description, exported/internal symbols, environment references, and TODO/FIXME/HACK source notes. Multi-word queries can span factual fields, results carry source-factual match context without embeddings or semantic guessing, and a compact top-nine result set can expand to every remaining ranked match.
- ✅ Big Picture module nodes retain trusted description provenance and canonical suggested start files from the shared model.
- ✅ Uses / Used by stays compact for the first 12 links while every remaining relation remains expandable and navigable; no dependency links are hidden behind a count-only placeholder.
- ✅ Local HTML has one source-grounded **How to run** surface owned by the code map: package scripts/manager, extension entry, VS Code commands/settings, Makefile targets, Dockerfile facts, and referenced environment variables come from the canonical model; duplicate HTML overview onboarding headings are suppressed while Markdown keeps them.
- ✅ Local code map supports cross-view navigation, module focus isolation, entry-point-driven layered layout, accessible search/listbox behavior, `Ctrl/Cmd+K` file search, trusted module-description tooltips, and an accessible in-map section navigator with `aria-current` state, scroll tracking, valid deep-link restoration, hash-change synchronization, and safe stale-hash fallback.
- ✅ Big Picture arrow styling is aligned with the redesign prototype: dependency direction uses open sketch-style arrowheads rather than filled SVG markers; single-import edges are light/dashed, repeated imports get circular count badges, stronger relationships receive heavier accent strokes, reciprocal directions are spatially separated, long cross-level edges can curve, and handwritten metric notes use matching open-arrow connectors.
- ✅ The redesign prototype is now the Local HTML visual source of truth, not merely a reference for individual arrows: Local reports use its paper/grid palette, light/dark tokens, typography stacks, flatter reader chrome, module tint system and legend, sheet/card geometry, reading-path treatment, lookup layout, and inverse bounded tooltips while preserving the canonical source-grounded data model and offline/no-CDN requirement.
- ✅ Big Picture now defaults dense graphs to a readable **Major links** view while retaining an explicit **All links** control, uses smaller module cards plus layered/crossing-reduced routed edges, moves metric annotations out of the canvas into factual insight chips, and supports Fit / zoom buttons, mouse-wheel zoom, and pointer-drag panning without dropping any source-derived relationship.
- ✅ Big Picture semantic zoom keeps Fit view architectural (module names only), reveals file/line metadata at medium zoom and suggested-start files at deep zoom, while disconnected modules sit inside a visually muted `other modules` lane. Reader header project-overview state no longer repeats the project name; its root jump target is labeled `Overview`.
- ✅ Long card/module labels are contained with wrapping/clamping instead of escaping their cards; reader location, tree reveal, and current-section navigation are integrated into the report header rather than rendered as a floating/sticky content card. Local HTML no longer displays a redundant “Local Documentation” heading/banner.
- ✅ Added three non-duplicative Local HTML answers: **Runtime flow** (entry-point-resolved import layers, explicitly not exact call order), **Project interfaces** (only detected commands/settings/entry metadata/env refs/exposed ports/entry exports), and **Verification** (only declared package/Make checks classified by their existing names/commands). Each surface is conditional and disappears when unsupported by source facts.
- ✅ Added conditional **Data model** documentation backed by direct source declarations: Prisma, SQL, GraphQL, OpenAPI, Mongoose, and Drizzle. HTML and Markdown omit it when no supported evidence exists; Prisma/GraphQL file types are included in default scanning.
- ✅ Added conditional **Security boundaries** documentation backed only by direct evidence: secret-storage APIs/wrappers, credential-like environment variable names, explicit security policy/header names, and imported authentication libraries. It never includes secret values, is explicitly not a security audit, and disappears when no supported evidence exists.
- ✅ Added conditional **Failure paths** documentation backed by static literal throw/error-report messages plus source-declared retry/recovery/fallback/backoff/resume symbol names. The renderer keeps those two evidence classes distinct and explicitly avoids claiming exhaustive runtime control flow or inferred recovery semantics.
- ✅ Reintroduced restrained Jelly softness into the Local prototype shell without abandoning the paper-grid design: major cards/panels use translucent gradients, softer borders/radii and low-amplitude depth; topbar/nav use bounded blur/saturation rather than applying expensive blur to every child card.
- ✅ Added a bounded soft-motion layer: nav underline state, buttons, file tiles, Data-model cards, search focus, Big Picture focus/semantic states, tooltips, and reader-header controls transition with an ease-out curve; `prefers-reduced-motion` collapses motion and the stylesheet avoids blanket `transition: all`.
- ✅ Added a native review/feedback prompt policy: one prompt is eligible on the first DocuMint activation after install; if postponed, it can reappear at most once per seven days, including after a later successful generation when due. **Review on Marketplace** opens the Marketplace review section directly, **Tell us what to improve** opens a prefilled GitHub feedback issue directly, and **Later** / **Don't ask again** remain explicit choices; no feedback is transmitted automatically.
- ✅ Bumped the release candidate to **1.0.8** and rebuilt the README around the new Local Project Map: new self-documenting screenshots replace the old README image links, 1.0.8 highlights and a 1.0.7-vs-1.0.8 comparison are explicit, and README-only media remains excluded from the VSIX.
- ✅ Removed the now-unused Local architecture `summary` rendering branch after **Big picture** became the sole HTML architecture surface; the architecture renderer is Markdown-only again.
- ✅ Local HTML disables required external CDN assets; the Local project-map experience is self-contained.
- ✅ Hardened Markdown→HTML rendering in both Local and AI modes: source/provider raw HTML is neutralized outside code, source-derived prose is escaped as plain Markdown text, and unsafe rendered link/image URLs are blocked.
- ✅ Local cache compatibility is now `local-documentation-cache-v29`.
- ✅ Added nonce-based CSP to the sidebar webview.
- ✅ Hardened local-provider network boundaries: Ollama, LM Studio, local model discovery, and custom OpenAI-compatible requests do not follow HTTP redirects; loopback requests bypass environment HTTP proxies, and local model discovery also caps response size.
- ✅ New installs default to Local mode; malformed/legacy programmatic mode values still fall back to AI.
- ✅ Default AI file-generation concurrency is 5, with a configurable maximum of 15.
- ✅ Published canonical `documint.*` settings while preserving explicit `aiDocGenerator.*` values as deprecated compatibility aliases. Runtime reads/writes go through the shared namespace bridge; command IDs remain unchanged.
- ✅ Removed obsolete activation events and deprecated `@types/marked`.
- ✅ Added CONTRIBUTING, SECURITY, issue templates, PR checklist, and source-of-truth audit docs.
- ✅ Added dependency-free repository hygiene with EditorConfig and Git attributes for LF normalization and binary artifact handling.
- ✅ `htmlTemplate.ts` is now a small composition shell; static generated-HTML styles/runtime/policy moved to dedicated modules with focused regressions.
- ✅ `sidebarProvider.ts` now focuses on host state/messages; CSP-aware markup, styles, and webview client runtime live in dedicated modules.
- ✅ Added weekly Dependabot configuration for npm and GitHub Actions.
- ✅ Retired the unused `localVisualBlueprint.ts` Local payload path and aligned Local browser/Jelly/architecture regressions with the code-map architecture.
- ✅ Aggregate unit-test registration is currently consistent: all 72 root `test/*.test.ts` modules are imported by `test/all.test.ts`; imports remain in one alphabetical block.
- ✅ Added `npm run audit:self`, which documents DocuMint's own source and asserts key Local Documentation release invariants; PR CI and tag releases run it after the normal regression suite.
- ✅ Added a manual-only browser acceptance workflow plus canonical `npm run test:browser` scripts; it runs provider-free fixtures through Chromium and uploads screenshots/results without auto-running on push/PR.
- ✅ Browser acceptance encodes the 30-second newcomer discovery test: API-key storage, provider integration, and build/test commands must be discoverable through the Local project-map search/onboarding surfaces.
- ✅ Added strict one-command release-readiness tooling: `npm run release:readiness` requires `package-lock.json`, runs `npm run verify` plus full browser acceptance, packages with the installed local VSCE binary, validates the VSIX archive, and records machine-readable timings, Local self-audit evidence, bundle/VSIX sizes, SHA-256, browser results, and optional baseline-size deltas.
- ✅ Split normal development from release validation: `npm run check` is the lightweight edit-loop gate (typecheck + fast unit/regression suite only), while browser acceptance, self-audit, VSIX packaging, archive validation, and readiness evidence remain release-candidate concerns.
- ✅ Regression policy now prefers observable behavior/data contracts over brittle exact helper names, CSS/runtime source inventories, or generated-source substrings; harmless implementation refactors should not fail tests when user-visible behavior is unchanged.
- ✅ Legacy human-readable generated timestamps are parsed explicitly before native `Date` parsing so Node/runtime differences cannot silently reinterpret a missing year as 2001.
- ✅ Release-readiness browser probing now honors `CHROMIUM_EXECUTABLE`, matching the Python browser acceptance scripts; local validation can reuse an already-installed Chrome/Chromium binary without downloading Playwright-managed Chromium, while the managed-browser path remains supported.
- ✅ Tag releases reuse the same readiness command and upload readiness/browser evidence; VSIX packaging excludes `tools/**`, `audit/**`, and `release-artifacts/**` so tooling/reference/evidence files cannot inflate the release package.
- ✅ Added a manual-only **Release Readiness** workflow for on-demand execution after the lockfile exists; it does not enable automatic main-push CI.
- ✅ The manual **Lockfile Bootstrap** workflow defaults to running the complete readiness gate against its transient generated lockfile, so verify/browser/VSIX evidence can be produced before that lockfile is committed; repository permissions remain read-only.
- ✅ Added `npm run lockfile:bootstrap` for authenticated GitHub CLI dispatch of Lockfile Bootstrap on the current branch, with explicit `DOCUMINT_BOOTSTRAP_REF` / `DOCUMINT_BOOTSTRAP_REPO` overrides; this avoids manual Actions UI navigation without granting repository write behavior.
- ✅ Added a shared lockfile policy plus `npm run lockfile:adopt -- <artifact>`: downloaded Bootstrap artifacts are validated against the current package identity/dependency maps before the root lockfile is replaced, Bootstrap `package-lock.sha256` metadata is verified when present, and the adopted SHA-256 is rechecked; checksum/identity rejection leaves the existing root lockfile unchanged, and the artifact itself carries the exact adoption command.
- ✅ Browser acceptance uses a cross-platform Python 3 launcher with `DOCUMINT_PYTHON` override support, and release readiness preflights Playwright/Chromium before verify/browser/package execution.
- ✅ The corrected 1.0.8 head passed unit/regression, compile/bundle, Local self-audit, full browser acceptance, VSIX packaging, archive integrity validation, and `npm run release:readiness`.
- ✅ The 1.0.8 GitHub tag/release workflow then completed successfully and published `documint-1.0.8.vsix`.
- ✅ v1.0.9 was already released before the finalized first-activation review-prompt change landed.
- ✅ The review prompt now shows once on first DocuMint activation, retains the seven-day postponed cadence, preserves legacy prompt state, and guards against duplicate activation/generation scheduling.
- ⏳ The package version is now **1.0.10** so the finalized review-prompt behavior can be published as a new Marketplace/GitHub build.
- ⏳ Re-run `npm run release:readiness` for the current 1.0.10 head before creating the v1.0.10 tag and Marketplace upload.

### Current next step

v1.0.9 is already published. The finalized review-prompt behavior now lives on the 1.0.10 head and needs one complete release validation.

1. Pull the current 1.0.10 head.
2. Run `npm run release:readiness` and require a complete PASS.
3. Confirm `release-artifacts/documint-1.0.10.vsix` and `release-artifacts/readiness/readiness.json` were regenerated.
4. Create/push the `v1.0.10` tag so the GitHub Release workflow validates and publishes the matching GitHub asset.
5. Publish that 1.0.10 VSIX to the VS Code Marketplace.
6. Keep main-push CI path-gated unless/until that workflow policy is intentionally changed.



Do not add more redesign features before the readiness evidence is green unless a new concrete defect is found.


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

Current status:

- ✅ Pull requests run the canonical CI verification gate automatically.
- ✅ CI performs TypeScript typecheck, bundle, and regression verification through `npm run verify`.
- ✅ Browser acceptance is covered by the dedicated manual/release readiness gate.
- ⏳ Main-branch push CI remains intentionally path-gated through `.github/ci-trigger`; changing that is a workflow-policy decision, not an implementation gap.

### 0.2 Commit `package-lock.json` and use `npm ci`

Current status:

- ✅ `package-lock.json` is tracked and validated.
- ✅ `.gitignore` explicitly documents that the lockfile is intentionally tracked.
- ✅ CI/release workflows use `npm ci --no-audit --no-fund` with no temporary `npm install` fallback.

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
