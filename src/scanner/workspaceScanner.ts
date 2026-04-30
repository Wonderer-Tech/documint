import * as vscode from "vscode";
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
  maxFileSize?: number; // in bytes, default 100KB
}

export class WorkspaceScanner {
  private config: ScannerConfig;

  constructor(config: ScannerConfig = {}) {
    this.config = {
      excludePatterns: config.excludePatterns || DEFAULT_EXCLUDE_PATTERNS,
      includePatterns: config.includePatterns || ["**/*"],
      maxFileSize: config.maxFileSize || 100 * 1024, // 100KB
    };
  }

  /**
   * Scans the workspace and returns a list of files eligible for documentation
   */
  async scanWorkspace(
    workspaceFolder: vscode.WorkspaceFolder,
  ): Promise<WorkspaceFile[]> {
    const files: WorkspaceFile[] = [];
    const excludePatterns =
      this.config.excludePatterns || DEFAULT_EXCLUDE_PATTERNS;

    // Build exclusion string for findFiles - use glob pattern syntax
    const excludeGlob = excludePatterns.join(",");

    // Get all files in the workspace
    const allFiles = await vscode.workspace.findFiles(
      "{**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.java,**/*.go,**/*.rs,**/*.rb}",
      excludeGlob,
    );

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

      // Get relative path within the workspace
      const relativePath = vscode.workspace.asRelativePath(uri);

      try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.size > (this.config.maxFileSize || 100 * 1024)) {
          continue; // Skip large files
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
