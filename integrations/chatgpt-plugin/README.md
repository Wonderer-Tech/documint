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
- Coverage is **PARTIAL** whenever source files are omitted due to size limits, invalid tree size metadata, fetch failures, file-count/total-byte limits, or GitHub's truncated tree. `omittedOversizedSourceFiles` and `omittedUnknownSizeSourceFiles` distinguish source omissions from intentionally excluded test/build/secret-like paths.
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
