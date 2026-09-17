import * as vscode from "vscode";
import { SourceAnalyzer } from "../analyzer/sourceAnalyzer";
import { WorkspaceScanner } from "../scanner/workspaceScanner";
import {
  DocumentationError,
  type GenerationProgress,
} from "../types";
import type { GeneratedOutputPaths } from "./docGenerator";
import { buildLocalDocumentationDocument } from "./localDocumentationDocument";

export interface LocalDocumentationGeneratorOptions {
  outputFormat?: "markdown" | "html" | "both";
  targetPaths?: string[];
}

/**
 * VS Code runtime wrapper for deterministic Local Documentation generation.
 * It scans, analyzes, renders, and writes files without creating or invoking an
 * AI provider.
 */
export class LocalDocumentationGenerator {
  private readonly scanner = new WorkspaceScanner();
  private readonly analyzer = new SourceAnalyzer();
  private cancellationToken?: vscode.CancellationToken;
  private progressCallback?: (progress: GenerationProgress) => void;

  setCancellationToken(token: vscode.CancellationToken): void {
    this.cancellationToken = token;
  }

  setProgressCallback(callback: (progress: GenerationProgress) => void): void {
    this.progressCallback = callback;
  }

  async generateDocumentation(
    workspaceFolder: vscode.WorkspaceFolder,
    options: LocalDocumentationGeneratorOptions = {},
  ): Promise<GeneratedOutputPaths> {
    this.throwIfCancelled("scan");
    this.report({
      phase: "scanning",
      currentFile: "",
      totalFiles: 0,
      processedFiles: 0,
      percentage: 5,
      message: "Scanning source files locally...",
    });

    const files = await this.scanner.scanWorkspace(
      workspaceFolder,
      options.targetPaths,
    );
    if (files.length === 0) {
      throw new DocumentationError(
        "No supported files found in the selected path",
        "scan",
      );
    }

    this.throwIfCancelled("parse");
    this.report({
      phase: "parsing",
      currentFile: "",
      totalFiles: files.length,
      processedFiles: files.length,
      percentage: 35,
      message: `Analyzing ${files.length} source file${files.length === 1 ? "" : "s"} locally...`,
    });

    const project = this.analyzer.analyzeProject(files);

    this.throwIfCancelled("format");
    this.report({
      phase: "formatting",
      currentFile: "",
      totalFiles: files.length,
      processedFiles: files.length,
      percentage: 65,
      message: "Building local project, API, and dependency documentation...",
    });

    const document = buildLocalDocumentationDocument(
      workspaceFolder.name,
      files,
      project,
    );

    this.throwIfCancelled("write");
    this.report({
      phase: "writing",
      currentFile: "documentation files",
      totalFiles: files.length,
      processedFiles: files.length,
      percentage: 85,
      message: "Writing Local Documentation files...",
    });

    const docsFolder = vscode.Uri.joinPath(workspaceFolder.uri, "docs");
    try {
      await vscode.workspace.fs.createDirectory(docsFolder);
    } catch (error) {
      throw new DocumentationError(
        `Failed to create docs folder: ${error instanceof Error ? error.message : String(error)}`,
        "write",
        undefined,
        error instanceof Error ? error : undefined,
      );
    }

    const outputFormat = options.outputFormat ?? "both";
    const outputPaths: GeneratedOutputPaths = {};

    if (outputFormat === "markdown" || outputFormat === "both") {
      const markdownFile = vscode.Uri.joinPath(docsFolder, "documentation.md");
      await this.writeOutput(markdownFile, document.markdown);
      outputPaths.markdown = markdownFile.fsPath;
    }

    this.throwIfCancelled("write");

    if (outputFormat === "html" || outputFormat === "both") {
      const htmlFile = vscode.Uri.joinPath(docsFolder, "documentation.html");
      await this.writeOutput(htmlFile, document.html);
      outputPaths.html = htmlFile.fsPath;
    }

    this.report({
      phase: "complete",
      currentFile: "",
      totalFiles: files.length,
      processedFiles: files.length,
      percentage: 100,
      message: `Local Documentation completed for ${files.length} file${files.length === 1 ? "" : "s"}.`,
    });

    return outputPaths;
  }

  private async writeOutput(uri: vscode.Uri, content: string): Promise<void> {
    try {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
    } catch (error) {
      throw new DocumentationError(
        `Failed to write ${uri.fsPath}: ${error instanceof Error ? error.message : String(error)}`,
        "write",
        uri.fsPath,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private throwIfCancelled(
    type: "scan" | "parse" | "format" | "write",
  ): void {
    if (this.cancellationToken?.isCancellationRequested) {
      throw new DocumentationError("Generation cancelled", type);
    }
  }

  private report(progress: GenerationProgress): void {
    this.progressCallback?.(progress);
  }
}
