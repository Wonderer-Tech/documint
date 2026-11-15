import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Optional single-operator bearer protection for private previews.
 * NOT OAuth; do not treat it as multi-user authorization.
 */
export function parseAccessToken(token) {
  if (token === undefined || token === null || token === "") return null;
  if (typeof token !== "string" ||
      !/^[A-Za-z0-9_-]{32,256}$/.test(token) ||
      new Set(token).size < 8) {
    throw new Error("Invalid MCP_ACCESS_TOKEN; use a high-entropy base64url or hex token (at least 32 characters)");
  }
  return createHash("sha256").update(token, "utf8").digest();
}

export function isAuthorizedRequest(authorizationHeader, expectedDigest) {
  if (expectedDigest === null) return true;
  if (!Buffer.isBuffer(expectedDigest) || expectedDigest.length !== 32) return false;
  if (typeof authorizationHeader !== "string") return false;
  const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorizationHeader);
  if (!match) return false;
  const receivedDigest = createHash("sha256").update(match[1], "utf8").digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}

/** Container image opts in by default: explicit local-only opt-out allowed. */
export function configureMcpAccess({ token, required } = {}) {
  if (required !== undefined && required !== "0" && required !== "1") {
    throw new Error("MCP_REQUIRE_ACCESS_TOKEN must be 0 or 1");
  }
  const digest = parseAccessToken(token);
  if (required === "1" && digest === null) {
    throw new Error("MCP_REQUIRE_ACCESS_TOKEN=1 requires MCP_ACCESS_TOKEN");
  }
  return digest;
}
