import * as vscode from "vscode";
import axios, { AxiosError } from "axios";
import { BaseAIProvider, ApiCallParams } from "./aiProvider";
import { DocumentationResult } from "../types";

/**
 * Model aliases map known shorthand names to their full OpenAI model IDs.
 * This allows users to type "gpt-4o-mini" or "4o-mini" and get the correct model.
 */
const MODEL_ALIASE: Record<string, string> = {
  // GPT-4o family
  "gpt-4o": "gpt-4o",
  "4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "4o-mini": "gpt-4o-mini",
  "gpt-4o-2024-05-13": "gpt-4o-2024-05-13",
  "gpt-4o-2024-08-06": "gpt-4o-2024-08-06",
  "gpt-4o-mini-2024-07-18": "gpt-4o-mini-2024-07-18",
  // GPT-4.1 family
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-nano": "gpt-4.1-nano",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "4.1": "gpt-4.1",
  "4.1-nano": "gpt-4.1-nano",
  "4.1-mini": "gpt-4.1-mini",
  // GPT-4 Turbo
  "gpt-4-turbo": "gpt-4-turbo",
  "gpt-4-turbo-preview": "gpt-4-turbo-preview",
  "gpt-4-0125-preview": "gpt-4-0125-preview",
  "gpt-4-1106-preview": "gpt-4-1106-preview",
  "4-turbo": "gpt-4-turbo",
  // GPT-4 base
  "gpt-4": "gpt-4",
  "gpt-4-32k": "gpt-4-32k",
  "gpt-4-0613": "gpt-4-0613",
  "4": "gpt-4",
  // GPT-3.5
  "gpt-3.5-turbo": "gpt-3.5-turbo",
  "gpt-3.5-turbo-0125": "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-1106": "gpt-3.5-turbo-1106",
  "3.5-turbo": "gpt-3.5-turbo",
  "3.5": "gpt-3.5-turbo",
  // o1 series
  o1: "o1",
  "o1-mini": "o1-mini",
  "o1-preview": "o1-preview",
  "o1-2024-12-17": "o1-2024-12-17",
  "o1-mini-2024-09-12": "o1-mini-2024-09-12",
  // o3 series
  o3: "o3",
  "o3-mini": "o3-mini",
  "o3-mini-2025-01-31": "o3-mini-2025-01-31",
  // GPT-5 family (forward compatibility)
  "gpt-5": "gpt-5",
  "gpt-5-nano": "gpt-5-nano",
  "gpt-5-mini": "gpt-5-mini",
  "gpt-5.4-nano": "gpt-5.4-nano",
  "gpt-5.4-mini": "gpt-5.4-mini",
  "gpt-5.4": "gpt-5.4",
  "5": "gpt-5",
  "5-nano": "gpt-5-nano",
  "5-mini": "gpt-5-mini",
};

/**
 * Known model patterns used for capability detection (context window, max output).
 * New models should be added here as they become available.
 */
const MODEL_PATTERNS = {
  // GPT-5 family
  gpt5: {
    match: (m: string) => m.includes("gpt-5") || m.includes("gpt-5.4"),
    contextWindow: 200000,
    maxOutput: 32768,
  },
  gpt5Nano: {
    match: (m: string) => m.includes("gpt-5") && m.includes("nano"),
    contextWindow: 128000,
    maxOutput: 16384,
  },
  gpt5Mini: {
    match: (m: string) => m.includes("gpt-5") && m.includes("mini"),
    contextWindow: 128000,
    maxOutput: 32768,
  },
  // GPT-4.1 family
  gpt41: {
    match: (m: string) => m.includes("gpt-4.1") || m.includes("gpt-4-1"),
    contextWindow: 1000000,
    maxOutput: 32768,
  },
  gpt41Nano: {
    match: (m: string) =>
      (m.includes("gpt-4.1") || m.includes("gpt-4-1")) && m.includes("nano"),
    contextWindow: 128000,
    maxOutput: 32768,
  },
  gpt41Mini: {
    match: (m: string) =>
      (m.includes("gpt-4.1") || m.includes("gpt-4-1")) && m.includes("mini"),
    contextWindow: 128000,
    maxOutput: 32768,
  },
  // GPT-4o family
  gpt4o: {
    match: (m: string) => m.includes("gpt-4o"),
    contextWindow: 128000,
    maxOutput: 16384,
  },
  gpt4oMini: {
    match: (m: string) => m.includes("gpt-4o") && m.includes("mini"),
    contextWindow: 128000,
    maxOutput: 16384,
  },
  // o1 series
  o1: {
    match: (m: string) => m === "o1" || m.startsWith("o1-"),
    contextWindow: 200000,
    maxOutput: 100000,
  },
  o1Mini: {
    match: (m: string) => m.includes("o1-mini"),
    contextWindow: 128000,
    maxOutput: 65536,
  },
  o1Preview: {
    match: (m: string) => m.includes("o1-preview"),
    contextWindow: 128000,
    maxOutput: 32768,
  },
  // o3 series
  o3: {
    match: (m: string) => m === "o3" || m.startsWith("o3-"),
    contextWindow: 200000,
    maxOutput: 100000,
  },
  o3Mini: {
    match: (m: string) => m.includes("o3-mini"),
    contextWindow: 128000,
    maxOutput: 65536,
  },
  // GPT-4 Turbo
  gpt4Turbo: {
    match: (m: string) =>
      m.includes("gpt-4-turbo") ||
      m.includes("gpt-4-0125") ||
      m.includes("gpt-4-1106"),
    contextWindow: 128000,
    maxOutput: 4096,
  },
  // GPT-4 base
  gpt4: {
    match: (m: string) =>
      m.includes("gpt-4") &&
      !m.includes("turbo") &&
      !m.includes("4o") &&
      !m.includes("4.1"),
    contextWindow: 8192,
    maxOutput: 8192,
  },
  gpt432k: {
    match: (m: string) => m.includes("gpt-4-32k"),
    contextWindow: 32768,
    maxOutput: 8192,
  },
  // GPT-3.5
  gpt35: {
    match: (m: string) => m.includes("gpt-3.5"),
    contextWindow: 16385,
    maxOutput: 4096,
  },
};

