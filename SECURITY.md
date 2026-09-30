# Security Policy

DocuMint reads source files and can send selected source context to configured AI providers, so security and privacy regressions are treated seriously.

## Supported versions

Security fixes are targeted at the latest released DocuMint version and the current maintained `main` branch.

## Reporting a vulnerability

Do not publish API keys, source-code secrets, exploit payloads, or sensitive customer/project data in a public issue.

Prefer GitHub's private vulnerability-reporting / Security Advisory flow for this repository when it is available.

If private vulnerability reporting is not available, open a public issue containing only a request for a private maintainer contact channel. Do not include exploit details in that public issue.

Please include privately:

- affected DocuMint version/commit;
- VS Code and operating-system version;
- Local or AI mode;
- affected provider, if relevant;
- minimal reproduction steps;
- impact;
- whether secrets/source content could be exposed;
- suggested mitigation, if known.

## Security boundaries

Important DocuMint security expectations include:

- API keys remain in VS Code Secret Storage rather than generated documentation or normal settings;
- cloud-provider source transfer happens only through the provider flow and after the existing consent boundary;
- Local Documentation does not invoke an AI provider;
- Local generated HTML does not require third-party CDN assets for its Local project-map experience;
- sidebar webview scripts/styles are protected by a nonce-based Content Security Policy;
- custom endpoint URL/locality policy is enforced before provider requests;
- loopback/local provider requests do not follow redirects and bypass environment HTTP proxies, so a local/no-consent endpoint cannot transparently forward source-bearing requests to another host;
- generated documentation is sanitized before cache metadata is committed.
- provider/source Markdown is treated as untrusted when converted to HTML: raw HTML is neutralized outside code blocks, unsafe link/image schemes are blocked, and Local source-derived prose is Markdown-escaped before rendering;

## Disclosure

Please allow maintainers reasonable time to investigate and prepare a fix before public disclosure.
