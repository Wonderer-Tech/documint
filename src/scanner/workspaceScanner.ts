import * as vscode from "vscode";
import * as path from "path";
import { WorkspaceFile } from "../types";
import {
  buildExplicitFolderExcludePatterns,
  buildWorkspaceExcludePatterns,
  getDefaultTargetLanguages,
  getLanguageFromPath,
  getTargetExtensions,
  isInsideWorkspace,
  normalizeFsPath,
} from "./scannerPolicy";
import { scannerRunTargetScope } from "./scannerRunTargetScope";

/**
 * Compatibility bridge for the extension command runner. Target state lives in
 * AsyncLocalStorage, so it is scoped to the current async command flow rather
 * than shared through a mutable module variable.
 */
export function setWorkspaceScannerRunTargets(targetPaths?: string[]): void {
  scannerRunTargetScope.enter(targetPaths);
}

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
    const effectiveTargetPaths = targetPaths ?? scannerRunTargetScope.current();

    let excludePatterns = resolvedConfig.excludePatterns;
    let allFiles: vscode.Uri[];

    if (effectiveTargetPaths && effectiveTargetPaths.length > 0) {
      // A deliberate folder selection relaxes only DocuMint's default test/spec
      // exclusions. User/workspace and programmatic exclusions remain authoritative.
      const settings = vscode.workspace.getConfiguration(
        "aiDocGenerator",
        workspaceFolder.uri,
      );
      const configuredExcludePatterns =
        settings.get<string[]>("excludePatterns") ?? [];
      excludePatterns = buildExplicitFolderExcludePatterns(
        configuredExcludePatterns,
        this.config.excludePatterns ?? [],
      );
      const excludeGlob = this.toBraceGlob(excludePatterns);
      const selectedFiles: vscode.Uri[] = [];

      for (const targetPath of effectiveTargetPaths) {
        const absoluteTarget = path.resolve(targetPath);
        if (!isInsideWorkspace(workspaceFolder.uri.fsPath, absoluteTarget)) {
          continue;
        }

        const targetUri = vscode.Uri.file(absoluteTarget);
        try {
          const stat = await vscode.workspace.fs.stat(targetUri);
          if ((stat.type & vscode.FileType.File) !== 0) {
            explicitFiles.add(normalizeFsPath(targetUri.fsPath));
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
      const normalizedPath = normalizeFsPath(uri.fsPath);
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
        const language = getLanguageFromPath(uri.fsPath);

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
      excludePatterns: buildWorkspaceExcludePatterns(
        configuredExcludePatterns,
        this.config.excludePatterns ?? [],
      ),
      includePatterns: this.config.includePatterns ?? [],
      targetLanguages:
        this.config.targetLanguages ??
        settings.get<string[]>("targetLanguages") ??
        getDefaultTargetLanguages(),
      maxFileSize: this.config.maxFileSize ?? Number.POSITIVE_INFINITY,
    };
  }

  private buildIncludeGlob(config: Required<ScannerConfig>): string {
    if (config.includePatterns.length > 0) {
      return this.toBraceGlob(config.includePatterns);
    }

    const extensions = getTargetExtensions(config.targetLanguages);
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
      unique.set(normalizeFsPath(uri.fsPath), uri);
    }
    return Array.from(unique.values()).sort((a, b) =>
      a.fsPath.localeCompare(b.fsPath),
    );
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
