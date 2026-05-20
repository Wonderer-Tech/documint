import * as vscode from "vscode";
import axios from "axios";
import { BaseAIProvider, ApiCallParams } from "./aiProvider";
import { DocumentationResult } from "../types";

/**
 * LM Studio provider — local inference server with an OpenAI-compatible API.
 * Default server: http://localhost:1234
 * https://lmstudio.ai/docs/local-server
 */
export class LMStudioProvider extends BaseAIProvider {
  name = "lmstudio";
  isLocal = true;

  private get baseUrl(): string {
    return (
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("localModelUrl") || "http://localhost:1234"
    );
  }

  protected defaultModel(): string {
    // LM Studio exposes whichever model is loaded — use a placeholder
    return (
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("localModelName") || "local-model"
    );
  }

  protected async callApi(params: ApiCallParams): Promise<DocumentationResult> {
    const timeout =
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<number>("localModelTimeout") || 120000;

    // LM Studio uses the OpenAI /v1/chat/completions wire format
    const response = await axios.post(
      `${this.baseUrl}/v1/chat/completions`,
      {
        model: params.model,
        messages: params.messages,
        temperature: this.temperature,
        max_tokens: params.maxTokens,
        stream: false,
      },
      {
        timeout,
        headers: { "Content-Type": "application/json" },
        // LM Studio doesn't require an auth header but accepts one gracefully
        signal: params.signal,
      },
    );

    return {
      documentation: response.data.choices[0].message.content,
      tokensUsed: response.data.usage?.total_tokens ?? 0,
      model: params.model,
    };
  }

  public async validateConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/v1/models`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Context window depends on the loaded model and its GGUF quantization.
   * We use a conservative default; power users should set this in model config.
   */
  getMaxContextWindow(_model?: string): number {
    return 4096;
  }
}
