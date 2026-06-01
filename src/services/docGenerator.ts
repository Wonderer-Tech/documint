import * as vscode from "vscode";
import * as crypto from "crypto";
import { marked } from "marked";
import { WorkspaceScanner } from "../scanner/workspaceScanner";
import { BaseAIProvider } from "../providers/aiProvider";
import { ProviderFactory } from "../providers/providerFactory";
import {
  FileDependencyIndex,
  FileAnalysis,
  ProjectAnalysis,
  SourceAnalyzer,
} from "../analyzer/sourceAnalyzer";
import {
  DocumentationContext,
  GenerationProgress,
  DocumentationError,
  WorkspaceFile,
} from "../types";
import { SecretStorageManager } from "../config/secretStorage";
import { generateHtmlTemplate } from "./htmlTemplate";
import { DocumentationValidator } from "./documentationValidator";

export interface DocGeneratorOptions {
  provider?: string;
  model?: string;
  /** Token context window — from auto-fetch or user override in sidebar */
  contextWindow?: number;
  /** Maximum number of file documentation requests running at once. */
  concurrentRequests?: number;
  /** Minimum delay between starting provider requests, in milliseconds. */
  rateLimitDelay?: number;
  depth?: "simple" | "basic" | "standard" | "comprehensive";
  outputFormat?: "markdown" | "html" | "both";
  scope?: "current-file" | "folder" | "workspace";
  targetFilePath?: string;
  /** Absolute fs paths to restrict generation to (single file or folder). */
  targetPaths?: string[];
}

export interface GeneratedOutputPaths {
  markdown?: string;
  html?: string;
}

interface ProjectStats {
  languages: string[];
  totalLines: number;
  fileCount: number;
}

interface PreparedFileDocumentationTask {
  index: number;
  file: WorkspaceFile;
  fileAnalysis?: FileAnalysis;
  context: DocumentationContext;
  cacheKey: string;
}

interface FileDocumentationJob {
  tasks: PreparedFileDocumentationTask[];
}

interface DocumentationCacheEntry {
  cacheKey: string;
  section: string;
  generatedAt: string;
}

interface DocumentationCacheManifest {
  version: string;
  entries: Record<string, DocumentationCacheEntry>;
}

export class DocGeneratorService {
  private static readonly CACHE_VERSION = "documint-cache-v1";
  private static readonly PROMPT_VERSION = "lean-prompts-2026-06-01";

  private scanner: WorkspaceScanner;
  private sourceAnalyzer: SourceAnalyzer;
  private documentationValidator: DocumentationValidator;
  private aiProvider: BaseAIProvider;
  private secretManager: SecretStorageManager;
  private cancellationToken?: vscode.CancellationToken;
  private progressCallback?: (progress: GenerationProgress) => void;

  constructor(
    private context: vscode.ExtensionContext,
    secretManager: SecretStorageManager,
  ) {
    this.secretManager = secretManager;
    this.scanner = new WorkspaceScanner();
    this.sourceAnalyzer = new SourceAnalyzer();
    this.documentationValidator = new DocumentationValidator();
    // Default provider — overridden per-run in generateDocumentation()
    this.aiProvider = ProviderFactory.create("openai", context);
  }

  setProgressCallback(callback: (progress: GenerationProgress) => void): void {
    this.progressCallback = callback;
  }

  setCancellationToken(token: vscode.CancellationToken): void {
    this.cancellationToken = token;
  }

