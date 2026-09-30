const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  colon: ":",
  tab: "\t",
  newline: "\n",
};

export function sanitizeRenderedMarkdownUrls(html: string): string {
  return html.replace(
    /\b(href|src)=(["'])([\s\S]*?)\2/gi,
    (full, attribute: string, quote: string, rawValue: string) => {
      const decoded = decodeHtmlAttributeValue(rawValue);
      const safe =
        attribute.toLowerCase() === "href"
          ? isSafeMarkdownHref(decoded)
          : isSafeMarkdownImageSrc(decoded);

      if (safe) {
        return full;
      }

      return attribute.toLowerCase() === "href"
        ? `href=${quote}#${quote} data-documint-blocked-url="true"`
        : `src=${quote}${quote} data-documint-blocked-url="true"`;
    },
  );
}

export function isSafeMarkdownHref(value: string): boolean {
  const normalized = normalizeUrlForPolicy(value);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("//") || normalized.startsWith("\\\\")) {
    return false;
  }

  const scheme = getScheme(normalized);
  if (!scheme) {
    return true;
  }

  return scheme === "http" || scheme === "https" || scheme === "mailto";
}

export function isSafeMarkdownImageSrc(value: string): boolean {
  const normalized = normalizeUrlForPolicy(value);
  if (!normalized) {
    return false;
  }

  if (/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(normalized)) {
    return true;
  }

  if (normalized.startsWith("//")) {
    return false;
  }

  return getScheme(normalized) === undefined;
}

function getScheme(value: string): string | undefined {
  const match = value.match(/^([a-z][a-z0-9+.-]*):/i);
  return match ? match[1].toLowerCase() : undefined;
}

function normalizeUrlForPolicy(value: string): string {
  return decodeHtmlAttributeValue(value)
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, "")
    .trim();
}

function decodeHtmlAttributeValue(value: string): string {
  return String(value)
    .replace(/&#x([0-9a-f]+);?/gi, (_match, hex: string) =>
      safeCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);?/g, (_match, decimal: string) =>
      safeCodePoint(parseInt(decimal, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      return HTML_ENTITY_MAP[name.toLowerCase()] ?? match;
    });
}

function safeCodePoint(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) {
    return "";
  }

  try {
    return String.fromCodePoint(value);
  } catch {
    return "";
  }
}
