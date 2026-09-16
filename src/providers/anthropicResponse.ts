export interface ParsedAnthropicResponse {
  documentation: string;
  tokensUsed: number;
}

/**
 * Extracts documentation text and token usage from an Anthropic Messages API
 * response without depending on Axios. Non-text blocks (thinking, tool use,
 * etc.) are ignored deliberately because DocuMint persists Markdown text only.
 */
export function parseAnthropicResponse(
  payload: unknown,
  providerLabel = "Anthropic",
): ParsedAnthropicResponse {
  const root = getRecord(payload);
  const content = Array.isArray(root?.content) ? root.content : [];
  const documentation = content
    .map((block) => getRecord(block))
    .filter(
      (block): block is Record<string, unknown> =>
        !!block && block.type === "text" && typeof block.text === "string",
    )
    .map((block) => (block.text as string).trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!documentation) {
    throw new Error(`${providerLabel} returned no text content.`);
  }

  const usage = getRecord(root?.usage);
  return {
    documentation,
    tokensUsed:
      normalizeTokenCount(usage?.input_tokens) +
      normalizeTokenCount(usage?.output_tokens),
  };
}

function normalizeTokenCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
