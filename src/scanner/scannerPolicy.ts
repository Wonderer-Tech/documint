import * as path from "path";

export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "typescriptreact",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascriptreact",
  py: "python",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  h: "c",
  hh: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  c: "c",
  cs: "csharp",
  go: "go",
  rs: "rust",
  php: "php",
  rb: "ruby",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  sh: "shell",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
  xml: "xml",
  html: "html",
  css: "css",
  scss: "scss",
  sql: "sql",
};

export const LANGUAGE_TO_EXTENSIONS: Record<string, string[]> = {
  typescript: ["ts", "mts", "cts", "tsx"],
  typescriptreact: ["tsx"],
  javascript: ["js", "mjs", "cjs", "jsx"],
  javascriptreact: ["jsx"],
  python: ["py"],
  java: ["java"],
  cpp: ["cpp", "cc", "cxx", "hh", "hpp", "hxx"],
  c: ["c", "h"],
  csharp: ["cs"],
  go: ["go"],
  rust: ["rs"],
  php: ["php"],
  ruby: ["rb"],
  swift: ["swift"],
  kotlin: ["kt"],
  scala: ["scala"],
  shell: ["sh"],
  yaml: ["yaml", "yml"],
  json: ["json"],
  xml: ["xml"],
  html: ["html"],
  css: ["css"],
  scss: ["scss"],
  sql: ["sql"],
};

export const DEFAULT_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.svelte-kit/**",
  "**/.angular/**",
  "**/.git/**",
  "**/.vscode/**",
  "**/.idea/**",
  "**/docs/**",
  "**/coverage/**",
  "**/*.min.*",
  "**/*.test.*",
  "**/*.spec.*",
  "**/*.d.ts",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
  "**/.env*",
  "**/*.log",
];

const EXPLICIT_FOLDER_OVERRIDE_PATTERNS = new Set([
  "**/*.test.*",
  "**/*.spec.*",
]);

export function buildWorkspaceExcludePatterns(
  configured: string[] = [],
  programmatic: string[] = [],
): string[] {
  return uniqueStrings([
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...configured,
    ...programmatic,
  ]);
}

export function buildExplicitFolderExcludePatterns(
  configured: string[] = [],
  programmatic: string[] = [],
): string[] {
  return uniqueStrings([
    ...DEFAULT_EXCLUDE_PATTERNS.filter(
      (pattern) => !EXPLICIT_FOLDER_OVERRIDE_PATTERNS.has(pattern),
    ),
    ...configured,
    ...programmatic,
  ]);
}

export function getDefaultTargetLanguages(): string[] {
  return Object.keys(LANGUAGE_TO_EXTENSIONS);
}

export function getTargetExtensions(targetLanguages: string[]): string[] {
  const extensions = new Set<string>();

  for (const value of targetLanguages) {
    const normalized = value.toLowerCase().replace(/^\./, "");

    for (const ext of LANGUAGE_TO_EXTENSIONS[normalized] ?? []) {
      extensions.add(ext);
    }

    if (EXTENSION_TO_LANGUAGE[normalized]) {
      extensions.add(normalized);
    }
  }

  if (extensions.size === 0) {
    Object.keys(EXTENSION_TO_LANGUAGE).forEach((ext) => extensions.add(ext));
  }

  return Array.from(extensions).sort();
}

export function getLanguageFromPath(filePath: string): string | undefined {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ext ? EXTENSION_TO_LANGUAGE[ext] : undefined;
}

export function normalizeFsPath(filePath: string): string {
  return path.resolve(filePath).replace(/\\/g, "/");
}

export function isInsideWorkspace(
  workspaceRoot: string,
  targetPath: string,
): boolean {
  const relative = path.relative(
    path.resolve(workspaceRoot),
    path.resolve(targetPath),
  );
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
