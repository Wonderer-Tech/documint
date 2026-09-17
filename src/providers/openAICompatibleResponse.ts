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
  const tokensUsed = resolveUsageTokens(usage);

  return { documentation, tokensUsed };
}

function resolveUsageTokens(
  usage: Record<string, unknown> | undefined,
): number {
  const explicitTotal = normalizeTokenCount(usage?.total_tokens);
  if (explicitTotal !== undefined) {
    return explicitTotal;
  }

  const promptTokens = normalizeTokenCount(usage?.prompt_tokens);
  const completionTokens = normalizeTokenCount(usage?.completion_tokens);
  if (promptTokens !== undefined || completionTokens !== undefined) {
    return (promptTokens ?? 0) + (completionTokens ?? 0);
  }

  const inputTokens = normalizeTokenCount(usage?.input_tokens);
  const outputTokens = normalizeTokenCount(usage?.output_tokens);
  if (inputTokens !== undefined || outputTokens !== undefined) {
    return (inputTokens ?? 0) + (outputTokens ?? 0);
  }

  return 0;
}

function normalizeTokenCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
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
