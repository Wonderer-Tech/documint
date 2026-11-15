import { createHash } from "node:crypto";

/**
 * Verify a Git tree entry SHA against the exact raw UTF-8 Git blob.
 * null means GitHub supplied no SHA (e.g. a synthetic test fixture).
 */
export function matchesGitBlobSha(text, expectedSha) {
  if (expectedSha === undefined || expectedSha === null) return null;
  if (typeof expectedSha !== "string" ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(expectedSha)) return false;
  const raw = Buffer.from(text, "utf8");
  const digest = createHash(expectedSha.length === 40 ? "sha1" : "sha256")
    .update("blob " + raw.length + "\0", "utf8")
    .update(raw)
    .digest("hex");
  return digest === expectedSha.toLowerCase();
}
