/**
 * Source-grounded result contracts for the opt-in live GitHub acceptance
 * test. Validates DocuMint's MCP replies, not GitHub's own API.
 */
const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const TRUNCATED = "\n\n[DocuMint: documentation excerpt truncated]";

function fail(message) {
  throw new Error("DocuMint live acceptance: " + message);
}

function unpack(result) {
  if (result?.isError === true) {
    const message = result?.content?.find((entry) => entry.type === "text")?.text ?? "";
    fail("tool error: " + String(message).slice(0, 350));
  }
  let data = result?.structuredContent;
  if (!data) {
    try {
      const text = result?.content?.find((entry) => entry.type === "text")?.text;
      data = JSON.parse(text);
    } catch {
      fail("invalid tool result: no structuredContent or parseable JSON text");
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail("invalid tool result: expected an object");
  }
  return data;
}

function assertMetadata(result, { repository, maxFiles }) {
  const data = unpack(result);
  const sourceUrl = "https://github.com/" + repository;
  if (data.repository !== repository || data.sourceUrl !== sourceUrl) {
    fail("repository identity mismatch");
  }
  if (!data.branch || typeof data.branch !== "string") fail("missing branch");
  if (!SHA.test(data.commitSha ?? "")) fail("missing or invalid commit SHA");
  if (!SHA.test(data.treeSha ?? "")) fail("missing or invalid tree SHA");
  if (data.revisionUrl !== sourceUrl + "/tree/" + data.commitSha) {
    fail("revision URL does not identify the pinned commit");
  }
  const coverage = data.coverage;
  if (!coverage || typeof coverage !== "object") fail("missing coverage");
  for (const key of [
    "selected", "fetched", "eligibleSourceFiles", "omittedByFileLimit",
    "failedToFetch", "omittedByByteLimit",
  ]) {
    if (!Number.isSafeInteger(coverage[key]) || coverage[key] < 0) {
      fail("invalid coverage." + key);
    }
  }
  if (coverage.fetched === 0 || coverage.fetched > coverage.selected ||
      coverage.selected > maxFiles || coverage.eligibleSourceFiles < coverage.selected) {
    fail("inconsistent coverage counts");
  }
  if (coverage.eligibleSourceFiles <= maxFiles) {
    fail("fixture unexpectedly small: choose a smaller maxFiles or a larger public repository");
  }
  if (coverage.omittedByFileLimit === 0) fail("omission evidence missing");
  if (coverage.complete !== false || !String(data.caution).includes("PARTIAL")) {
    fail("partial sampling must be prominently disclosed");
  }
  return data;
}

export function assertLiveOverview(result, options) {
  const data = assertMetadata(result, options);
  if (!data.overview || !Number.isSafeInteger(data.overview.analyzedFiles) ||
      data.overview.analyzedFiles !== data.coverage.fetched ||
      data.overview.totalLines <= 0 || !Array.isArray(data.overview.modules) ||
      !Array.isArray(data.analyzedPaths)) {
    fail("invalid repository overview");
  }
  return data;
}

export function assertLiveFile(result, options) {
  const data = assertMetadata(result, options);
  if (!data.file || data.file.path !== options.filePath) {
    fail("requested file path mismatch");
  }
  if (!Number.isSafeInteger(data.file.lineCount) || data.file.lineCount < 1 ||
      !Array.isArray(data.file.symbols) || !Array.isArray(data.file.imports)) {
    fail("invalid file explanation");
  }
  return data;
}

export function assertLiveMarkdown(result, options) {
  const data = assertMetadata(result, options);
  if (typeof data.markdown !== "string" || !data.markdown.trim() ||
      typeof data.documentTruncated !== "boolean" ||
      !Number.isSafeInteger(data.fullMarkdownCharacters) ||
      data.fullMarkdownCharacters < 1) {
    fail("invalid Markdown documentation");
  }
  if (data.documentTruncated) {
    if (!data.markdown.endsWith(TRUNCATED) ||
        data.markdown.length > options.maxChars + TRUNCATED.length) {
      fail("invalid Markdown truncation marker or bound");
    }
  } else if (data.markdown.length > options.maxChars ||
             data.markdown.length !== data.fullMarkdownCharacters) {
    fail("Markdown exceeds requested bound or character count");
  }
  return data;
}
