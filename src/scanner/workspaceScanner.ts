import * as vscode from "vscode";
import * as path from "path";
import { WorkspaceFile } from "../types";

/**
 * Maps file extensions to language identifiers
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescriptreact",
  js: "javascript",
  jsx: "javascriptreact",
  py: "python",
  java: "java",
  cpp: "cpp",
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

const LANGUAGE_TO_EXTENSIONS: Record<string, string[]> = {
  typescript: ["ts", "tsx"],
  typescriptreact: ["tsx"],
  javascript: ["js", "jsx"],
  javascriptreact: ["jsx"],
  python: ["py"],
  java: ["java"],
  cpp: ["cpp"],
  c: ["c"],
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

/**
 * Default patterns to exclude from scanning
 */
const DEFAULT_EXCLUDE_PATTERNS = [
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

export interface ScannerConfig {
  excludePatterns?: string[];
  includePatterns?: string[];
  targetLanguages?: string[];
  /** Optional scanner-level safety cap in bytes. Unset means no size cap. */
  maxFileSize?: number;
}

export class WorkspaceScanner {
  private config: ScannerConfig;

  constructor(config: ScannerConfig = {}) {
    this.config = config;
  }

  /**
   * Scans the workspace and returns a list of files eligible for documentation
   */
  async scanWorkspace(
    workspaceFolder: vscode.WorkspaceFolder,
  ): Promise<WorkspaceFile[]> {
    const files: WorkspaceFile[] = [];
    const resolvedConfig = this.resolveConfig(workspaceFolder);
    const excludePatterns = resolvedConfig.excludePatterns;

    // Build exclusion string for findFiles - use glob pattern syntax
    const excludeGlob = `{${excludePatterns.join(",")}}`;
    const includeGlob = this.buildIncludeGlob(resolvedConfig);

    // Get files only from the requested workspace root.
    const allFiles = (
      await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, includeGlob),
        excludeGlob,
      )
    ).sort((a, b) => a.fsPath.localeCompare(b.fsPath));

    // Secondary filter: ensure no files from excluded directories slip through
    const excludedDirs = excludePatterns
      .filter((p) => p.startsWith("**/") && p.endsWith("/**"))
      .map((p) => p.replace(/^\*\*\//, "").replace(/\/\*\*$/, ""));

    for (const uri of allFiles) {
      const fsPath = uri.fsPath.toLowerCase();

      // Strict secondary filter: check if path contains any excluded directory
      const shouldSkip = excludedDirs.some(
        (dir) =>
          fsPath.includes(`/${dir.toLowerCase()}/`) ||
          fsPath.includes(`\\${dir.toLowerCase()}\\`) ||
          fsPath.endsWith(`/${dir.toLowerCase()}`) ||
          fsPath.endsWith(`\\${dir.toLowerCase()}`),
      );

      if (shouldSkip) {
        continue;
      }

      // Get relative path within the selected workspace root.
      const relativePath = path
        .relative(workspaceFolder.uri.fsPath, uri.fsPath)
        .replace(/\\/g, "/");

      try {
        // Large source files should reach the provider layer, which already
        // handles context-window-aware chunking. Only enforce a scanner-level
        // size cap when one is explicitly supplied by the caller.
        if (Number.isFinite(resolvedConfig.maxFileSize)) {
          const stat = await vscode.workspace.fs.stat(uri);
          if (stat.size > resolvedConfig.maxFileSize) {
            continue;
          }
        }

        const content = await vscode.workspace.fs.readFile(uri);
        const text = Buffer.from(content).toString("utf-8");
        const language = this.getLanguageFromPath(uri.fsPath);

        if (language) {
          files.push({
            path: relativePath,
            language,
            content: text,
          });
        }
      } catch (error) {
        console.warn(`Failed to read file ${relativePath}:`, error);
      }
    }

    return files;
  }

  private resolveConfig(workspaceFolder: vscode.WorkspaceFolder): Required<ScannerConfig> {
    const settings = vscode.workspace.getConfiguration(
      "aiDocGenerator",
      workspaceFolder.uri,
    );
    const configuredExcludePatterns =
      settings.get<string[]>("excludePatterns") ?? [];

    return {
      excludePatterns: Array.from(
        new Set([
          ...DEFAULT_EXCLUDE_PATTERNS,
          ...configuredExcludePatterns,
          ...(this.config.excludePatterns ?? []),
        ]),
      ),
      includePatterns: this.config.includePatterns ?? [],
      targetLanguages:
        this.config.targetLanguages ??
        settings.get<string[]>("targetLanguages") ??
        Object.keys(LANGUAGE_TO_EXTENSIONS),
      maxFileSize: this.config.maxFileSize ?? Number.POSITIVE_INFINITY,
    };
  }

  private buildIncludeGlob(config: Required<ScannerConfig>): string {
    if (config.includePatterns.length > 0) {
      return this.toBraceGlob(config.includePatterns);
    }

    const extensions = this.getTargetExtensions(config.targetLanguages);
    return this.toBraceGlob(extensions.map((ext) => `**/*.${ext}`));
  }

  private toBraceGlob(patterns: string[]): string {
    if (patterns.length === 1) {
      return patterns[0];
    }
    return `{${patterns.join(",")}}`;
  }

  private getTargetExtensions(targetLanguages: string[]): string[] {
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

  /**
   * Determines the language from a file path
   */
  private getLanguageFromPath(filePath: string): string | undefined {
    const ext = filePath.split(".").pop()?.toLowerCase();
    return ext ? EXTENSION_TO_LANGUAGE[ext] : undefined;
  }

  /**
   * Gets the total token count for all files (approximate)
   */
  getTotalTokenCount(files: WorkspaceFile[]): number {
    // Approximate: 1 token ~ 4 characters
    const totalChars = files.reduce((sum, f) => sum + f.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
}
