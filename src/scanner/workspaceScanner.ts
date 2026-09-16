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

const EXPLICIT_FOLDER_OVERRIDE_PATTERNS = new Set([
  "**/*.test.*",
  "**/*.spec.*",
]);

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
   * Scans the workspace and returns a list of files eligible for documentation.
   * When targetPaths are supplied, discovery is scoped to those exact files or
   * folders instead of scanning the full workspace and filtering afterwards.
   */
  async scanWorkspace(
    workspaceFolder: vscode.WorkspaceFolder,
    targetPaths?: string[],
  ): Promise<WorkspaceFile[]> {
    const files: WorkspaceFile[] = [];
    const resolvedConfig = this.resolveConfig(workspaceFolder);
    const includeGlob = this.buildIncludeGlob(resolvedConfig);
    const explicitFiles = new Set<string>();

    let excludePatterns = resolvedConfig.excludePatterns;
    let allFiles: vscode.Uri[];

    if (targetPaths && targetPaths.length > 0) {
      // A deliberate folder selection should include test/spec source files,
      // while still excluding vendor/build/generated/noise paths. An exact file
      // selection overrides file-name exclusions entirely.
      excludePatterns = resolvedConfig.excludePatterns.filter(
        (pattern) => !EXPLICIT_FOLDER_OVERRIDE_PATTERNS.has(pattern),
      );
      const excludeGlob = this.toBraceGlob(excludePatterns);
      const selectedFiles: vscode.Uri[] = [];

      for (const targetPath of targetPaths) {
        const absoluteTarget = path.resolve(targetPath);
        if (!this.isInsideWorkspace(workspaceFolder.uri.fsPath, absoluteTarget)) {
          continue;
        }

        const targetUri = vscode.Uri.file(absoluteTarget);
        try {
          const stat = await vscode.workspace.fs.stat(targetUri);
          if ((stat.type & vscode.FileType.File) !== 0) {
            explicitFiles.add(this.normalizeFsPath(targetUri.fsPath));
            selectedFiles.push(targetUri);
            continue;
          }

          if ((stat.type & vscode.FileType.Directory) !== 0) {
            const matches = await vscode.workspace.findFiles(
              new vscode.RelativePattern(absoluteTarget, includeGlob),
              excludeGlob,
            );
            selectedFiles.push(...matches);
          }
        } catch (error) {
          console.warn(`Failed to inspect selected path ${absoluteTarget}:`, error);
        }
      }

      allFiles = this.uniqueSortedUris(selectedFiles);
    } else {
      const excludeGlob = this.toBraceGlob(excludePatterns);
      allFiles = (
        await vscode.workspace.findFiles(
          new vscode.RelativePattern(workspaceFolder, includeGlob),
          excludeGlob,
        )
      ).sort((a, b) => a.fsPath.localeCompare(b.fsPath));
    }

    // Secondary filter: ensure no files from excluded directories slip through.
    // Exact user-selected files intentionally bypass this directory filter.
    const excludedDirs = excludePatterns
      .filter((p) => p.startsWith("**/") && p.endsWith("/**"))
      .map((p) => p.replace(/^\*\*\//, "").replace(/\/\*\*$/, ""));

    for (const uri of allFiles) {
      const normalizedPath = this.normalizeFsPath(uri.fsPath);
      const isExplicitFile = explicitFiles.has(normalizedPath);
      const fsPath = uri.fsPath.toLowerCase();

      const shouldSkip =
        !isExplicitFile &&
        excludedDirs.some(
          (dir) =>
            fsPath.includes(`/${dir.toLowerCase()}/`) ||
            fsPath.includes(`\\${dir.toLowerCase()}\\`) ||
            fsPath.endsWith(`/${dir.toLowerCase()}`) ||
            fsPath.endsWith(`\\${dir.toLowerCase()}`),
        );

      if (shouldSkip) {
        continue;
      }

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

  private resolveConfig(
    workspaceFolder: vscode.WorkspaceFolder,
  ): Required<ScannerConfig> {
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

  private uniqueSortedUris(uris: vscode.Uri[]): vscode.Uri[] {
    const unique = new Map<string, vscode.Uri>();
    for (const uri of uris) {
      unique.set(this.normalizeFsPath(uri.fsPath), uri);
    }
    return Array.from(unique.values()).sort((a, b) =>
      a.fsPath.localeCompare(b.fsPath),
    );
  }

  private normalizeFsPath(filePath: string): string {
    return path.resolve(filePath).replace(/\\/g, "/");
  }

  private isInsideWorkspace(workspaceRoot: string, targetPath: string): boolean {
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
