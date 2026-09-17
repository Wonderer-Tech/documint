import * as vscode from "vscode";
import { validateApiKeyValue } from "./apiKeyValidation";

export class SecretStorageManager {
  private static instance: SecretStorageManager;
  private static credentialRevisions = new Map<string, number>();
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

  public static getCredentialRevision(provider: string): number {
    return this.credentialRevisions.get(this.normalizeProvider(provider)) ?? 0;
  }

  private static bumpCredentialRevision(provider: string): void {
    const normalized = this.normalizeProvider(provider);
    this.credentialRevisions.set(
      normalized,
      (this.credentialRevisions.get(normalized) ?? 0) + 1,
    );
  }

  private static normalizeProvider(provider: string): string {
    return provider.trim().toLowerCase();
  }

  private static secretKey(provider: string): string {
    return `${this.normalizeProvider(provider)}-api-key`;
  }

  public async storeApiKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      // Validation already treats leading/trailing whitespace as paste noise.
      // Persist the same normalized value so a key that passes validation does
      // not later fail authentication because invisible whitespace was stored.
      await this.secretStorage.store(
        SecretStorageManager.secretKey(provider),
        apiKey.trim(),
      );
      SecretStorageManager.bumpCredentialRevision(provider);
      return true;
    } catch (error) {
      console.error(`Failed to store API key for ${provider}:`, error);
      return false;
    }
  }

  public async getApiKey(provider: string): Promise<string | undefined> {
    try {
      return await this.secretStorage.get(
        SecretStorageManager.secretKey(provider),
      );
    } catch (error) {
      console.error(`Failed to retrieve API key for ${provider}:`, error);
      return undefined;
    }
  }

  public async deleteApiKey(provider: string): Promise<boolean> {
    try {
      await this.secretStorage.delete(SecretStorageManager.secretKey(provider));
      SecretStorageManager.bumpCredentialRevision(provider);
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
