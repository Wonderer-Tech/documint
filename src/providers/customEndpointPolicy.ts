export interface CustomEndpointPolicyResult {
  valid: boolean;
  normalizedEndpoint: string;
  isLocal: boolean;
  reason?: string;
}

export function evaluateCustomEndpoint(
  endpoint: string | undefined,
): CustomEndpointPolicyResult {
  const normalizedEndpoint = endpoint?.trim() ?? "";
  if (!normalizedEndpoint) {
    return {
      valid: false,
      normalizedEndpoint,
      isLocal: false,
      reason: "Custom Endpoint URL is required.",
    };
  }

  try {
    const url = new URL(normalizedEndpoint);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        valid: false,
        normalizedEndpoint,
        isLocal: false,
        reason: "Custom Endpoint URL must use http or https.",
      };
    }

    const host = url.hostname.toLowerCase();
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".localhost");

    return {
      valid: true,
      normalizedEndpoint,
      isLocal,
    };
  } catch {
    return {
      valid: false,
      normalizedEndpoint,
      isLocal: false,
      reason: "Custom Endpoint URL must be a valid http or https URL.",
    };
  }
}
