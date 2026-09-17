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

    if (url.username || url.password) {
      return {
        valid: false,
        normalizedEndpoint,
        isLocal: false,
        reason:
          "Custom Endpoint URL must not include embedded credentials. Configure API credentials separately instead.",
      };
    }

    if (url.hash) {
      return {
        valid: false,
        normalizedEndpoint,
        isLocal: false,
        reason:
          "Custom Endpoint URL must not include a fragment (#...). URL fragments are not sent to the provider.",
      };
    }

    const isLocal = isLoopbackHost(url.hostname);
    if (url.protocol === "http:" && !isLocal) {
      return {
        valid: false,
        normalizedEndpoint,
        isLocal: false,
        reason:
          "Remote custom endpoints must use HTTPS. Plain HTTP is allowed only for localhost or loopback endpoints.",
      };
    }

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

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1" || host.endsWith(".localhost")) {
    return true;
  }

  return /^127(?:\.\d{1,3}){3}$/.test(host);
}