  async generateDocumentation(
    workspaceFolder: vscode.WorkspaceFolder,
    options: DocGeneratorOptions = {},
  ): Promise<GeneratedOutputPaths> {
    try {
      // Resolve and instantiate the correct AI provider for this run
      const providerName = ProviderFactory.resolveProviderName(
        options.provider,
      );
      this.aiProvider = ProviderFactory.create(providerName, this.context);

      this.reportProgress({
        phase: "scanning",
        currentFile: "",
        totalFiles: 0,
        processedFiles: 0,
        percentage: 0,
        message: `Scanning workspace files (provider: ${providerName})...`,
      });

      let files = await this.scanner.scanWorkspace(workspaceFolder);

      // Filter to selected file(s) / folder when scope is not full workspace
      if (options.targetPaths && options.targetPaths.length > 0) {
        const roots = options.targetPaths.map((p) =>
          p.replace(/\\/g, "/").toLowerCase(),
        );
        files = files.filter((f) => {
          const abs = vscode.Uri.joinPath(workspaceFolder.uri, f.path)
            .fsPath.replace(/\\/g, "/")
            .toLowerCase();
          return roots.some((r) => abs === r || abs.startsWith(r + "/"));
        });
      }

      if (files.length === 0) {
        throw new DocumentationError(
          "No supported files found in the selected path",
          "scan",
        );
      }

      const stats = this.collectStats(files);
      const projectAnalysis = this.sourceAnalyzer.analyzeProject(files);
      const analysisByPath = new Map(
        projectAnalysis.files.map((file) => [file.path, file]),
      );
      const dependencyIndex =
        this.sourceAnalyzer.buildDependencyIndex(projectAnalysis);

      this.reportProgress({
        phase: "scanning",
        currentFile: "",
        totalFiles: files.length,
        processedFiles: files.length,
        percentage: 8,
        message: `Found ${files.length} files, ${projectAnalysis.files.reduce((sum, file) => sum + file.symbols.length, 0)} symbols, and ${projectAnalysis.internalDependencies.length} internal links`,
      });

      if (this.cancellationToken?.isCancellationRequested) {
        throw new DocumentationError("Generation cancelled", "scan");
      }

      this.reportProgress({
        phase: "parsing",
        currentFile: "",
        totalFiles: files.length,
        processedFiles: 0,
        percentage: 9,
        message:
          "Preparing local CPU context: dependency graph, symbols, imports, and prompts...",
      });

      const fileTasks = this.prepareFileDocumentationTasks(
        files,
        analysisByPath,
        projectAnalysis,
        dependencyIndex,
        options,
        providerName,
      );

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
      const documentationCache = await this.loadDocumentationCache(docsFolder);

      // Generate project-level summary first
      this.reportProgress({
        phase: "generating",
        currentFile: "project summary",
        totalFiles: files.length,
        processedFiles: 0,
        percentage: 10,
        message: "Generating project overview...",
      });

      const projectSummary = await this.generateProjectSummary(
        files,
        workspaceFolder.name,
        stats,
        projectAnalysis,
        options,
      );

      let allDocumentation = `# DocuMint\n\n`;
      allDocumentation +=
        `# ${workspaceFolder.name} — Documentation\n\n` + projectSummary;
      allDocumentation += `\n\n---\n\n`;

      const totalFiles = files.length;
      const fileSections = await this.generateAiFileDocumentationSections(
        fileTasks,
        this.resolveConcurrentRequests(options, totalFiles),
        documentationCache,
        docsFolder,
      );
      allDocumentation += fileSections.join("");

      await this.saveDocumentationCache(docsFolder, documentationCache);

      // Add DocuMint footer
      allDocumentation += `\n\n---\n\n*Generated by **DocuMint** - AI-Powered Documentation Generator*`;

      this.reportProgress({
        phase: "writing",
        currentFile: "documentation files",
        totalFiles,
        processedFiles: totalFiles,
        percentage: 95,
        message: "Writing documentation files...",
      });

      const outputFormat = options.outputFormat || "both";
      const outputPaths: GeneratedOutputPaths = {};

      if (outputFormat === "markdown" || outputFormat === "both") {
        const mdFile = vscode.Uri.joinPath(docsFolder, "documentation.md");
        try {
          await vscode.workspace.fs.writeFile(
            mdFile,
            Buffer.from(allDocumentation, "utf-8"),
          );
          outputPaths.markdown = mdFile.fsPath;
        } catch (error) {
          throw new DocumentationError(
            `Failed to write markdown: ${error instanceof Error ? error.message : String(error)}`,
            "write",
            mdFile.fsPath,
            error instanceof Error ? error : undefined,
          );
        }
      }

      if (outputFormat === "html" || outputFormat === "both") {
        const htmlFile = vscode.Uri.joinPath(docsFolder, "documentation.html");
        try {
          const htmlContent = this.convertMarkdownToHtml(
            allDocumentation,
            workspaceFolder.name,
            stats,
          );
          await vscode.workspace.fs.writeFile(
            htmlFile,
            Buffer.from(htmlContent, "utf-8"),
          );
          outputPaths.html = htmlFile.fsPath;
        } catch (error) {
          throw new DocumentationError(
            `Failed to write HTML: ${error instanceof Error ? error.message : String(error)}`,
            "write",
            htmlFile.fsPath,
            error instanceof Error ? error : undefined,
          );
        }
      }

      const savedCount =
        (outputPaths.html ? 1 : 0) + (outputPaths.markdown ? 1 : 0);
      this.reportProgress({
        phase: "complete",
        currentFile: "",
        totalFiles,
        processedFiles: totalFiles,
        percentage: 100,
        message: `Documentation saved to docs/ (${savedCount} file${savedCount > 1 ? "s" : ""})`,
      });

      return outputPaths;
    } catch (error) {
      const docError =
        error instanceof DocumentationError
          ? error
          : new DocumentationError(
              error instanceof Error ? error.message : String(error),
              "api",
            );
      throw docError;
    }
  }

