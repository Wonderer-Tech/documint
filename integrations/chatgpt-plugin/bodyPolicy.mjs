/** Bounded JSON parser. Error messages deliberately exclude user input. */
export class HttpRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpRequestError";
    this.status = status;
  }
}

export async function readMcpBody(request, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError("Invalid MCP body-byte limit");
  }
  const mediaType = request.headers["content-type"];
  if (typeof mediaType !== "string" ||
      !/^application\/json(?:\s*;\s*charset\s*=\s*utf-8)?\s*$/i.test(mediaType)) {
    throw new HttpRequestError(415, "MCP requests must use application/json");
  }
  const encoding = request.headers["content-encoding"];
  if (encoding !== undefined && encoding !== "identity") {
    throw new HttpRequestError(415, "Compressed MCP requests are not supported");
  }
  const declared = request.headers["content-length"];
  if (declared !== undefined) {
    if (typeof declared !== "string" || !/^\d+$/.test(declared) ||
        !Number.isSafeInteger(Number(declared))) {
      throw new HttpRequestError(400, "Invalid Content-Length");
    }
    if (Number(declared) > maxBytes) {
      throw new HttpRequestError(413, "MCP request body exceeds limit");
    }
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new HttpRequestError(413, "MCP request body exceeds limit");
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
  } catch {
    throw new HttpRequestError(400, "Invalid MCP JSON body");
  }
}
