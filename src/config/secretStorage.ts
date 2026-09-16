import * as vscode from "vscode";
import { validateApiKeyValue } from "./apiKeyValidation";

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
    _provider: string,
    apiKey: string,
  ): Promise<boolean> {
    return validateApiKeyValue(apiKey).valid;
  }
}
