/**
 * Public GitHub input adapter for the DocuMint ChatGPT MCP plugin.
 *
 * Security boundaries:
 * - no arbitrary URLs, local paths, commands, branches or private repositories
 * - only fixed GitHub API/raw endpoints can be contacted
 * - no redirects or source-code logging
 * - strict byte/file/concurrency/time bounds
 * - generated/build/test/secret-like paths are excluded
 */
const MAX_FILES = 120;
const MAX_FILE_BYTES = 128 * 1024;
const MAX_METADATA_BYTES = 96 * 1024;
const MAX_TREE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_SOURCE_BYTES = 4 * 1024 * 1024;
const FETCH_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 12_000;

const EXCLUDED_SEGMENTS = new Set([
  ".git", ".github", ".vscode", ".idea", ".next", ".nuxt", ".angular",
  ".svelte-kit", ".turbo", ".cache", "node_modules", "vendor", "dist",
  "build", "out", "coverage", "__tests__", "__mocks__", "test", "tests",
  "spec", "specs", "fixtures", "docs", "documint", "target", "release",
  "releases", ".venv", "venv",
]);

const SOURCE_EXTENSIONS = new Set([
  "ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs", "py", "java",
  "c", "h", "cc", "cpp", "cxx", "hh", "hpp", "hxx", "cs", "go", "rs",
  "php", "rb", "swift", "kt", "scala", "sh", "yaml", "yml", "json",
  "xml", "html", "css", "scss", "sql", "prisma", "graphql", "gql",
]);

export function parsePublicRepository(input) {
  if (typeof input !== "string" || input.length > 250) {
    throw new Error("Provide a public GitHub repository as owner/repo or https://github.com/owner/repo");
  }
  let value = input.trim();

  if (value.startsWith("https://")) {
    const url = new URL(value);
    if (
      url.hostname.toLowerCase() !== "github.com" ||
      url.port || url.username || url.password ||
      url.search || url.hash
    ) {
      throw new Error("Only a direct public github.com/owner/repo URL is supported");
    }
    value = url.pathname.replace(/^\/+|\/+$/g, "");
  }

  value = value.replace(/\.git$/, "");
  if (!/^[-A-Za-z0-9_.]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(value)) {
    throw new Error("Expected a GitHub owner/repo slug; subpaths and non-GitHub URLs are not accepted");
  }
  const [owner, name] = value.split("/");
  if (owner === "." || owner === ".." || name === "." || name === "..") {
    throw new Error("Invalid repository name");
  }
  return { owner, name, slug: owner + "/" + name };
}

export function isSafeSourcePath(filePath) {
  if (typeof filePath !== "string" || !filePath || filePath.length > 400) return false;
  if (filePath.startsWith("/") || filePath.includes("\\") ||
      filePath.includes("\0") || filePath.includes("//")) return false;

  const segments = filePath.split("/");
  if (segments.some((segment) => !segment || segment === "." ||
      segment === ".." || segment.startsWith(".") ||
      EXCLUDED_SEGMENTS.has(segment.toLowerCase()))) return false;

  const base = segments[segments.length - 1].toLowerCase();
  if (
    base.startsWith(".env") || base.endsWith(".map") ||
    base.endsWith(".lock") || base.endsWith(".min.js") ||
    base.endsWith(".min.css") || base.endsWith(".d.ts") ||
    /(?:^|[._-])(?:test|spec)(?:[._-]|$)/.test(base) ||
    /(?:secret|credential|private[-_.]?key|\.pem|\.p12|\.pfx)/i.test(base)
  ) return false;

  const extension = base.slice(base.lastIndexOf(".") + 1);
  return SOURCE_EXTENSIONS.has(extension);
}

function priority(path) {
  if (path === "package.json") return 0;
  if (/^(src|app|apps|lib|packages)\//i.test(path)) return 1;
  if (/^(server|client|api|cmd|internal)\//i.test(path)) return 2;
  return 3;
}

function encodeRawPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function limitedText(response, limit) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) {
    throw new Error("Response exceeds configured byte limit");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("HTTP response body is unavailable");
  let total = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => {});
        throw new Error("Response exceeds configured byte limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true })
    .decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total));
}