  /**
   * Collects language breakdown and line count stats from scanned files.
   */
  private collectStats(files: WorkspaceFile[]): ProjectStats {
    const langSet = new Set<string>();
    let totalLines = 0;
    for (const f of files) {
      langSet.add(f.language);
      totalLines += f.content.split("\n").length;
    }
    return {
      languages: Array.from(langSet).sort(),
      totalLines,
      fileCount: files.length,
    };
  }

  private async generateAiFileDocumentationSections(
    tasks: PreparedFileDocumentationTask[],
    concurrentRequests: number,
    documentationCache: DocumentationCacheManifest,
    docsFolder: vscode.Uri,
  ): Promise<string[]> {
    const totalFiles = tasks.length;
    const sections = new Array<string>(totalFiles);
    const pendingTasks: PreparedFileDocumentationTask[] = [];
    let cachedFiles = 0;

    for (const task of tasks) {
      const cached = documentationCache.entries[task.file.path];
      if (cached?.cacheKey === task.cacheKey && cached.section.trim()) {
        sections[task.index] = cached.section;
        cachedFiles++;
      } else {
        pendingTasks.push(task);
      }
    }

    if (pendingTasks.length === 0) {
      this.reportProgress({
        phase: "generating",
        currentFile: "",
        totalFiles,
        processedFiles: totalFiles,
        percentage: 90,
        message: `Reused cached documentation for all ${totalFiles} file${totalFiles === 1 ? "" : "s"}.`,
      });
      return sections;
    }

    let nextFileIndex = 0;
    let completedFiles = cachedFiles;
    let generatedFiles = 0;
    let activeRequests = 0;
    const startedAt = Date.now();
    const jobs = this.createFileDocumentationJobs(pendingTasks);

    this.reportProgress({
      phase: "generating",
      currentFile: "",
      totalFiles,
      processedFiles: cachedFiles,
      percentage: 12,
      message:
        `Documenting ${pendingTasks.length}/${totalFiles} file${totalFiles === 1 ? "" : "s"} ` +
        `with ${concurrentRequests} parallel AI request${concurrentRequests === 1 ? "" : "s"} ` +
        `(${cachedFiles} cache hit${cachedFiles === 1 ? "" : "s"}, ${jobs.length} request job${jobs.length === 1 ? "" : "s"})...`,
    });

    const worker = async (): Promise<void> => {
      while (true) {
        this.throwIfCancelled("api");

        const jobIndex = nextFileIndex++;
        if (jobIndex >= jobs.length) {
          return;
        }

        const job = jobs[jobIndex];
        const firstTask = job.tasks[0];
        const file = firstTask.file;
        let requestStarted = false;

        try {
          this.throwIfCancelled("api", file.path);

          requestStarted = true;
          activeRequests++;
          this.reportProgress({
            phase: "generating",
            currentFile: file.path,
            totalFiles,
            processedFiles: completedFiles,
            percentage: 12 + (completedFiles / totalFiles) * 78,
            message:
              `Documenting ${this.describeDocumentationJob(job)} ` +
              `(${activeRequests} active, ${completedFiles}/${totalFiles} done, ` +
              `ETA ${this.formatEta(startedAt, generatedFiles, pendingTasks.length)})...`,
          });

          const jobSections = await this.generateFileDocumentationJob(job);
          for (const [taskIndex, section] of jobSections) {
            const task = job.tasks.find((candidate) => candidate.index === taskIndex);
            if (!task) {
              continue;
            }
            sections[task.index] = section;
            documentationCache.entries[task.file.path] = {
              cacheKey: task.cacheKey,
              section,
              generatedAt: new Date().toISOString(),
            };
          }
          await this.saveDocumentationCache(docsFolder, documentationCache);
        } catch (error) {
          if (this.cancellationToken?.isCancellationRequested) {
            throw new DocumentationError(
              "Generation cancelled",
              "api",
              file.path,
              error instanceof Error ? error : undefined,
            );
          }

          for (const task of job.tasks) {
            console.warn(`Failed to generate docs for ${task.file.path}:`, error);
            sections[task.index] = this.formatFailedFileDocumentationSection(
              task.file,
              error,
            );
          }
        } finally {
          if (requestStarted) {
            activeRequests--;
          }

          if (!this.cancellationToken?.isCancellationRequested) {
            completedFiles += job.tasks.length;
            generatedFiles += job.tasks.length;
            this.reportProgress({
              phase: "generating",
              currentFile: file.path,
              totalFiles,
              processedFiles: completedFiles,
              percentage: 12 + (completedFiles / totalFiles) * 78,
              message:
                `Completed ${completedFiles}/${totalFiles} files ` +
                `(${cachedFiles} cached, ${activeRequests} active, ETA ${this.formatEta(startedAt, generatedFiles, pendingTasks.length)})...`,
            });
          }
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrentRequests, jobs.length) },
      () => worker(),
    );
    const results = await Promise.allSettled(workers);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (rejected) {
      throw rejected.reason;
    }

    return sections;
  }

