# Incident audit — DocuMint Skill returned generator ZIP instead of HTML (2026-11-15)

## User-visible failure

The prompt requested **completed original DocuMint interactive HTML**, but the generated `DocuMint_PEVS_Original_Renderer_Package.zip` contained only `render_documint.py`, `project-data.json`, `documentation.md` and a README. It contained **no** `documentation.html` and **no** `documint-renderer.html`. The script attempted to fetch the renderer from `raw.githubusercontent.com` and failed when that runtime could not reach GitHub. There was useful source evidence (132 indexed, 13 inspected files) but no delivered HTML.

## Root causes

1. Installing a Skill does not automatically expose its large bundled HTML asset to every independent file-generation runtime. The agent treated a GitHub renderer URL as a substitute for the actual renderer bytes.
2. The previous package validator checked **file existence**, not authenticity; a tiny fake viewer could pass a structural packaging test.
3. The project-data-to-HTML assembler had no strict positive **ready HTML file** delivery contract. Agent could substitute a generator ZIP and still report success.
4. Existing simulated unit tests used a tiny mock HTML shell; they did not exercise the original 300+ KB artifact end-to-end.
5. The Skill cannot force ChatGPT file-writing/execution permissions. No change to SKILL.md alone can grant them.

## Fix architecture

- **Skill asset first:** use packaged `skills/documenting-codebases/assets/documint-renderer.html`, with exact Git blob SHA-1 `ec66c180f09a0df8ef2eb6f3c8765b185716d8f6`. If inaccessible, an authorized GitHub connector may read the exact pinned asset and a file-capable host can materialize it. Never silently rely on a live URL fetch.
- **Verified assembler:** `render_embedded.py` checks canonical renderer identity and structure before producing HTML. It verifies embedded project JSON and CSP nonce and rejects all unexpected renderer changes.
- **Legacy repair:** `--input-zip` reads the input archive's root `project-data.json`, not its executable code. `--zip-out` contains actual selected documentation files.
- **Ready-artifact guarantee:** Skill must return a real `documentation.html` when HTML is selected or explicitly report failure. Generator ZIP is forbidden as a successful substitute.
- **No MCP/Google Drive/GitHub Actions:** the engine remains offline and standalone given an actual file-writing host.

## Verification gates

- [x] Reproduce missing renderer ZIP failure locally from the user-provided archive.
- [x] Targeted unit tests for fake renderer, original-HTML integrity, offline ZIP repair semantics, format selection and no partial success (synthetic shell).
- [x] Canonical renderer asset and Git SHA verified through GitHub source access.
- [x] Static original-asset script syntax check after embedding example JSON (not a browser interaction test).
- [ ] Run all plugin package + real HTML E2E Python tests with the original renderer mounted in the execution environment.
- [ ] Run offline browser acceptance on actual generated HTML, including file finder, dependency map, treemap, theme and zoom/pan.
- [ ] Install/refresh v0.3.2 in ChatGPT and observe a real ready-to-download `documentation.html` generated in the host.

## Commands

```bash
python3 -m unittest discover -s tests/documint-skill -p 'test_*.py' -v
node tools/export-embedded-renderer.mjs --check
python3 tools/documint_skill_plugin.py check
python3 tools/documint_skill_plugin.py package --output documint-skill-v0.3.2.zip

# Offline recovery of an earlier generator-only PEVS ZIP:
python3 plugins/documint/skills/documenting-codebases/scripts/render_embedded.py \
  --input-zip /path/to/DocuMint_PEVS_Original_Renderer_Package.zip \
  --format both --out-dir ./finished --zip-out ./DocuMint_READY.zip
```

**Limit:** source facts generated in ChatGPT are AI-assisted and are not guaranteed to reproduce the VS Code deterministic analyzer's facts, even though the original interactive viewer is reused. Never claim byte-identical documentation or a verified ChatGPT host without the corresponding test evidence.
