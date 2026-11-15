/**
 * Explicit HTTP Host allowlist protects loopback and tunneled MCP services
 * from DNS-rebinding requests. Never trust X-Forwarded-Host.
 */
const DEFAULT_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/i;

export function parseAllowedHosts(raw) {
  const allowed = new Set(DEFAULT_HOSTS);
  if (raw === undefined || raw === null || raw === "") return allowed;
  if (typeof raw !== "string") throw new TypeError("Invalid host allowlist");
  for (const item of raw.split(",")) {
    const hostname = item.trim().toLowerCase();
    if (!hostname || (hostname !== "[::1]" && !DOMAIN.test(hostname))) {
      throw new Error("Invalid host in MCP_ALLOWED_HOSTS");
    }
    allowed.add(hostname);
  }
  return allowed;
}

export function isTrustedHttpHost(value, allowedHosts) {
  if (typeof value !== "string" || !value ||
      /[\s/@?#\\]/.test(value)) return false;
  let hostname;
  let port;
  if (value.startsWith("[")) {
    const match = /^(\[::1\])(?::([0-9]{1,5}))?$/i.exec(value);
    if (!match) return false;
    [, hostname, port] = match;
  } else {
    const match = /^([a-z0-9.-]+)(?::([0-9]{1,5}))?$/i.exec(value);
    if (!match) return false;
    [, hostname, port] = match;
    if (!DOMAIN.test(hostname)) return false;
  }
  if (port !== undefined && (Number(port) < 1 || Number(port) > 65535)) {
    return false;
  }
  return allowedHosts.has(hostname.toLowerCase());
}