  private prepareFileDocumentationTasks(
    files: WorkspaceFile[],
    analysisByPath: Map<string, FileAnalysis>,
    projectAnalysis: ProjectAnalysis,
    dependencyIndex: FileDependencyIndex,
    options: DocGeneratorOptions,
    providerName: string,
  ): PreparedFileDocumentationTask[] {
    const rateLimitDelay = this.resolveRateLimitDelay(options);
    const configuredModel =
      options.model ||
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("model") ||
      "";

    return files.map((file, index) => {
      const fileAnalysis = analysisByPath.get(file.path);
      const fileContext = fileAnalysis
        ? this.sourceAnalyzer.formatFileContext(
            fileAnalysis,
            projectAnalysis,
            dependencyIndex,
          )
        : undefined;

      const depth = options.depth || "standard";
      const cacheKey = this.createFileCacheKey({
        file,
        fileContext,
        providerName,
        model: configuredModel,
        depth,
      });

      return {
        index,
        file,
        fileAnalysis,
        cacheKey,
        context: {
          code: file.content,
          language: file.language,
          filePath: file.path,
          depth,
          existingContext: fileContext,
          model: options.model,
          contextWindow: options.contextWindow,
          rateLimitDelay,
          cancellationToken: this.cancellationToken,
        },
      };
    });
  }

  private createFileDocumentationJobs(
    tasks: PreparedFileDocumentationTask[],
  ): FileDocumentationJob[] {
    const jobs: FileDocumentationJob[] = [];
    let batch: PreparedFileDocumentationTask[] = [];
    let batchChars = 0;

    const flushBatch = () => {
      if (batch.length > 0) {
        jobs.push({ tasks: batch });
        batch = [];
        batchChars = 0;
      }
    };

    for (const task of tasks) {
      const canBatch = this.canBatchTask(task);
      const nextChars = batchChars + task.file.content.length;
      if (!canBatch) {
        flushBatch();
        jobs.push({ tasks: [task] });
        continue;
      }

      if (batch.length >= 5 || nextChars > 12000) {
        flushBatch();
      }

      batch.push(task);
      batchChars += task.file.content.length;
    }

    flushBatch();
    return jobs;
  }

  private canBatchTask(task: PreparedFileDocumentationTask): boolean {
    return (
      task.file.content.length <= 3500 &&
      task.context.depth !== "comprehensive"
    );
  }

  private describeDocumentationJob(job: FileDocumentationJob): string {
    if (job.tasks.length === 1) {
      return job.tasks[0].file.path;
    }
    return `${job.tasks.length} small files starting at ${job.tasks[0].file.path}`;
  }

  private async generateFileDocumentationJob(
    job: FileDocumentationJob,
  ): Promise<Map<number, string>> {
    if (job.tasks.length === 1) {
      const task = job.tasks[0];
      return new Map([
        [task.index, await this.generateFileDocumentationSection(task)],
      ]);
    }

    try {
      return await this.generateBatchFileDocumentationSections(job.tasks);
    } catch (error) {
      console.warn("Batch documentation failed; falling back to single files:", error);
      const sections = new Map<number, string>();
      for (const task of job.tasks) {
        this.throwIfCancelled("api", task.file.path);
        sections.set(task.index, await this.generateFileDocumentationSection(task));
      }
      return sections;
    }
  }

