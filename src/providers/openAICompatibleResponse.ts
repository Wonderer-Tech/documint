export interface ParsedOpenAICompatibleResponse {
  documentation: string;
  tokensUsed: number;
}

export function parseOpenAICompatibleResponse(
  data: unknown,
  providerLabel: string,
): ParsedOpenAICompatibleResponse {
  const root = asRecord(data);
  const choices = Array.isArray(root?.choices) ? root.choices : [];
  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice?.message);
  const documentation = extractContentText(message?.content).trim();

  if (!documentation) {
    throw new Error(`${providerLabel} returned no text documentation content.`);
  }

  const usage = asRecord(root?.usage);
  const totalTokens = usage?.total_tokens;
  const tokensUsed =
    typeof totalTokens === "number" && Number.isFinite(totalTokens)
      ? Math.max(0, Math.floor(totalTokens))
      : 0;

  return { documentation, tokensUsed };
}

function extractContentText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      const block = asRecord(part);
      if (!block) {
        return "";
      }

      if (typeof block.text === "string") {
        return block.text;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
