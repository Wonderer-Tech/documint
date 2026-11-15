# DocuMint ready-artifact delivery specification

**Goal:** When the user asks DocuMint for HTML (or Both), deliver a **completed** `documentation.html` using original DocuMint UI assets; never a generator-only ZIP.

**Architecture:** ChatGPT/Codex reads authorized sources and prepares a truthful project JSON. Host file tools load the exact pinned bundled renderer and invoke offline `render_embedded.py`; it validates the original UI, inserts JSON/base64 and CSP nonce, writes selected ready files atomically, optionally zips completed files, and reports their actual paths. No MCP server, Google Drive or separate hosted service.

**Invariants:** pin Git blob SHA; preserve all original shell bytes except data/nonce; read only root `project-data.json` when repairing prior ZIP; never execute untrusted package scripts; distinguish inspected and indexed files and AI-assisted from deterministic source analysis; validate file existence and content before success.

**Limit:** Skill metadata cannot force automatic ChatGPT activation, native checkbox UI, filesystem mounting or code execution. If host lacks a needed capability, clearly report failure instead of a misleading download.