  private async generateBatchFileDocumentationSections(
    tasks: PreparedFileDocumentationTask[],
  ): Promise<Map<number, string>> {
    const depth = tasks[0].context.depth;
    const systemPrompt =
      "You are a senior documentation engineer. Generate factual Markdown only. " +
      "Use only real symbols and facts from the supplied source files. " +
      "Do not invent APIs, configuration, errors, or usage examples.";
    const userPrompt = [
      `Generate ${depth} documentation for each file below.`,
      "Return one Markdown block per file.",
      "Wrap each file's documentation body in these exact delimiters:",
      "<!-- DOCUMINT_FILE_START:path -->",
      "<!-- DOCUMINT_FILE_END:path -->",
      "Use the exact path shown for each file. Do not add extra text outside delimiters.",
      "",
      this.batchModeInstructions(depth),
      "",
      ...tasks.map((task) => this.formatBatchTaskInput(task)),
    ].join("\n");

    const result = await this.aiProvider.generateMarkdownFromPrompt({
      systemPrompt,
      userPrompt,
      model: tasks[0].context.model,
      rateLimitDelay: tasks[0].context.rateLimitDelay,
      cancellationToken: this.cancellationToken,
    });
    const parsed = this.parseBatchDocumentation(result.documentation, tasks);

    if (parsed.size !== tasks.length) {
      throw new Error(
        `Batch response returned ${parsed.size}/${tasks.length} file sections`,
      );
    }

    const sections = new Map<number, string>();
    for (const task of tasks) {
      const body = parsed.get(task.file.path);
      if (!body) {
        throw new Error(`Missing batch section for ${task.file.path}`);
      }
      const documentation = task.fileAnalysis
        ? this.documentationValidator.appendQualityNotes(
            body,
            this.documentationValidator.validateFileDocumentation(
              body,
              task.fileAnalysis,
            ),
          )
        : body;
      sections.set(task.index, this.formatFileDocumentationSection(task.file, documentation));
    }

    return sections;
  }

  private batchModeInstructions(
    depth: "simple" | "basic" | "standard" | "comprehensive",
  ): string {
    if (depth === "simple") {
      return [
        "For each file include only:",
        "## What This Does",
        "## Key Things It Can Do",
        "## What Goes In / What Comes Out",
      ].join("\n");
    }

    if (depth === "basic") {
      return [
        "For each file include only:",
        "## Module Metadata",
        "## Overview",
        "## API Reference",
        "## Quick Start",
        "## See Also",
      ].join("\n");
    }

    return [
      "For each file include:",
      "## Module Metadata",
      "## Overview",
      "## API Reference",
      "## Dependencies",
      "## Usage Examples",
      "## See Also",
      "Add compact evidence-based sections only when source evidence exists.",
    ].join("\n");
  }

  private formatBatchTaskInput(task: PreparedFileDocumentationTask): string {
    return [
      `FILE: ${task.file.path}`,
      `LANGUAGE: ${task.file.language}`,
      "VERIFIED CONTEXT:",
      "```text",
      task.context.existingContext ?? "No verified context available.",
      "```",
      "SOURCE:",
      `\`\`\`${task.file.language}`,
      task.file.content,
      "```",
      "",
    ].join("\n");
  }

  private parseBatchDocumentation(
    documentation: string,
    tasks: PreparedFileDocumentationTask[],
  ): Map<string, string> {
    const sections = new Map<string, string>();
    for (const task of tasks) {
      const start = `<!-- DOCUMINT_FILE_START:${task.file.path} -->`;
      const end = `<!-- DOCUMINT_FILE_END:${task.file.path} -->`;
      const startIndex = documentation.indexOf(start);
      const endIndex = documentation.indexOf(end);
      if (startIndex < 0 || endIndex <= startIndex) {
        continue;
      }
      sections.set(
        task.file.path,
        documentation
          .slice(startIndex + start.length, endIndex)
          .trim(),
      );
    }
    return sections;
  }

  private async generateFileDocumentationSection(
    task: PreparedFileDocumentationTask,
  ): Promise<string> {
    const result = await this.aiProvider.generateDocumentation(task.context);
    const documentation = task.fileAnalysis
      ? this.documentationValidator.appendQualityNotes(
          result.documentation,
          this.documentationValidator.validateFileDocumentation(
            result.documentation,
            task.fileAnalysis,
          ),
        )
      : result.documentation;

    return this.formatFileDocumentationSection(task.file, documentation);
  }

