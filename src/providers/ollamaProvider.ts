import * as vscode from "vscode";
import axios from "axios";
import { BaseAIProvider, ApiCallParams } from "./aiProvider";
import { DocumentationResult } from "../types";

/**
 * Ollama provider — runs models locally via the Ollama daemon.
 * Default server: http://localhost:11434
 * https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export class OllamaProvider extends BaseAIProvider {
  name = "ollama";
  isLocal = true;

  private get baseUrl(): string {
    return (
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("localModelUrl") || "http://localhost:11434"
    );
  }

  protected defaultModel(): string {
    return (
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("localModelName") || "llama3"
    );
  }

  protected async callApi(params: ApiCallParams): Promise<DocumentationResult> {
    const timeout =
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<number>("localModelTimeout") || 120000;

    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: params.model,
        messages: params.messages,
        stream: false,
        options: {
          temperature: this.temperature,
          num_predict: params.maxTokens,
        },
      },
      {
        timeout,
        headers: { "Content-Type": "application/json" },
      },
    );

    // Ollama /api/chat response shape: { message: { role, content }, ... }
    const content = response.data.message?.content ?? "";
    const tokensUsed =
      (response.data.prompt_eval_count ?? 0) +
      (response.data.eval_count ?? 0);

    return {
      documentation: content,
      tokensUsed,
      model: params.model,
    };
  }

  public async validateConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Context window varies by model. Ollama doesn't expose this via API,
   * so we use known values for common models.
   */
  getMaxContextWindow(model?: string): number {
    const m = (model || "").toLowerCase();
    if (m.includes("llama3") || m.includes("llama-3")) {
      return 8192;
    }
    if (m.includes("mistral") || m.includes("mixtral")) {
      return 32768;
    }
    if (m.includes("codellama")) {
      return 16384;
    }
    if (m.includes("gemma")) {
      return 8192;
    }
    if (m.includes("phi")) {
      return 4096;
    }
    if (m.includes("qwen")) {
      return 32768;
    }
    if (m.includes("deepseek")) {
      return 16384;
    }
    return 4096; // Conservative default
  }
}
