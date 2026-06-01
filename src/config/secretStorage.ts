import * as vscode from "vscode";

export class SecretStorageManager {
  private static instance: SecretStorageManager;
  private secretStorage: vscode.SecretStorage;

  private constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  public static getInstance(
    context: vscode.ExtensionContext,
  ): SecretStorageManager {
    if (!SecretStorageManager.instance) {
      SecretStorageManager.instance = new SecretStorageManager(context);
    } else {
      SecretStorageManager.instance.secretStorage = context.secrets;
    }
    return SecretStorageManager.instance;
  }

  public async storeApiKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      await this.secretStorage.store(`${provider}-api-key`, apiKey);
      return true;
    } catch (error) {
      console.error(`Failed to store API key for ${provider}:`, error);
      return false;
    }
  }

  public async getApiKey(provider: string): Promise<string | undefined> {
    try {
      return await this.secretStorage.get(`${provider}-api-key`);
    } catch (error) {
      console.error(`Failed to retrieve API key for ${provider}:`, error);
      return undefined;
    }
  }

  public async deleteApiKey(provider: string): Promise<boolean> {
    try {
      await this.secretStorage.delete(`${provider}-api-key`);
      return true;
    } catch (error) {
      console.error(`Failed to delete API key for ${provider}:`, error);
      return false;
    }
  }

  public async validateApiKey(
    provider: string,
    apiKey: string,
  ): Promise<boolean> {
    // Basic validation - different providers have different key formats
    switch (provider) {
      case "openai":
        return apiKey.startsWith("sk-") && apiKey.length > 30;
      case "anthropic":
        return apiKey.startsWith("sk-ant-") && apiKey.length > 40;
      case "openrouter":
        return apiKey.startsWith("sk-or-") && apiKey.length > 40;
      case "deepseek":
        return apiKey.startsWith("sk-") && apiKey.length > 20;
      case "ollama":
      case "lmstudio":
        // Local providers don't need API keys
        return true;
      default:
        // For custom providers, just check minimum length
        return apiKey.length >= 20;
    }
  }
}