  private formatFileDocumentationSection(
    file: WorkspaceFile,
    documentation: string,
  ): string {
    const lineCount = file.content.split("\n").length;
    const fileMeta = `*${file.language} · ${lineCount.toLocaleString()} lines · \`${file.path}\`*\n\n`;
    return `# ${file.path}\n\n${fileMeta}${documentation}\n\n---\n\n`;
  }

  private formatFailedFileDocumentationSection(
    file: WorkspaceFile,
    error: unknown,
  ): string {
    const message = error instanceof Error ? error.message : String(error);
    return `# ${file.path}\n\n> Warning: Documentation generation failed: ${message}\n\n---\n\n`;
  }

  private resolveConcurrentRequests(
    options: DocGeneratorOptions,
    totalFiles: number,
  ): number {
    const configuration = vscode.workspace.getConfiguration("aiDocGenerator");
    const configured =
      options.concurrentRequests ??
      configuration.get<number>("concurrentRequests") ??
      15;
    const parsed = Number(configured);
    const bounded = Number.isFinite(parsed) ? Math.floor(parsed) : 15;
    return Math.min(Math.max(bounded, 1), Math.min(totalFiles, 15));
  }

  private resolveRateLimitDelay(options: DocGeneratorOptions): number {
    if (this.aiProvider.isLocal) {
      return 0;
    }

    const configuration = vscode.workspace.getConfiguration("aiDocGenerator");
    const configured =
      options.rateLimitDelay ??
      configuration.get<number>("rateLimitDelay") ??
      0;
    const parsed = Number(configured);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  private async loadDocumentationCache(
    docsFolder: vscode.Uri,
  ): Promise<DocumentationCacheManifest> {
    const empty: DocumentationCacheManifest = {
      version: DocGeneratorService.CACHE_VERSION,
      entries: {},
    };
    const cacheFile = vscode.Uri.joinPath(docsFolder, ".documint-cache.json");

    try {
      const bytes = await vscode.workspace.fs.readFile(cacheFile);
      const parsed = JSON.parse(Buffer.from(bytes).toString("utf-8")) as
        | DocumentationCacheManifest
        | undefined;
      if (
        !parsed ||
        parsed.version !== DocGeneratorService.CACHE_VERSION ||
        typeof parsed.entries !== "object"
      ) {
        return empty;
      }
      return parsed;
    } catch {
      return empty;
    }
  }

  private async saveDocumentationCache(
    docsFolder: vscode.Uri,
    cache: DocumentationCacheManifest,
  ): Promise<void> {
    const cacheFile = vscode.Uri.joinPath(docsFolder, ".documint-cache.json");
    const payload = JSON.stringify(cache, null, 2);
    await vscode.workspace.fs.writeFile(
      cacheFile,
      Buffer.from(payload, "utf-8"),
    );
  }

  private createFileCacheKey(input: {
    file: WorkspaceFile;
    fileContext?: string;
    providerName: string;
    model: string;
    depth: "simple" | "basic" | "standard" | "comprehensive";
  }): string {
    return this.hashJson({
      promptVersion: DocGeneratorService.PROMPT_VERSION,
      providerName: input.providerName,
      model: input.model,
      depth: input.depth,
      filePath: input.file.path,
      language: input.file.language,
      contentHash: this.hashText(input.file.content),
      contextHash: this.hashText(input.fileContext ?? ""),
    });
  }

  private hashJson(value: unknown): string {
    return this.hashText(JSON.stringify(value));
  }

  private hashText(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  private formatEta(
    startedAt: number,
    completedGenerated: number,
    totalToGenerate: number,
  ): string {
    if (completedGenerated <= 0) {
      return "calculating";
    }

    const elapsedMs = Date.now() - startedAt;
    const remaining = Math.max(totalToGenerate - completedGenerated, 0);
    const etaMs = (elapsedMs / completedGenerated) * remaining;
    if (!Number.isFinite(etaMs) || etaMs <= 0) {
      return "less than 1m";
    }

    const totalSeconds = Math.ceil(etaMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) {
      return `${seconds}s`;
    }
    if (minutes < 60) {
      return `${minutes}m ${seconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainderMinutes = minutes % 60;
    return `${hours}h ${remainderMinutes}m`;
  }

  private throwIfCancelled(
    type: "scan" | "parse" | "chunk" | "api" | "format" | "write",
    filePath?: string,
  ): void {
    if (this.cancellationToken?.isCancellationRequested) {
      throw new DocumentationError("Generation cancelled", type, filePath);
    }
  }

  /**
   * Generates a project-level overview using a condensed manifest of all files.
   */
  private async generateProjectSummary(
    files: WorkspaceFile[],
    projectName: string,
    stats: ProjectStats,
    projectAnalysis: ProjectAnalysis,
    options: DocGeneratorOptions,
  ): Promise<string> {
    try {
      const projectContext =
        this.sourceAnalyzer.formatProjectContext(projectAnalysis);
      // Build a manifest: file path + first 5 lines of each file
      const manifest = files
        .map((f) => {
          const analysis = projectAnalysis.files.find(
            (file) => file.path === f.path,
          );
          const symbols =
            analysis?.symbols
              .slice(0, 12)
              .map((symbol) => `${symbol.kind} ${symbol.name}`)
              .join(", ") || "none detected";
          const imports =
            analysis?.imports
              .slice(0, 8)
              .map((sourceImport) => sourceImport.source)
              .join(", ") || "none detected";
          return `### ${f.path} (${f.language})\nSymbols: ${symbols}\nImports: ${imports}`;
        })
        .join("\n\n");

      const summaryContext: DocumentationContext = {
        code: manifest,
        language: "plaintext",
        filePath: "__project_summary__",
        depth: "standard",
        existingContext: projectContext,
        rateLimitDelay: this.resolveRateLimitDelay(options),
        cancellationToken: this.cancellationToken,
      };

      const result = await this.aiProvider.generateDocumentation({
        ...summaryContext,
        model: options.model,
        contextWindow: options.contextWindow,
        code: `Project: ${projectName}
Languages: ${stats.languages.join(", ")}
Total files: ${stats.fileCount}
Total lines of code: ${stats.totalLines.toLocaleString()}

Verified project context:
${projectContext}

File manifest:
${manifest}`,
      });

      // Wrap in a project summary block
      return `## Project Overview

${result.documentation}

### Project Stats

| Metric | Value |
|--------|-------|
| Files Documented | ${stats.fileCount} |
| Languages | ${stats.languages.join(", ")} |
| Total Lines of Code | ${stats.totalLines.toLocaleString()} |
| Documentation Depth | ${options.depth || "standard"} |
| Generated | ${new Date().toLocaleString()} |
`;
    } catch (error) {
      if (this.cancellationToken?.isCancellationRequested) {
        throw new DocumentationError(
          "Generation cancelled",
          "api",
          "__project_summary__",
          error instanceof Error ? error : undefined,
        );
      }
      // Non-fatal: fall back to a static summary
      return `## Project Overview

### Detected Project Map

\`\`\`text
${this.sourceAnalyzer.formatProjectContext(projectAnalysis)}
\`\`\`

| Metric | Value |
|--------|-------|
| Files Documented | ${stats.fileCount} |
| Languages | ${stats.languages.join(", ")} |
| Total Lines of Code | ${stats.totalLines.toLocaleString()} |
| Documentation Depth | ${options.depth || "standard"} |
| Generated | ${new Date().toLocaleString()} |

`;
    }
  }

