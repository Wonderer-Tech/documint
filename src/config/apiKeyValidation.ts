export interface ApiKeyValidationResult {
  valid: boolean;
  reason?: string;
}

export interface ApiKeyValidationOptions {
  minimumLength?: number;
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
 * Callers may lower the default length sanity check for custom endpoints whose
 * bearer-token format is intentionally provider-defined. Definitive
 * authentication still happens when the provider is contacted.
 */
export function validateApiKeyValue(
  apiKey: string,
  options: ApiKeyValidationOptions = {},
): ApiKeyValidationResult {
  const value = apiKey.trim();
  const minimumLength =
    Number.isFinite(options.minimumLength) && (options.minimumLength ?? 0) > 0
      ? Math.max(1, Math.floor(options.minimumLength!))
      : 12;

  if (!value) {
    return { valid: false, reason: "API key cannot be empty." };
  }

  if (value.length < minimumLength) {
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
