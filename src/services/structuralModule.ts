export function structuralModuleName(filePath: string): string {
  const parts = normalizeProjectPath(filePath).split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "(root)";
  }

  const first = parts[0];
  const structuralContainers = new Set([
    "apps",
    "packages",
    "src",
    "app",
    "lib",
    "server",
    "client",
  ]);

  if (parts.length > 2 && structuralContainers.has(first.toLowerCase())) {
    return `${first}/${parts[1]}`;
  }

  return first;
}

export function normalizeProjectPath(value: string): string {
  return String(value).replace(/\\/g, "/").replace(/^\.\//, "");
}
