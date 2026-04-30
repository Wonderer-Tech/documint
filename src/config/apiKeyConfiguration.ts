import * as vscode from "vscode";
import { SecretStorageManager } from "./secretStorage";

export class ApiKeyConfiguration {
  private secretManager: SecretStorageManager;

  constructor(private context: vscode.ExtensionContext) {
    this.secretManager = SecretStorageManager.getInstance(context);
  }

  public async configureApiKey() {
    const provider = await this.selectAiProvider();
    if (!provider) return;

    const apiKey = await this.inputApiKey(provider);
    if (!apiKey) return;

    const isValid = await this.secretManager.validateApiKey(provider, apiKey);
    if (!isValid) {
      vscode.window.showErrorMessage(`Invalid API key format for ${provider}`);
      return;
    }

    const stored = await this.secretManager.storeApiKey(provider, apiKey);
    if (stored) {
      vscode.window.showInformationMessage(
        `API key for ${provider} stored successfully`,
      );
    } else {
      vscode.window.showErrorMessage(`Failed to store API key for ${provider}`);
    }
  }

  private async selectAiProvider(): Promise<string | undefined> {
    const providers = [
      "openai",
      "anthropic",
      "openrouter",
      "custom",
      "ollama",
      "lmstudio",
    ];

    const selected = await vscode.window.showQuickPick(providers, {
      placeHolder: "Select AI provider",
      title: "Configure API Key",
    });

    return selected;
  }

  private async inputApiKey(provider: string): Promise<string | undefined> {
    if (provider === "ollama" || provider === "lmstudio") {
      vscode.window.showInformationMessage(`No API key needed for ${provider}`);
      return "";
    }

    return await vscode.window.showInputBox({
      prompt: `Enter API key for ${provider}`,
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim() === "") {
          return "API key cannot be empty";
        }
        return null;
      },
    });
  }
}
