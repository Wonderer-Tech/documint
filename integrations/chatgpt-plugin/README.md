# DocuMint ChatGPT Plugin — read-only MCP preview

This is a **standalone remote MCP server** for connecting DocuMint to ChatGPT as a personal plugin. It uses DocuMint's existing `SourceAnalyzer`, canonical Local model and Local Markdown renderers. It does not replace the VS Code extension and does not invoke an AI provider, run source code, clone/write repositories, or trigger GitHub Actions.

## Current scope

- **Public GitHub repositories only**. Owner/repo slugs and direct github.com repository URLs are accepted.
- **Read-only tools**:
  - `documint_analyze_repository`: module topology, dependencies, entry points, language/size summary and reading path
  - `documint_explain_file`: source-grounded symbols/imports/dependencies for a selected file
  - `documint_generate_markdown`: bounded excerpt from the deterministic Local Markdown renderer
- Excludes private repos, secrets-like files, test/build outputs and oversized inputs.
- Every result contains the default branch, immutable commit SHA, source tree SHA and scan coverage. Source files and optional README/Makefile/Dockerfile are fetched at that same commit to prevent mixed-revision documentation. A sampled/truncated repository is marked **PARTIAL**.
- Coverage is **PARTIAL** whenever source files are omitted due to size limits, invalid tree size metadata, fetch failures, file-count/total-byte limits, GitHub's truncated tree, in-scope Git submodules, or Git LFS source pointers. Submodules are not recursively fetched, and LFS pointers are never interpreted as source code. `omittedOversizedSourceFiles` and `omittedUnknownSizeSourceFiles` distinguish source omissions from intentionally excluded test/build/secret-like paths.
- No local filesystem or private workspace access. This is *not* a private-repo connector or a full hosted documentation service.
- No UI resource is registered; ChatGPT uses normal tool responses.

## Install and run locally

Requires Node.js >=22.6.0 and a development checkout of DocuMint.

```bash
# From the repository root, install DocuMint's locked build dependencies:
npm ci --no-audit --no-fund

cd integrations/chatgpt-plugin
npm install --no-audit --no-fund
npm run check
npm start
```

The server listens at `http://127.0.0.1:8787/mcp`. Health check: `http://127.0.0.1:8787/health`.

The `build` script uses the **root** installed esbuild to bundle the existing DocuMint analyzer and Local documentation model into `dist/core.cjs`. The plugin dependencies are deliberately isolated from the extension's existing `package-lock.json`. Before production release, commit and pin the plugin's own dependency lockfile after a successful connected install.

## Test

```bash
npm run check
npx @modelcontextprotocol/inspector@latest
```

`npm run check` now builds the headless analyzer, runs the mock-GitHub
collector tests, and runs `test:mcp` against a **real, spawned local
Streamable HTTP server** using the MCP SDK client. The smoke test verifies
initialization, exactly three read-only tools, rejection of unsafe
repository URLs, HTTP body-size enforcement, and Origin blocking. It uses
an ephemeral loopback port, disables GitHub tokens, and requires no live
GitHub fetch. The SDK and root build dependencies must already be installed.

The smoke suite is a **verification gate, not a claim of a successful run**:
it still needs to run in a network-enabled checkout. This session's npm
registry access returned `EAI_AGAIN`. A passed syntax check alone does
not prove that the SDK handshake works.

In MCP Inspector, select Streamable HTTP and connect to `http://127.0.0.1:8787/mcp`. Verify `tools/list` and each tool's read-only behavior, including malformed inputs and private-repo refusal.

## Connect to ChatGPT

ChatGPT cannot reach an ordinary localhost address. Expose the MCP endpoint with a **private Secure MCP Tunnel** or a trusted HTTPS deployment/tunnel. For local experiments, a temporary HTTPS tunnel such as ngrok can expose `/mcp`. Do **not** point a public tunnel at sensitive services.

1. In ChatGPT web, open **Plugins** → **+** → **Add custom MCP server**.
2. Name it **DocuMint** and provide your public HTTPS `/mcp` URL, or use Secure MCP Tunnel when available.
3. Create and install the personal plugin, then test: “Use DocuMint to analyze the public Wonderer-Tech/documint GitHub repo.”
4. This step requires **your action in the ChatGPT UI**. Pushing this code to GitHub does not register or install a ChatGPT plugin.