  private reportProgress(progress: GenerationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  private sanitizeId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[/\\]/g, "-") // path separators → dash (preserves folder/file structure)
      .replace(/\./g, "-") // dots → dash  (preserves .jsx, .tsx etc.)
      .replace(/[^\w-]/g, "") // remove everything else that isn't word char or dash
      .replace(/-+/g, "-") // collapse multiple dashes
      .replace(/^-|-$/g, "") // trim leading / trailing dashes
      .substring(0, 100);
  }

  /** Strip inline markdown syntax so TOC text matches rendered heading text. */
  private stripInlineMarkdown(text: string): string {
    return text
      .replace(/`([^`]+)`/g, "$1") // `code` → code
      .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold** → bold
      .replace(/\*([^*]+)\*/g, "$1") // *italic* → italic
      .replace(/__([^_]+)__/g, "$1") // __bold__ → bold
      .replace(/_([^_]+)_/g, "$1") // _italic_ → italic
      .trim();
  }

  private convertMarkdownToHtml(
    markdown: string,
    projectName: string,
    stats: ProjectStats,
  ): string {
    marked.setOptions({ gfm: true, breaks: true });

    const markdownWithoutRawHtml =
      this.escapeRawHtmlOutsideCodeFences(markdown);

    // Normalise Windows backslash paths in headings before parsing
    const normalisedMarkdown = markdownWithoutRawHtml.replace(
      /^(#{1,4}\s+.+)$/gm,
      (line) => line.replace(/\\/g, "/"),
    );

    // ── Single-pass: parse markdown → HTML, assign IDs, collect TOC entries ──
    // Building both the HTML and the TOC from the SAME rendered source guarantees
    // TOC text always matches the visible heading text exactly.
    const seenIds = new Map<string, number>();
    const makeUniqueId = (base: string): string => {
      const n = seenIds.get(base) ?? 0;
      seenIds.set(base, n + 1);
      return n === 0 ? base : `${base}-${n}`;
    };

    interface HeadingEntry {
      level: number;
      text: string;
      id: string;
    }
    const allHeadings: HeadingEntry[] = [];
    let currentH2Id = "";

    // Parse markdown to HTML first
    let htmlContent = marked.parse(normalisedMarkdown) as string;

    // Replace every h1–h6 tag: strip inner tags to get plain text, build unique
    // ID, push to allHeadings list, return tag with injected id attribute.
    htmlContent = htmlContent.replace(
      /<(h[1-6])([^>]*)>([\s\S]+?)<\/\1>/gi,
      (_full, tag, attrs, innerHtml) => {
        const level = parseInt(tag[1], 10);
        // Plain text used for ID generation (no HTML tags, no markdown syntax)
        const plainText = this.stripInlineMarkdown(
          innerHtml.replace(/<[^>]+>/g, ""),
        ).trim();
        let base = this.sanitizeId(plainText);
        // Scope sub-section IDs under their parent file-section to prevent
        // cross-file collisions (every file has its own "Overview", "API Reference" etc.)
        if (level >= 2 && currentH2Id) {
          base = `${currentH2Id}--${base}`;
        }
        const id = makeUniqueId(base);
        if (level === 1) currentH2Id = id;
        allHeadings.push({ level, text: plainText, id });
        return `<${tag} id="${id}"${attrs}>${innerHtml}</${tag}>`;
      },
    );

    // ── Build multi-level TOC ─────────────────────────────────────────────────
    // H1 = file path (bold, top-level), H2–H6 = sub-sections indented under it
    let tocHtml = "<ul>";
    let firstH1 = true;
    // Skip the very first h1 (project title) — it's in the topbar already
    let projectTitleSkipped = false;
    for (const h of allHeadings.filter((h) => h.level >= 1 && h.level <= 6)) {
      if (h.level === 1 && !projectTitleSkipped) {
        projectTitleSkipped = true;
        continue; // skip project title heading
      }
      if (h.level === 1) {
        if (!firstH1) {
          tocHtml += `<li style="height:6px;"></li>`;
        }
        firstH1 = false;
      }
      const cls = `toc-link level-${h.level}`;
      const inner =
        h.level === 1
          ? `<span class="toc-text">${this.escapeHtml(h.text)}</span>`
          : `<span class="toc-text">${this.escapeHtml(h.text)}</span>`;
      tocHtml += `<li><a href="#${h.id}" class="${cls}">${inner}</a></li>`;
    }
    tocHtml += "</ul>";

    return generateHtmlTemplate({
      title: `${projectName} — Documentation`,
      tocHtml,
      contentHtml: htmlContent,
      projectName,
      fileCount: stats.fileCount,
      generationDate: new Date().toLocaleString(),
      languages: stats.languages,
      totalLines: stats.totalLines,
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private escapeRawHtmlOutsideCodeFences(markdown: string): string {
    let inFence = false;
    let fenceChar = "";

    return markdown
      .split(/\r?\n/)
      .map((line) => {
        const fenceMatch = line.match(/^\s*(```+|~~~+)/);
        if (fenceMatch) {
          const marker = fenceMatch[1][0];
          if (!inFence) {
            inFence = true;
            fenceChar = marker;
          } else if (marker === fenceChar) {
            inFence = false;
            fenceChar = "";
          }
          return line;
        }

        if (inFence || !/<\/?[a-zA-Z][^>]*>/.test(line)) {
          return line;
        }

        return line
          .replace(/&(?!(amp|lt|gt|quot|#039);)/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      })
      .join("\n");
  }
}
