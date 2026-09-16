export interface ApiKeyValidationResult {
  valid: boolean;
  reason?: string;
}

const PLACEHOLDER_VALUES = new Set([
  "api-key",
  "apikey",
  "your-api-key",
  "your_api_key",
  "yourapikey",
  "token",
  "secret",
  "sk-...",
  "sk-ant-...",
  "sk-or-...",
]);

/**
 * Performs only local sanity checks. Provider key formats evolve over time, so
 * DocuMint deliberately avoids hard-coding provider-specific prefixes here.
 * Definitive authentication still happens when the provider is contacted.
 */
export function validateApiKeyValue(apiKey: string): ApiKeyValidationResult {
  const value = apiKey.trim();

  if (!value) {
    return { valid: false, reason: "API key cannot be empty." };
  }

  if (value.length < 12) {
    return { valid: false, reason: "API key is too short." };
  }

  if (/\s/.test(value)) {
    return {
      valid: false,
      reason: "API key cannot contain whitespace or line breaks.",
    };
  }

  if (PLACEHOLDER_VALUES.has(value.toLowerCase())) {
    return { valid: false, reason: "Enter a real API key, not a placeholder." };
  }

  if (/^[*._-]+$/.test(value)) {
    return { valid: false, reason: "API key does not look valid." };
  }

  return { valid: true };
}