Official docs: https://developers.openai.com/plugins/quickstart

## Security and deployment limits

This preview runs anonymously **only because it analyzes public repositories**. It performs bounded, GET-only requests to GitHub API/raw hosts and has basic in-process request throttling. Do not expose it publicly for broad traffic without production-grade rate limiting, monitoring, isolation, abuse protection and domain verification.

For private repositories or authenticated user data, implement the **MCP OAuth 2.1** flow with a real identity provider and explicit per-user authorization. ChatGPT cannot be treated as presenting an arbitrary shared API key for end-user account authentication.

The server does not deploy itself, fetch a private user's local project, run GitHub Actions or publish a plugin to the directory.

To build a container from the **repository root**:

```bash
docker build -f integrations/chatgpt-plugin/Dockerfile -t documint-chatgpt .
docker run --rm -p 127.0.0.1:8787:8787 documint-chatgpt
```

The public `/mcp` URL must remain reachable for a persistent connection. For public plugin submission, use a stable HTTPS deployment instead of a temporary tunnel.


## Source integrity, request budgeting and HTTP Host safety

DocuMint now reserves the 4 MiB source-byte budget using the pinned Git tree
metadata *before* downloading raw source files. The downloaded text is still
checked against the existing actual-byte limits. Skipped files are counted
in `coverage.omittedByByteLimit`, and count-limit omissions remain separate.
When Git tree blob SHA metadata is available, raw source content and optional
root metadata are checked against the Git blob hash. Mismatched sources are
not analyzed; scans with failed source fetches are reported as partial.

The HTTP endpoint only trusts `localhost`, `127.0.0.1` and `[::1]`
as Host headers by default, protecting local/tunneled services against
Host-header and DNS-rebinding attacks. If a trusted HTTPS tunnel forwards
the original public Host, explicitly opt it in:

```bash
MCP_ALLOWED_HOSTS=documint.example.com npm start
```

List only trusted literal DNS hostnames separated by commas. Do not set
wildcards or include `https://`, ports or path components. Loopback
hosts remain allowed for local health checks. An unrecognized Host
receives HTTP 421; a public HTTPS endpoint still requires an independent
authentication, rate-limiting and abuse review before broad exposure.

The test suite now contains dependency-free regression checks for byte
reservation, host validation and Git blob integrity. The MCP SDK smoke
suite additionally checks Host rejection on the real server, but it must
not be considered passing until `npm run check` completes on a
network-enabled checkout with SDK dependencies installed.


## Opt-in live repository acceptance

Once `npm run check` passes (29 offline collector tests and 3 SDK smoke
tests before these new contract tests), run an **explicit** public-GitHub
acceptance check from `integrations/chatgpt-plugin`:

```bash
npm run check:live
```

The live command rebuilds the headless analyzer, runs offline tests, then
starts the actual Streamable HTTP server on a random loopback port and
connects through the MCP SDK. It invokes **all three** tools against the
real public `Wonderer-Tech/documint` repository, with `max_files: 10`
per scan (and `max_chars: 5000` for Markdown). It validates stable
commit-SHA attribution, partial coverage, module/file output and bounded
Markdown, and prints a small evidence record.

Live verification is deliberately **excluded** from ordinary
`npm run check`; running `check:live` explicitly opts into GitHub API/raw
requests. It uses public GET requests and does not modify any repository,
dispatch GitHub Actions or publish the MCP endpoint. An optional
`GITHUB_TOKEN` can improve GitHub's API request allowance; do not log
or commit tokens. The test launches the MCP server on `127.0.0.1`
and stops it afterwards.

If only the remote acceptance step is needed after a successful build:

```bash
DOCUMINT_LIVE_ACCEPT=1 npm run test:live
```

**Verification distinction:** This opt-in runner and its unit-test
contracts have been added, but the real MCP-to-GitHub live run still
requires execution from a network-enabled checkout. Live GitHub
metadata was independently read using the GitHub connector; that alone
does not prove the MCP tools have passed the acceptance test.