async function fetchBounded(fetchImpl, url, limit, token) {
  const headers = {
    "Accept": url.hostname === "api.github.com"
      ? "application/vnd.github+json"
      : "text/plain",
    "User-Agent": "DocuMint-ChatGPT-Public-ReadOnly/0.1.0",
  };
  // The optional token is only sent to GitHub's API, never to raw file hosts.
  if (token && url.hostname === "api.github.com") {
    headers.Authorization = "Bearer " + token;
  }

  const response = await fetchImpl(url, {
    method: "GET",
    redirect: "error",
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const status = response.status;
    if (status === 404) throw new Error("Repository or file not publicly accessible (HTTP 404)");
    if (status === 403 || status === 429) {
      throw new Error("GitHub rate limit or access restriction (HTTP " + status + ")");
    }
    throw new Error("GitHub returned HTTP " + status);
  }
  return limitedText(response, limit);
}

async function fetchJson(fetchImpl, url, limit, token) {
  const text = await fetchBounded(fetchImpl, url, limit, token);
  return JSON.parse(text);
}

async function parallelMap(items, worker, limit = FETCH_CONCURRENCY) {
  const output = Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

export async function fetchPublicRepository(
  repository,
  { maxFiles = 80, focusPath, fetchImpl = globalThis.fetch, token = process.env.GITHUB_TOKEN } = {},
) {
  const { owner, name, slug } = parsePublicRepository(repository);
  if (!Number.isInteger(maxFiles) || maxFiles < 10 || maxFiles > MAX_FILES) {
    throw new Error("maxFiles must be an integer from 10 to 120");
  }
  if (focusPath !== undefined && !isSafeSourcePath(focusPath)) {
    throw new Error("Requested file path is excluded or not a supported source type");
  }

  const metadata = await fetchJson(
    fetchImpl,
    new URL("https://api.github.com/repos/" +
      encodeURIComponent(owner) + "/" + encodeURIComponent(name)),
    MAX_METADATA_BYTES,
    token,
  );
  if (metadata.private !== false || typeof metadata.default_branch !== "string") {
    throw new Error("Only verified public GitHub repositories are supported");
  }

  const branch = metadata.default_branch;
  // Resolve the mutable default branch once; fetch the tree and all source
  // content by immutable commit SHA to prevent mixed revisions mid-scan.
  const repoApi = "https://api.github.com/repos/" +
    encodeURIComponent(owner) + "/" + encodeURIComponent(name);
  const revision = await fetchJson(
    fetchImpl,
    new URL(repoApi + "/git/ref/heads/" + encodeRawPath(branch)),
    MAX_METADATA_BYTES,
    token,
  );
  const commitSha = revision?.object?.sha;
  if (revision?.object?.type !== "commit" ||
      typeof commitSha !== "string" ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(commitSha)) {
    throw new Error("GitHub did not return a verified commit SHA");
  }
  const tree = await fetchJson(
    fetchImpl,
    new URL(repoApi + "/git/trees/" + commitSha + "?recursive=1"),
    MAX_TREE_BYTES,
    token,
  );

  if (!Array.isArray(tree.tree)) throw new Error("GitHub did not return a repository tree");

  const candidates = tree.tree
    .filter((entry) =>
      entry.type === "blob" &&
      entry.mode !== "120000" &&
      isSafeSourcePath(entry.path) &&
      Number.isInteger(entry.size) &&
      entry.size >= 0 &&
      entry.size <= MAX_FILE_BYTES
    )
    .sort((a, b) =>
      priority(a.path) - priority(b.path) ||
      a.path.localeCompare(b.path)
    );

  if (focusPath && !candidates.some((entry) => entry.path === focusPath)) {
    throw new Error("Requested file was not found among permitted, size-bounded source files");
  }

  let selection = candidates.slice(0, maxFiles);
  if (focusPath) {
    const focused = candidates.find((entry) => entry.path === focusPath);
    // Fetch the requested file first so the overall byte budget cannot
    // accidentally exclude the only file the user asked to inspect.
    selection = [focused, ...selection.filter((entry) => entry.path !== focusPath)]
      .slice(0, maxFiles);
  }

  const rawBase = "https://raw.githubusercontent.com/" +
    encodeURIComponent(owner) + "/" + encodeURIComponent(name) + "/" +
    commitSha + "/";

  const result = await parallelMap(selection, async (entry) => {
    try {
      const content = await fetchBounded(
        fetchImpl, new URL(rawBase + encodeRawPath(entry.path)),
        MAX_FILE_BYTES, token,
      );
      if (content.includes("\0")) throw new Error("Binary content rejected");
      return { path: entry.path, content };
    } catch {
      return undefined;
    }
  });

  const files = [];
  let totalBytes = 0;
  let omittedByByteLimit = 0;
  for (const file of result.filter(Boolean)) {
    const bytes = Buffer.byteLength(file.content, "utf8");
    if (totalBytes + bytes > MAX_TOTAL_SOURCE_BYTES) {
      omittedByByteLimit++;
      continue;
    }
    totalBytes += bytes;
    files.push(file);
  }
  if (!files.length) throw new Error("No supported public source files could be fetched");

  async function optionalRootFile(fileName, maxBytes) {
    const entry = tree.tree.find((item) =>
      item.type === "blob" &&
      item.path.toLowerCase() === fileName.toLowerCase() &&
      item.size <= maxBytes
    );
    if (!entry) return undefined;
    try {
      return await fetchBounded(fetchImpl,
        new URL(rawBase + encodeRawPath(entry.path)), maxBytes, token);
    } catch {
      return undefined;
    }
  }

  const [readme, makefile, dockerfile] = await Promise.all([
    optionalRootFile("README.md", 64 * 1024),
    optionalRootFile("Makefile", 48 * 1024),
    optionalRootFile("Dockerfile", 48 * 1024),
  ]);

  return {
    repository: slug,
    sourceUrl: "https://github.com/" + slug,
    branch,
    commitSha,
    treeSha: typeof tree.sha === "string" ? tree.sha : null,
    files,
    extras: { readme, makefile, dockerfile },
    coverage: {
      selected: selection.length,
      fetched: files.length,
      eligibleSourceFiles: candidates.length,
      omittedByFileLimit: Math.max(0, candidates.length - selection.length),
      failedToFetch: result.filter((file) => !file).length,
      omittedByByteLimit,
      githubTreeTruncated: tree.truncated === true,
      complete:
        tree.truncated !== true &&
        candidates.length <= selection.length &&
        result.every(Boolean) &&
        omittedByByteLimit === 0,
    },
  };
}
