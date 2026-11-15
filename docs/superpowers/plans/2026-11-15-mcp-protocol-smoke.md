# Superpowers plan — real MCP protocol smoke test

Date: 2026-11-15
Spec: docs/superpowers/specs/2026-11-15-mcp-protocol-smoke-design.md

## Task 1: establish baseline and blocker
- Check existing mocked repository fetch tests and installed SDK state.
- Observed in this sandbox: local isolated regression fixture 9/9 passed; npm registry request for SDK failed with EAI_AGAIN. Full repo was not available in the local container.

## Task 2: add a real SDK protocol test
- New file: integrations/chatgpt-plugin/smoke/mcpProtocol.test.mjs.
- Use Node test runner, SDK Client and StreamableHTTPClientTransport, and a child server listening on an ephemeral loopback port.
- Verify initialize, tools/list, tool read-only flags, unsafe tool calls, 413 body-limit responses and Origin rejection.
- Expected when installed: all tests pass without GitHub internet access.
- Observed now: node --check succeeded; execution is blocked at SDK import (ERR_MODULE_NOT_FOUND). Do not record green status.

## Task 3: wire check and docs
- Update plugin package scripts so npm run check builds analyzer and runs both unit and MCP smoke suites.
- README and audit log specify the blocker and verification commands.

## Completion gate
- In a connected checkout: npm ci at root, npm install in integrations/chatgpt-plugin, npm run check.
- Inspect complete command output; if red, diagnose the specific SDK handshake mismatch before merging or publishing.
- Separately test a live public GitHub repository and ChatGPT connection via a controlled HTTPS endpoint.