export class OpenAIProvider extends BaseAIProvider {
  name = "openai";
  isLocal = false;

  private readonly endpoint = "https://api.openai.com/v1/chat/completions";

  /**
   * Resolves a model name to its canonical OpenAI ID using the alias map.
   * Falls back to the original name for forward compatibility with new models.
   */
  private resolveModelName(model: string): string {
    const lower = model.toLowerCase().trim();
    return MODEL_ALIASE[lower] ?? model;
  }

  protected defaultModel(): string {
    return "gpt-4o-mini";
  }

  /**
   * Returns true for models that require `max_completion_tokens` instead of
   * `max_tokens` and do not support the `temperature` parameter.
   * Applies to: o1, o3, gpt-4.1 family, gpt-5 family.
   */
  private usesCompletionTokensParam(model: string): boolean {
    const m = model.toLowerCase();
    return (
      m.startsWith("o1") ||
      m.startsWith("o3") ||
      m.includes("gpt-4.1") ||
      m.includes("gpt-4-1") ||
      m.includes("gpt-5")
    );
  }

  protected async callApi(params: ApiCallParams): Promise<DocumentationResult> {
    const resolvedModel = this.resolveModelName(params.model);
    const newStyleTokens = this.usesCompletionTokensParam(resolvedModel);

    // Build request body — newer models use max_completion_tokens, not max_tokens,
    // and do not accept the temperature parameter.
    const body: Record<string, unknown> = {
      model: resolvedModel,
      messages: params.messages,
      ...(newStyleTokens
        ? { max_completion_tokens: params.maxTokens }
        : { temperature: this.temperature, max_tokens: params.maxTokens }),
    };

    try {
      const response = await axios.post(
        this.endpoint,
        body,
        {
          headers: {
            Authorization: `Bearer ${params.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        documentation: response.data.choices[0].message.content,
        tokensUsed: response.data.usage.total_tokens,
        model: resolvedModel,
      };
    } catch (error) {
      const axErr = error as AxiosError<{
        error?: { message?: string; code?: string; type?: string };
      }>;

      if (axErr.response) {
        const status = axErr.response.status;
        const apiError = axErr.response.data?.error;
        const apiMessage = apiError?.message ?? axErr.response.statusText;

        if (status === 400) {
          throw new Error(
            `OpenAI API rejected the request (400 Bad Request): ${apiMessage}\n\n` +
              `This usually means the model "${params.model}" is not valid or not available. ` +
              `Check your model name in VS Code settings (aiDocGenerator.model).`,
          );
        }

        if (status === 401) {
          throw new Error(
            `OpenAI API authentication failed (401 Unauthorized): ${apiMessage}\n\n` +
              `Your API key may be invalid or expired. ` +
              `Use the "Configure API Key" command to update it.`,
          );
        }

        if (status === 403) {
          throw new Error(
            `OpenAI API access denied (403 Forbidden): ${apiMessage}\n\n` +
              `Your account may not have permission to use model "${resolvedModel}". ` +
              `Check your OpenAI account settings and billing status.`,
          );
        }

        if (status === 429) {
          throw new Error(
            `OpenAI API rate limit exceeded (429 Too Many Requests): ${apiMessage}\n\n` +
              `You have sent too many requests. Wait a moment and try again. ` +
              `Consider increasing aiDocGenerator.rateLimitDelay in settings.`,
          );
        }

        if (status >= 500) {
          throw new Error(
            `OpenAI API server error (${status} Server Error): ${apiMessage}\n\n` +
              `This is a temporary issue on OpenAI's side. Try again later.`,
          );
        }

        throw new Error(`OpenAI API error (${status}): ${apiMessage}`);
      }

      if (axErr.request) {
        throw new Error(
          `Network error: Could not reach OpenAI API. ` +
            `Check your internet connection and firewall settings.\n\n` +
            `Original error: ${axErr.message}`,
        );
      }

      throw new Error(`Unexpected error during API call: ${axErr.message}`);
    }
  }

  protected getMaxOutputTokens(model?: string): number {
    const m = (model || "").toLowerCase();

    for (const [, pattern] of Object.entries(MODEL_PATTERNS)) {
      if (pattern.match(m)) {
        return pattern.maxOutput;
      }
    }

    // Safe default for unknown models
    return 8192;
  }

  getMaxContextWindow(model?: string): number {
    const m = (model || "").toLowerCase();

    for (const [, pattern] of Object.entries(MODEL_PATTERNS)) {
      if (pattern.match(m)) {
        return pattern.contextWindow;
      }
    }

    // Safe default for unknown models
    return 8192;
  }
}
