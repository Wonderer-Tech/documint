const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  colon: ":",
  tab: "\t",
  newline: "\n",
};

export function sanitizeRenderedMarkdownUrls(html: string): string {
  return html
    .replace(
      /<a\b[^>]*>/gi,
      (tag) =>
        sanitizeTagUrlAttribute(
          tag,
          "href",
          isSafeMarkdownHref,
        ),
    )
    .replace(
      /<img\b[^>]*>/gi,
      (tag) =>
        sanitizeTagUrlAttribute(
          tag,
          "src",
          isSafeMarkdownImageSrc,
        ),
    );
}

function sanitizeTagUrlAttribute(
  tag: string,
  attribute: "href" | "src",
  isSafe: (value: string) => boolean,
): string {
  const pattern = new RegExp(
    `\\b${attribute}=(["'])([\\s\\S]*?)\\1`,
    "i",
  );
  const match = tag.match(pattern);
  if (!match) {
    return tag;
  }

  const quote = match[1];
  const rawValue = match[2];
  if (isSafe(decodeHtmlAttributeValue(rawValue))) {
    return tag;
  }

  const replacement =
    attribute === "href"
      ? `href=${quote}#${quote} data-documint-blocked-url="true"`
      : `src=${quote}${quote} data-documint-blocked-url="true"`;

  return tag.replace(pattern, replacement);
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
  let decoded = String(value);

  for (let pass = 0; pass < 3; pass++) {
    const next = decodeHtmlAttributeValueOnce(decoded);
    if (next === decoded) {
      break;
    }
    decoded = next;
  }

  return decoded;
}

function decodeHtmlAttributeValueOnce(value: string): string {
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
