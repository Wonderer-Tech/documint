# DocuMint MCP Protected Preview — Security Design (2026-11-15)

## Scope
Harden the already-qualified public-GitHub-only personal MCP preview for safer loopback and tunnel operation. Do NOT describe a static bearer token as OAuth 2.1 or a production multi-user identity solution.

## Approaches
1. Selected: opt-in high-entropy bearer-token gate on /mcp (with Docker explicitly requiring a token by default), plus a bounded JSON body parser and timeouts. Preserves no-auth localhost and Secure MCP Tunnel private-preview paths.
2. Rejected: write a homegrown OAuth identity provider with account UI and token endpoints, which requires operational ownership and independent security review.
3. Rejected: publish the anonymous preview directly on the public internet.

## Contract
The local Node server remains anonymous by default on 127.0.0.1. When MCP_ACCESS_TOKEN is set, all /mcp methods require exact Authorization: Bearer <token>, compared via SHA-256 digest and timingSafeEqual; /health carries no sensitive information. MCP_REQUIRE_ACCESS_TOKEN=1 without token refuses startup. Docker image defaults to required mode and allows deliberate local-only opt-out.

Only application/json (optional UTF-8 charset) with identity encoding is accepted for POST. Declared or streamed bodies over 32768 bytes return HTTP 413. Invalid JSON returns 400, unsupported type or compression returns 415; response errors never echo body or token. Set explicit HTTP socket/request timers.

## Testing and deployment gate
Unit tests must use Node's real parser; an additional node:http test must demonstrate chunked HTTP 413. Spawning the actual MCP SDK server with required token must be verified in the user's Ubuntu checkout. Do not trigger GitHub Actions, create PR, merge, deploy, publish or release. Public multi-user connectivity remains blocked on OAuth 2.1, trusted HTTPS, authorization, monitoring and abuse protections.
