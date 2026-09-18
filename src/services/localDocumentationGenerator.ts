import * as vscode from "vscode";
import { SourceAnalyzer } from "../analyzer/sourceAnalyzer";
import { WorkspaceScanner } from "../scanner/workspaceScanner";
import {
  DocumentationError,
  type GenerationProgress,
} from "../types";
import type { GeneratedOutputPaths } from "./docGenerator";
import {
  buildLocalDocumentationCacheKey,
  createLocalDocumentationCacheManifest,
  hashLocalDocumentationOutput,
  LOCAL_DOCUMENTATION_CACHE_FILE,
  parseLocalDocumentationCacheManifest,
  type LocalDocumentationCacheManifest,
  type LocalDocumentationOutputHashes,
} from "./localDocumentationCache";
import { buildLocalDocumentationDocument } from "./localDocumentationDocument";
import { sanitizeGeneratedOutputs } from "./outputSanitizer";
import { DOCUMINT_OUTPUT_DIRECTORY } from "../outputDirectory";

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
    const outputFormat = options.outputFormat ?? "both";
    const docsFolder = vscode.Uri.joinPath(workspaceFolder.uri, DOCUMINT_OUTPUT_DIRECTORY);
    const cacheKey = buildLocalDocumentationCacheKey(workspaceFolder.name, files);

    this.report({
      phase: "parsing",
      currentFile: "",
      totalFiles: files.length,
      processedFiles: files.length,
      percentage: 22,
      message: "Checking Local Documentation cache...",
    });

    const cachedOutputPaths = await this.tryReuseCachedOutputs(
      docsFolder,
      outputFormat,
      cacheKey,
    );
    if (cachedOutputPaths) {
      this.throwIfCancelled("format");
      this.report({
        phase: "complete",
        currentFile: "",
        totalFiles: files.length,
        processedFiles: files.length,
        percentage: 100,
        message: `Reused cached Local Documentation for ${files.length} file${files.length === 1 ? "" : "s"}.`,
      });
      return cachedOutputPaths;
    }

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
      percentage: 82,
      message: "Writing Local Documentation files...",
    });

    try {
      await vscode.workspace.fs.createDirectory(docsFolder);
    } catch (error) {
      throw new DocumentationError(
        `Failed to create ${DOCUMINT_OUTPUT_DIRECTORY} folder: ${error instanceof Error ? error.message : String(error)}`,
        "write",
        undefined,
        error instanceof Error ? error : undefined,
      );
    }

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

    this.throwIfCancelled("write");
    this.report({
      phase: "writing",
      currentFile: "documentation files",
      totalFiles: files.length,
      processedFiles: files.length,
      percentage: 92,
      message: "Sanitizing Local Documentation output...",
    });
    await sanitizeGeneratedOutputs(outputPaths);

    this.throwIfCancelled("write");
    await this.writeCacheManifest(docsFolder, cacheKey, outputPaths);

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

  private async tryReuseCachedOutputs(
    docsFolder: vscode.Uri,
    outputFormat: "markdown" | "html" | "both",
    cacheKey: string,
  ): Promise<GeneratedOutputPaths | undefined> {
    const manifest = await this.readCacheManifest(docsFolder);
    if (!manifest || manifest.key !== cacheKey) {
      return undefined;
    }

    const requested = this.outputUrisForFormat(docsFolder, outputFormat);
    for (const [kind, uri] of requested) {
      const expectedHash = manifest.outputs[kind];
      if (!expectedHash) {
        return undefined;
      }

      const actualHash = await this.readOutputHash(uri);
      if (!actualHash || actualHash !== expectedHash) {
        return undefined;
      }
    }

    const outputPaths: GeneratedOutputPaths = {};
    for (const [kind, uri] of requested) {
      outputPaths[kind] = uri.fsPath;
    }
    return outputPaths;
  }

  private async readCacheManifest(
    docsFolder: vscode.Uri,
  ): Promise<LocalDocumentationCacheManifest | undefined> {
    const uri = vscode.Uri.joinPath(docsFolder, LOCAL_DOCUMENTATION_CACHE_FILE);
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      return parseLocalDocumentationCacheManifest(
        Buffer.from(content).toString("utf-8"),
      );
    } catch {
      return undefined;
    }
  }

  private async writeCacheManifest(
    docsFolder: vscode.Uri,
    cacheKey: string,
    outputPaths: GeneratedOutputPaths,
  ): Promise<void> {
    const hashes: LocalDocumentationOutputHashes = {};

    if (outputPaths.markdown) {
      const hash = await this.readOutputHash(vscode.Uri.file(outputPaths.markdown));
      if (hash) hashes.markdown = hash;
    }
    if (outputPaths.html) {
      const hash = await this.readOutputHash(vscode.Uri.file(outputPaths.html));
      if (hash) hashes.html = hash;
    }

    const manifest = createLocalDocumentationCacheManifest(cacheKey, hashes);
    const uri = vscode.Uri.joinPath(docsFolder, LOCAL_DOCUMENTATION_CACHE_FILE);
    try {
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf-8"),
      );
    } catch (error) {
      console.warn("[Documint] Failed to write Local Documentation cache:", error);
    }
  }

  private async readOutputHash(uri: vscode.Uri): Promise<string | undefined> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      return hashLocalDocumentationOutput(content);
    } catch {
      return undefined;
    }
  }

  private outputUrisForFormat(
    docsFolder: vscode.Uri,
    outputFormat: "markdown" | "html" | "both",
  ): Array<["markdown" | "html", vscode.Uri]> {
    const requested: Array<["markdown" | "html", vscode.Uri]> = [];
    if (outputFormat === "markdown" || outputFormat === "both") {
      requested.push([
        "markdown",
        vscode.Uri.joinPath(docsFolder, "documentation.md"),
      ]);
    }
    if (outputFormat === "html" || outputFormat === "both") {
      requested.push([
        "html",
        vscode.Uri.joinPath(docsFolder, "documentation.html"),
      ]);
    }
    return requested;
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
