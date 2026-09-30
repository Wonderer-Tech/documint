# Contributing to DocuMint

Thanks for helping improve DocuMint.

## Development setup

Prerequisites:

- Node.js 18+
- npm 9+
- VS Code 1.110.0+

Install and verify:

```bash
npm install
npm run compile
npm test
```

Use `npm run watch` while developing the extension.

## Project rules

### Keep Local mode source-grounded

Local Documentation must remain deterministic and provider-independent.

A Local-mode statement should come from a source fact such as:

- parsed declarations/imports;
- resolved project dependencies;
- package/extension manifest metadata;
- explicit module/package documentation;
- exact README path descriptions;
- mechanically derived counts or graph relationships.

Do not add semantic guesses such as business intent, architectural rationale, risk claims, or refactoring recommendations to Local mode unless the source proves them.

### Keep one canonical Local data model

Local Markdown and Local HTML should consume `LocalDocumentationModel` rather than independently re-deriving project facts.

### Preserve public facades

Runtime code should use the public facade modules rather than importing implementation-base modules directly.

Examples:

- `src/analyzer/sourceAnalyzer.ts`
- `src/services/docGenerator.ts`
- `src/extension.ts`

### Settings

New settings are published under `documint.*`.

Legacy explicit `aiDocGenerator.*` settings are compatibility aliases. Runtime configuration reads must use the bridge in `src/config/configuration.ts`.

Command IDs intentionally remain `aiDocGenerator.*` for compatibility unless a separate command-ID migration is designed.

## Tests

Every behavior change should include a focused regression test.

Tests live in `test/*.test.ts` and are aggregated through `test/all.test.ts`. The aggregate suite verifies that every sibling test file is imported, so register every new test module.

For Local HTML/browser changes, test:

- source/data correctness;
- keyboard behavior;
- offline behavior;
- failure isolation;
- mobile/focus behavior when relevant.

## Generated files and releases

Do not commit generated `documint/` output as source changes.

Do not force-add new VSIX binaries to normal source commits. Release packaging should remain separate from application-source review.

For a release candidate, first generate/refresh `package-lock.json` from a registry-enabled checkout (or use the manual **Lockfile Bootstrap** workflow), run `npm run lockfile:validate`, then commit the validated lockfile. Install locked dependencies with `npm ci` and install Python Playwright + Chromium. Then run:

```bash
npm run release:readiness
```

The readiness command is intentionally strict: it runs unit/regression verification, the Local self-audit, full generated-HTML browser acceptance, local-only VSIX packaging, and archive validation. Evidence is written under `release-artifacts/readiness/`; the VSIX is written under `release-artifacts/`. Both directories are ignored by Git and excluded from the VSIX.

Set `DOCUMINT_BASELINE_VSIX` to an earlier VSIX path when a before/after package-size delta is required. Browser scripts automatically select Python 3 through `tools/run-python.mjs`; set `DOCUMINT_PYTHON` when a specific interpreter is required.

The Lockfile Bootstrap workflow has read-only repository permissions and never commits or pushes. By default it also runs the full readiness gate against the transient generated lockfile and uploads readiness/VSIX evidence; disable its `run_readiness` input only when you want the lockfile artifact by itself. Once the validated `package-lock.json` exists on the branch, the manual **Release Readiness** workflow runs the same gate directly from the committed lockfile without changing the automatic-main CI policy.

## Pull requests

Keep changes focused and explain:

1. what problem is being solved;
2. which source facts or runtime behavior changed;
3. which tests cover the change;
4. whether Local/AI behavior or generated output changed;
5. whether cache compatibility needs to be bumped.

See [SECURITY.md](SECURITY.md) for vulnerability reports.
