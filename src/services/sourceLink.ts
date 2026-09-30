export function encodeSourcePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function relativeSourceHref(
  filePath: string,
  line?: number,
): string {
  const encoded = String(filePath)
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map(encodeSourcePathSegment)
    .join("/");

  return `../${encoded}${line ? `#L${line}` : ""}`;
}
