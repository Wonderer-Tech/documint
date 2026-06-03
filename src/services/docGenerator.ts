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

interface ProjectTreeNode {
  name: string;
  type: "folder" | "file";
  children: Map<string, ProjectTreeNode>;
  language?: string;
  lineCount?: number;
}

interface ArchitectureFileNode {
  path: string;
  language: string;
  lineCount: number;
  symbolCount: number;
  dependencyCount: number;
  score: number;
}

interface ArchitectureModuleNode {
  id: string;
  name: string;
  role: string;
  fileCount: number;
  lineCount: number;
  languages: string[];
  importantFiles: ArchitectureFileNode[];
}

interface ArchitectureModuleEdge {
  from: string;
  to: string;
  count: number;
}

interface ArchitectureGraphNode {
  id: string;
  label: string;
  path: string;
  module: string;
  language: string;
  symbolCount: number;
  dependencyCount: number;
  lineCount: number;
}

interface ArchitectureGraphEdge {
  from: string;
  to: string;
  label: string;
}

interface ArchitectureBlueprint {
  projectName: string;
  modules: ArchitectureModuleNode[];
  moduleEdges: ArchitectureModuleEdge[];
  importantFiles: ArchitectureFileNode[];
  entryPoints: string[];
  externalDependencies: string[];
  dependencyGraph: {
    nodes: ArchitectureGraphNode[];
    edges: ArchitectureGraphEdge[];
  };
}

interface CodeWorkflowStep {
  id: string;
  title: string;
  detail: string;
  files: string[];
}

interface CodeWorkflowLane {
  id: string;
  title: string;
  role: string;
  steps: CodeWorkflowStep[];
}

interface CodeWorkflowBlueprint {
  projectName: string;
  lanes: CodeWorkflowLane[];
  edges: Array<{
    from: string;
    to: string;
    label: string;
  }>;
  keyFiles: ArchitectureFileNode[];
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
  projectSummary?: DocumentationCacheEntry;
  projectVisuals?: DocumentationCacheEntry;
}

interface ProjectVisualCacheManifest {
  version: string;
  entry?: DocumentationCacheEntry;
}

interface DocumentationAssets {
  logoHtmlSrc?: string;
}

export class DocGeneratorService {
  private static readonly CACHE_VERSION = "documint-cache-v2";
  private static readonly PROMPT_VERSION = "lean-prompts-2026-06-02";
  private static readonly VISUAL_CACHE_VERSION = "project-visuals-v2";

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
      // Resolve and instantiate the correct provider for this run
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
      files = this.sortFilesInProjectTreeOrder(files);
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
      const projectVisualCache = await this.loadProjectVisualCache(
        docsFolder,
        documentationCache,
      );
      const documentationAssets =
        await this.ensureDocumentationAssets(docsFolder);

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
        providerName,
        documentationCache,
        projectVisualCache,
      );
      await this.saveProjectVisualCache(docsFolder, projectVisualCache);

      let allDocumentation =
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
      await this.saveProjectVisualCache(docsFolder, projectVisualCache);

      // Add DocuMint footer
      allDocumentation += `\n\n---\n\n*Generated by **DocuMint** - Documentation Generator*`;

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
            documentationAssets.logoHtmlSrc,
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
      langSet.add(this.formatLanguageLabel(f.language));
      totalLines += f.content.split("\n").length;
    }
    return {
      languages: Array.from(langSet).sort(),
      totalLines,
      fileCount: files.length,
    };
  }

  private sortFilesInProjectTreeOrder(files: WorkspaceFile[]): WorkspaceFile[] {
    return [...files].sort((a, b) =>
      this.compareProjectTreePaths(a.path, b.path),
    );
  }

  private compareProjectTreePaths(aPath: string, bPath: string): number {
    const aParts = aPath.replace(/\\/g, "/").split("/").filter(Boolean);
    const bParts = bPath.replace(/\\/g, "/").split("/").filter(Boolean);
    const maxLength = Math.max(aParts.length, bParts.length);

    for (let index = 0; index < maxLength; index++) {
      const aPart = aParts[index];
      const bPart = bParts[index];

      if (aPart === bPart) {
        continue;
      }

      if (aPart === undefined) {
        return 1;
      }
      if (bPart === undefined) {
        return -1;
      }

      const aIsFolder = index < aParts.length - 1;
      const bIsFolder = index < bParts.length - 1;
      if (aIsFolder !== bIsFolder) {
        return aIsFolder ? -1 : 1;
      }

      return aPart.localeCompare(bPart);
    }

    return 0;
  }

  private generateProjectTreeSection(
    files: WorkspaceFile[],
    projectName: string,
  ): string {
    const treeLines = this.renderProjectTreeLines(files, projectName);

    return [
      "### Visual Blueprint: Project Tree",
      "",
      "Every documented source file is grouped by folder so clients can scan the full project structure in one place.",
      "",
      "```project-tree",
      ...treeLines,
      "```",
      "",
    ].join("\n");
  }

  private renderProjectTreeLines(
    files: WorkspaceFile[],
    projectName: string,
  ): string[] {
    const root: ProjectTreeNode = {
      name: this.cleanTreeLabel(projectName) || "project",
      type: "folder",
      children: new Map(),
    };

    const sortedFiles = this.sortFilesInProjectTreeOrder(files);
    for (const file of sortedFiles) {
      const parts = file.path
        .replace(/\\/g, "/")
        .split("/")
        .map((part) => this.cleanTreeLabel(part))
        .filter(Boolean);

      if (parts.length === 0) {
        continue;
      }

      let cursor = root;
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        let child = cursor.children.get(part);

        if (!child) {
          child = {
            name: part,
            type: isFile ? "file" : "folder",
            children: new Map(),
          };
          cursor.children.set(part, child);
        }

        if (isFile) {
          child.type = "file";
          child.language = file.language;
          child.lineCount = file.content.split(/\r?\n/).length;
        }

        cursor = child;
      });
    }

    const lines = [`${root.name}/`];
    const children = this.sortedProjectTreeChildren(root);
    children.forEach((child, index) => {
      this.appendProjectTreeLine(
        child,
        "",
        index === children.length - 1,
        lines,
      );
    });

    return lines;
  }

  private appendProjectTreeLine(
    node: ProjectTreeNode,
    prefix: string,
    isLast: boolean,
    lines: string[],
  ): void {
    const connector = isLast ? "`-- " : "|-- ";
    const label =
      node.type === "folder"
        ? `${node.name}/`
        : `${node.name} [${node.language || "code"} | ${this.formatLineCount(node.lineCount ?? 0)}]`;
    lines.push(`${prefix}${connector}${label}`);

    if (node.type !== "folder") {
      return;
    }

    const children = this.sortedProjectTreeChildren(node);
    const childPrefix = `${prefix}${isLast ? "    " : "|   "}`;
    children.forEach((child, index) => {
      this.appendProjectTreeLine(
        child,
        childPrefix,
        index === children.length - 1,
        lines,
      );
    });
  }

  private sortedProjectTreeChildren(
    node: ProjectTreeNode,
  ): ProjectTreeNode[] {
    return Array.from(node.children.values()).sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private cleanTreeLabel(value: string): string {
    return value.replace(/[\r\n]/g, " ").trim();
  }

  private formatLineCount(lineCount: number): string {
    const safeLineCount = Math.max(0, lineCount);
    return `${safeLineCount.toLocaleString()} line${safeLineCount === 1 ? "" : "s"}`;
  }

  private generateArchitectureVisualSections(
    files: WorkspaceFile[],
    projectName: string,
    projectAnalysis: ProjectAnalysis,
  ): string {
    const blueprint = this.buildArchitectureBlueprint(
      files,
      projectName,
      projectAnalysis,
    );
    const mermaidSource = this.generateArchitectureMermaid(blueprint);
    const d2Source = this.generateArchitectureD2(blueprint);
    const workflow = this.buildCodeWorkflowBlueprint(blueprint);
    const workflowMermaid = this.generateCodeWorkflowMermaid(workflow);
    const workflowD2 = this.generateCodeWorkflowD2(workflow);
    return [
      "### Visual Blueprint: Architecture Map",
      "",
      "This generated architecture blueprint groups the codebase into modules, highlights important files, and summarizes dependency flow.",
      "",
      "```architecture-blueprint",
      this.stringifyVisualJson(blueprint),
      "```",
      "",
      "### Editable Diagram Export",
      "",
      "The HTML version renders this Mermaid diagram with export buttons for SVG, source copy, fullscreen, and draw.io.",
      "",
      "```mermaid",
      mermaidSource,
      "```",
      "",
      "### D2 Style Architecture Source",
      "",
      "Copy or download this D2 source if you want to refine the layout with the D2 CLI or another D2-compatible editor.",
      "",
      "```d2",
      d2Source,
      "```",
      "",
      "### Visual Blueprint: Code Workflow",
      "",
      "This workflow shows how code moves from user action through local analysis, generation, validation, visual rendering, and final documentation output.",
      "",
      "```code-workflow",
      this.stringifyVisualJson(workflow),
      "```",
      "",
      "### Editable Code Workflow Diagram",
      "",
      "The HTML version renders this workflow as Mermaid with SVG, source copy, fullscreen, and draw.io export controls.",
      "",
      "```mermaid",
      workflowMermaid,
      "```",
      "",
      "### D2 Code Workflow Source",
      "",
      "Copy or download this D2 workflow source for D2-compatible editors.",
      "",
      "```d2",
      workflowD2,
      "```",
      "",
      "### Whiteboard Architecture Sketch",
      "",
      "The HTML version renders this as a hand-drawn style architecture sketch with SVG and Excalidraw JSON export.",
      "",
      "```excalidraw-blueprint",
      this.stringifyVisualJson(blueprint),
      "```",
      "",
      "### Interactive Dependency Graph",
      "",
      "The HTML version renders this as a zoom-free interactive dependency map with hover details and search.",
      "",
      "```dependency-graph",
      this.stringifyVisualJson({
        projectName: blueprint.projectName,
        nodes: blueprint.dependencyGraph.nodes,
        edges: blueprint.dependencyGraph.edges,
      }),
      "```",
      "",
    ].join("\n");
  }

  private buildArchitectureBlueprint(
    files: WorkspaceFile[],
    projectName: string,
    projectAnalysis: ProjectAnalysis,
  ): ArchitectureBlueprint {
    const fileByPath = new Map(files.map((file) => [file.path, file]));
    const analysisByPath = new Map(
      projectAnalysis.files.map((file) => [file.path, file]),
    );
    const dependencyDegree = new Map<string, number>();

    for (const edge of projectAnalysis.internalDependencies) {
      dependencyDegree.set(edge.from, (dependencyDegree.get(edge.from) ?? 0) + 1);
      dependencyDegree.set(edge.to, (dependencyDegree.get(edge.to) ?? 0) + 1);
    }

    const modules = new Map<
      string,
      ArchitectureModuleNode & { allFiles: ArchitectureFileNode[] }
    >();

    const toFileNode = (file: WorkspaceFile): ArchitectureFileNode => {
      const analysis = analysisByPath.get(file.path);
      const dependencyCount = dependencyDegree.get(file.path) ?? 0;
      const lineCount = file.content.split(/\r?\n/).length;
      const symbolCount = analysis?.symbols.length ?? 0;
      const entryScore = projectAnalysis.entryPoints.includes(file.path) ? 25 : 0;
      const nameScore = /(^|\/)(index|main|app|extension|server|api|provider|router)\./i.test(
        file.path,
      )
        ? 10
        : 0;

      return {
        path: this.cleanVisualText(file.path),
        language: this.formatLanguageLabel(file.language),
        lineCount,
        symbolCount,
        dependencyCount,
        score: entryScore + nameScore + dependencyCount * 3 + symbolCount,
      };
    };

    for (const file of files) {
      const moduleName = this.moduleNameForPath(file.path);
      const moduleId = this.safeVisualId(moduleName);
      const fileNode = toFileNode(file);
      const existing = modules.get(moduleId);

      if (existing) {
        existing.fileCount++;
        existing.lineCount += fileNode.lineCount;
        existing.languages = Array.from(
          new Set([...existing.languages, fileNode.language]),
        ).sort();
        existing.allFiles.push(fileNode);
      } else {
        modules.set(moduleId, {
          id: moduleId,
          name: moduleName,
          role: this.moduleRole(moduleName),
          fileCount: 1,
          lineCount: fileNode.lineCount,
          languages: [fileNode.language],
          importantFiles: [],
          allFiles: [fileNode],
        });
      }
    }

    const moduleList = Array.from(modules.values()).map((module) => {
      module.importantFiles = module.allFiles
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
        .slice(0, 5);
      const { allFiles: _allFiles, ...publicModule } = module;
      return publicModule;
    });

    const moduleEdgeCounts = new Map<string, ArchitectureModuleEdge>();
    for (const edge of projectAnalysis.internalDependencies) {
      if (!fileByPath.has(edge.from) || !fileByPath.has(edge.to)) {
        continue;
      }

      const from = this.safeVisualId(this.moduleNameForPath(edge.from));
      const to = this.safeVisualId(this.moduleNameForPath(edge.to));
      if (from === to) {
        continue;
      }

      const key = `${from}->${to}`;
      const existing = moduleEdgeCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        moduleEdgeCounts.set(key, { from, to, count: 1 });
      }
    }

    const importantFiles = files
      .map(toFileNode)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
      .slice(0, 12);

    const graphNodeFiles = files
      .map(toFileNode)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
      .slice(0, 36);
    const graphNodeIds = new Set(graphNodeFiles.map((file) => file.path));
    const dependencyGraph = {
      nodes: graphNodeFiles.map((file) => ({
        id: this.safeVisualId(file.path),
        label: this.fileNameFromPath(file.path),
        path: file.path,
        module: this.moduleNameForPath(file.path),
        language: file.language,
        symbolCount: file.symbolCount,
        dependencyCount: file.dependencyCount,
        lineCount: file.lineCount,
      })),
      edges: projectAnalysis.internalDependencies
        .filter((edge) => graphNodeIds.has(edge.from) && graphNodeIds.has(edge.to))
        .slice(0, 80)
        .map((edge) => ({
          from: this.safeVisualId(edge.from),
          to: this.safeVisualId(edge.to),
          label: this.cleanVisualText(edge.source),
        })),
    };

    return {
      projectName: this.cleanVisualText(projectName),
      modules: moduleList
        .sort((a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name))
        .slice(0, 14),
      moduleEdges: Array.from(moduleEdgeCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 24),
      importantFiles,
      entryPoints: projectAnalysis.entryPoints
        .map((entry) => this.cleanVisualText(entry))
        .slice(0, 10),
      externalDependencies: projectAnalysis.externalDependencies
        .map((dependency) => this.cleanVisualText(dependency))
        .slice(0, 18),
      dependencyGraph,
    };
  }

  private generateArchitectureMermaid(blueprint: ArchitectureBlueprint): string {
    const lines = ["flowchart LR"];
    lines.push(`  entry[${this.quoteMermaidLabel("Entry Points")}]`);
    lines.push(`  output[${this.quoteMermaidLabel("Documentation Output")}]`);

    for (const module of blueprint.modules.slice(0, 10)) {
      lines.push(
        `  ${this.safeMermaidId(module.id)}[${this.quoteMermaidLabel(`${module.name} (${this.formatFileCountLabel(module.fileCount)})`)}]`,
      );
    }

    if (blueprint.modules.length > 0) {
      for (const module of blueprint.modules.slice(0, 4)) {
        lines.push(`  entry --> ${this.safeMermaidId(module.id)}`);
      }
    }

    for (const edge of blueprint.moduleEdges.slice(0, 14)) {
      lines.push(
        `  ${this.safeMermaidId(edge.from)} -->|${edge.count}| ${this.safeMermaidId(edge.to)}`,
      );
    }

    for (const module of blueprint.modules.slice(0, 3)) {
      lines.push(`  ${this.safeMermaidId(module.id)} --> output`);
    }

    return lines.join("\n");
  }

  private generateArchitectureD2(blueprint: ArchitectureBlueprint): string {
    const lines = ["direction: right", ""];
    lines.push(`${this.quoteD2Label("Entry Points")}: { shape: oval }`);
    lines.push(
      `${this.quoteD2Label("Documentation Output")}: { shape: document }`,
    );

    for (const module of blueprint.modules.slice(0, 10)) {
      lines.push(
        `${this.quoteD2Label(module.name)}: { label: ${this.quoteD2Label(`${module.name}\\n${module.role} | ${this.formatFileCountLabel(module.fileCount)}`)} }`,
      );
    }

    lines.push("");
    for (const module of blueprint.modules.slice(0, 4)) {
      lines.push(
        `${this.quoteD2Label("Entry Points")} -> ${this.quoteD2Label(module.name)}: enters`,
      );
    }
    for (const edge of blueprint.moduleEdges.slice(0, 14)) {
      const from = blueprint.modules.find((module) => module.id === edge.from);
      const to = blueprint.modules.find((module) => module.id === edge.to);
      if (!from || !to) {
        continue;
      }
      lines.push(
        `${this.quoteD2Label(from.name)} -> ${this.quoteD2Label(to.name)}: ${edge.count} imports`,
      );
    }
    for (const module of blueprint.modules.slice(0, 3)) {
      lines.push(
        `${this.quoteD2Label(module.name)} -> ${this.quoteD2Label("Documentation Output")}: documented`,
      );
    }

    return lines.join("\n");
  }

  private buildCodeWorkflowBlueprint(
    blueprint: ArchitectureBlueprint,
  ): CodeWorkflowBlueprint {
    const keyFiles = blueprint.importantFiles.slice(0, 10);
    const findFiles = (patterns: RegExp[]): string[] =>
      keyFiles
        .filter((file) => patterns.some((pattern) => pattern.test(file.path)))
        .map((file) => file.path)
        .slice(0, 4);

    const commandFiles = findFiles([
      /extension\./i,
      /sidebar/i,
      /view/i,
      /command/i,
    ]);
    const scanFiles = findFiles([/scanner/i, /workspace/i]);
    const analysisFiles = findFiles([/analyzer/i, /validator/i]);
    const generatorFiles = findFiles([/docgenerator/i, /documentation/i, /service/i]);
    const providerFiles = findFiles([/provider/i, /openai/i, /anthropic/i, /deepseek/i]);
    const outputFiles = findFiles([/htmltemplate/i, /markdown/i, /writer/i]);

    const fallbackFile = (index: number): string[] =>
      keyFiles[index] ? [keyFiles[index].path] : [];

    const lanes: CodeWorkflowLane[] = [
      {
        id: "user",
        title: "User Action",
        role: "VS Code",
        steps: [
          {
            id: "command",
            title: "Run documentation command",
            detail: "Sidebar or command palette starts generation for the selected scope.",
            files: commandFiles.length ? commandFiles : fallbackFile(0),
          },
        ],
      },
      {
        id: "local",
        title: "Local CPU Prep",
        role: "Workspace Analysis",
        steps: [
          {
            id: "scan",
            title: "Scan supported files",
            detail: "Workspace files are filtered by language, size, scope, and exclude patterns.",
            files: scanFiles.length ? scanFiles : fallbackFile(1),
          },
          {
            id: "analyze",
            title: "Analyze symbols and dependencies",
            detail: "Imports, exports, symbols, entry points, and internal links are mapped locally.",
            files: analysisFiles.length ? analysisFiles : fallbackFile(2),
          },
          {
            id: "prepare",
            title: "Prepare prompts and cache keys",
            detail: "File context, dependency facts, and cache hashes are prepared before provider calls.",
            files: generatorFiles.length ? generatorFiles : fallbackFile(3),
          },
        ],
      },
      {
        id: "provider",
        title: "Generation",
        role: "Provider Layer",
        steps: [
          {
            id: "provider",
            title: "Resolve provider and model",
            detail: "ProviderFactory routes requests to OpenAI, Anthropic, DeepSeek, OpenRouter, or a custom OpenAI-compatible endpoint.",
            files: providerFiles.length ? providerFiles : fallbackFile(4),
          },
          {
            id: "parallel",
            title: "Generate in parallel",
            detail: "File documentation jobs run concurrently while preserving cache reuse and cancellation checks.",
            files: generatorFiles.length ? generatorFiles : fallbackFile(5),
          },
        ],
      },
      {
        id: "quality",
        title: "Quality Gate",
        role: "Validation",
        steps: [
          {
            id: "validate",
            title: "Validate generated sections",
            detail: "Generated docs are checked against detected symbols and source facts before final assembly.",
            files: analysisFiles.length ? analysisFiles : fallbackFile(6),
          },
          {
            id: "cache",
            title: "Reuse and update cache",
            detail: "Unchanged files reuse cached documentation; changed files update cache entries.",
            files: generatorFiles.length ? generatorFiles : fallbackFile(7),
          },
        ],
      },
      {
        id: "output",
        title: "Output",
        role: "Documentation",
        steps: [
          {
            id: "render",
            title: "Render Markdown and HTML",
            detail: "Markdown is converted to HTML with visual blueprints, search, theme, exports, and client-focused branding.",
            files: outputFiles.length ? outputFiles : fallbackFile(8),
          },
          {
            id: "write",
            title: "Write docs folder output",
            detail: "Final files are saved to docs/documentation.md and/or docs/documentation.html.",
            files: generatorFiles.length ? generatorFiles : fallbackFile(9),
          },
        ],
      },
    ];

    return {
      projectName: blueprint.projectName,
      lanes,
      edges: [
        { from: "command", to: "scan", label: "scope" },
        { from: "scan", to: "analyze", label: "files" },
        { from: "analyze", to: "prepare", label: "facts" },
        { from: "prepare", to: "provider", label: "context" },
        { from: "provider", to: "parallel", label: "model" },
        { from: "parallel", to: "validate", label: "sections" },
        { from: "validate", to: "cache", label: "quality notes" },
        { from: "cache", to: "render", label: "assembled docs" },
        { from: "render", to: "write", label: "md/html" },
      ],
      keyFiles,
    };
  }

  private generateCodeWorkflowMermaid(workflow: CodeWorkflowBlueprint): string {
    const lines = ["flowchart LR"];
    const laneId = (id: string): string => this.safeMermaidId(`lane-${id}`);
    const stepId = (id: string): string => this.safeMermaidId(`step-${id}`);
    for (const lane of workflow.lanes) {
      lines.push(`  subgraph ${laneId(lane.id)} [${this.quoteMermaidLabel(lane.title)}]`);
      for (const step of lane.steps) {
        lines.push(
          `    ${stepId(step.id)}[${this.quoteMermaidLabel(step.title)}]`,
        );
      }
      lines.push("  end");
    }

    for (const edge of workflow.edges) {
      lines.push(
        `  ${stepId(edge.from)} -->|${this.cleanMermaidEdgeLabel(edge.label)}| ${stepId(edge.to)}`,
      );
    }

    return lines.join("\n");
  }

  private generateCodeWorkflowD2(workflow: CodeWorkflowBlueprint): string {
    const lines = ["direction: right", ""];
    for (const lane of workflow.lanes) {
      lines.push(`${this.quoteD2Label(lane.title)}: {`);
      lines.push(`  label: ${this.quoteD2Label(`${lane.title}\\n${lane.role}`)}`);
      for (const step of lane.steps) {
        lines.push(`  ${this.quoteD2Label(step.title)}: {`);
        lines.push(`    label: ${this.quoteD2Label(`${step.title}\\n${step.detail}`)}`);
        lines.push("  }");
      }
      lines.push("}");
    }

    lines.push("");
    const stepById = new Map<string, { lane: string; title: string }>();
    for (const lane of workflow.lanes) {
      for (const step of lane.steps) {
        stepById.set(step.id, { lane: lane.title, title: step.title });
      }
    }

    for (const edge of workflow.edges) {
      const from = stepById.get(edge.from);
      const to = stepById.get(edge.to);
      if (!from || !to) {
        continue;
      }
      lines.push(
        `${this.quoteD2Label(from.lane)}.${this.quoteD2Label(from.title)} -> ${this.quoteD2Label(to.lane)}.${this.quoteD2Label(to.title)}: ${this.cleanVisualText(edge.label)}`,
      );
    }

    return lines.join("\n");
  }

  private stringifyVisualJson(value: unknown): string {
    return JSON.stringify(value, null, 2).replace(/```/g, "` ` `");
  }

  private moduleNameForPath(filePath: string): string {
    const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
    if (parts.length <= 1) {
      return "(root)";
    }

    const first = parts[0];
    const second = parts[1];
    if (
      ["src", "app", "lib", "server", "client", "packages"].includes(
        first.toLowerCase(),
      ) &&
      second
    ) {
      return `${first}/${second}`;
    }

    return first;
  }

  private moduleRole(moduleName: string): string {
    const value = moduleName.toLowerCase();
    if (value.includes("provider")) {
      return "Provider";
    }
    if (value.includes("service")) {
      return "Service";
    }
    if (value.includes("view") || value.includes("component") || value.includes("ui")) {
      return "UI";
    }
    if (value.includes("scanner") || value.includes("analyzer")) {
      return "Analysis";
    }
    if (value.includes("config")) {
      return "Configuration";
    }
    if (value.includes("resource") || value.includes("asset")) {
      return "Assets";
    }
    if (value.includes("test") || value.includes("spec")) {
      return "Tests";
    }
    return "Module";
  }

  private cleanVisualText(value: string): string {
    return value.replace(/[\r\n\t]/g, " ").replace(/```/g, "'''").trim();
  }

  private formatFileCountLabel(count: number): string {
    return `${count.toLocaleString()} file${count === 1 ? "" : "s"}`;
  }

  private formatLineCountLabel(count: number): string {
    return `${count.toLocaleString()} line${count === 1 ? "" : "s"}`;
  }

  private formatLanguageLabel(language: string): string {
    const normalized = language.trim().toLowerCase().replace(/[\s_-]+/g, "");
    const knownLabels: Record<string, string> = {
      csharp: "C#",
      cpp: "C++",
      css: "CSS",
      go: "Go",
      html: "HTML",
      java: "Java",
      javascript: "JavaScript",
      javascriptreact: "JavaScript React",
      json: "JSON",
      markdown: "Markdown",
      php: "PHP",
      python: "Python",
      ruby: "Ruby",
      rust: "Rust",
      scss: "SCSS",
      shellscript: "Shell Script",
      typescript: "TypeScript",
      typescriptreact: "TypeScript React",
      vue: "Vue",
      yaml: "YAML",
    };

    return (
      knownLabels[normalized] ||
      language
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim() ||
      "Code"
    );
  }

  private safeVisualId(value: string): string {
    const id = this.cleanVisualText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return id || "node";
  }

  private safeMermaidId(value: string): string {
    return `n_${this.safeVisualId(value).replace(/-/g, "_")}`;
  }

  private quoteMermaidLabel(value: string): string {
    return `"${this.cleanVisualText(value).replace(/"/g, "'")}"`;
  }

  private cleanMermaidEdgeLabel(value: string): string {
    return this.cleanVisualText(value).replace(/\|/g, "/");
  }

  private quoteD2Label(value: string): string {
    return `"${this.cleanVisualText(value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')}"`;
  }

  private fileNameFromPath(filePath: string): string {
    return filePath.replace(/\\/g, "/").split("/").pop() || filePath;
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
        sections[task.index] = this.cleanFormattedFileDocumentationSection(
          cached.section,
          task.file,
        );
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
        `with ${concurrentRequests} parallel provider request${concurrentRequests === 1 ? "" : "s"} ` +
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
      const limits = this.batchLimitsForDepth(task.context.depth);
      const taskChars = task.file.content.length;
      const nextChars = batchChars + taskChars;

      if (
        batch.length > 0 &&
        (batch.length >= limits.maxFiles || nextChars > limits.maxChars)
      ) {
        flushBatch();
      }

      batch.push(task);

      if (taskChars > limits.maxChars) {
        flushBatch();
        continue;
      }

      batchChars += taskChars;
    }

    flushBatch();
    return jobs;
  }

  private batchLimitsForDepth(
    depth: "simple" | "basic" | "standard" | "comprehensive",
  ): { maxFiles: number; maxChars: number } {
    if (depth === "comprehensive") {
      return { maxFiles: 3, maxChars: 7500 };
    }

    return { maxFiles: 5, maxChars: 12000 };
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

    if (depth === "comprehensive") {
      return [
        "For each file include evidence-based comprehensive documentation:",
        "## Module Metadata",
        "## Overview",
        "## Architecture & Design",
        "## API Reference (only when exported symbols or callable public API exist)",
        "## Dependencies and Data Flow (only when imports, calls, or data movement exist)",
        "## Configuration and Environment (only when real settings, env vars, credentials, or endpoints exist)",
        "## Errors and Recovery (only when explicit errors, validation failures, or recovery paths exist)",
        "## Usage Examples (only when real exported symbols can be used directly)",
        "## Security Considerations (only when security-relevant code exists)",
        "## Known Limitations & Edge Cases (only when source evidence exists)",
        "## See Also",
        "Keep each section compact. Include only facts visible in the source or verified context.",
        "Omit any section that would only say no items were detected, not applicable, or plaintext only.",
        "Do not add ADRs, incident response, capacity planning, SLOs, compliance claims, or version history for a single file.",
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
    const renderedFileMeta = `${this.createFileMetaMarker(file, lineCount)}\n\n`;
    const cleanedDocumentation =
      this.removeEmptyGeneratedDocumentationSections(documentation);
    return `# ${file.path}\n\n${renderedFileMeta}${cleanedDocumentation}\n\n---\n\n`;
  }

  private cleanFormattedFileDocumentationSection(
    section: string,
    file?: WorkspaceFile,
  ): string {
    const bodyMatch = section.match(
      /^(# [^\n]+\n\n(?:\[\[DOCUMINT_FILE_META:[^\]]+\]\]\n\n)?)([\s\S]*?)(?:\n---\s*)?$/,
    );

    if (!bodyMatch) {
      return section;
    }

    const cleanedBody =
      this.removeEmptyGeneratedDocumentationSections(bodyMatch[2]);
    return `${bodyMatch[1]}${cleanedBody}\n\n---\n\n`;
  }

  private removeEmptyGeneratedDocumentationSections(documentation: string): string {
    const source = documentation.trim();
    if (!source) {
      return source;
    }

    const headingPattern = /^##\s+(.+?)\s*$/gm;
    const matches = Array.from(source.matchAll(headingPattern));
    if (matches.length === 0) {
      return source;
    }

    const parts: string[] = [];
    const firstHeadingIndex = matches[0].index ?? 0;
    const preface = source.slice(0, firstHeadingIndex).trim();
    if (preface) {
      parts.push(preface);
    }

    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const start = match.index ?? 0;
      const end =
        index + 1 < matches.length
          ? matches[index + 1].index ?? source.length
          : source.length;
      const chunk = source.slice(start, end).trim();
      const title = match[1] || "";
      const body = chunk.replace(/^##\s+.+?\s*$/m, "").trim();

      if (this.shouldRemoveGeneratedDocumentationSection(title, body)) {
        continue;
      }

      parts.push(chunk);
    }

    return parts.join("\n\n").trim();
  }

  private shouldRemoveGeneratedDocumentationSection(
    title: string,
    body: string,
  ): boolean {
    const normalizedTitle = title
      .toLowerCase()
      .replace(/[#:`*_]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const removableTitles = new Set([
      "api reference",
      "dependencies",
      "dependencies and data flow",
      "configuration",
      "configuration and environment",
      "environment variables",
      "errors and recovery",
      "security considerations",
      "known limitations & edge cases",
      "known limitations and edge cases",
      "quick start",
      "usage examples",
      "see also",
    ]);

    if (!removableTitles.has(normalizedTitle)) {
      return false;
    }

    const normalizedBody = body
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[`*_>|#\-:()[\]{}.,;!?'"]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalizedBody) {
      return true;
    }

    if (normalizedBody.length > 700) {
      return false;
    }

    const negativeSignals = [
      /\bno\b.{0,80}\b(detected|found|present|available|identified|visible|defined|exported|provided)\b/,
      /\bnone\b.{0,80}\b(detected|found|present|available|identified|visible|defined|provided)\b/,
      /\bnot\b.{0,80}\b(detected|found|present|available|applicable|visible|defined)\b/,
      /\bno exported symbols?\b/,
      /\bno exports?\b/,
      /\bno imports?\b/,
      /\bno dependencies?\b/,
      /\bno data flow\b/,
      /\bno configuration\b/,
      /\bno environment\b/,
      /\bno environment variables? used\b/,
      /\bno explicit error\b/,
      /\bno error handling\b/,
      /\bno error handling mechanisms? present\b/,
      /\bno executable code\b/,
      /\bno executable logic\b/,
      /\bno runtime dependencies?\b/,
      /\bplaintext file\b/,
      /\bplaintext content only\b/,
      /\bstatic textual content\b/,
      /\bfile contains no\b/,
      /\bnot applicable\b/,
      /\bn a\b/,
    ];
    const hasNegativeSignal = negativeSignals.some((pattern) =>
      pattern.test(normalizedBody),
    );

    if (!hasNegativeSignal) {
      return false;
    }

    const concreteEvidenceSignals = [
      /```/,
      /\|.+\|.+\|/,
      /`[A-Za-z_$][\w$]*`/,
    ];
    const hasConcreteEvidence = concreteEvidenceSignals.some((pattern) =>
      pattern.test(body),
    );

    return !hasConcreteEvidence;
  }

  private createFileMetaMarker(file: WorkspaceFile, lineCount: number): string {
    const payload = Buffer.from(
      JSON.stringify({
        language: this.formatLanguageLabel(file.language),
        lines: this.formatLineCountLabel(lineCount),
        path: file.path,
      }),
      "utf-8",
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    return `[[DOCUMINT_FILE_META:${payload}]]`;
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

  private async loadProjectVisualCache(
    docsFolder: vscode.Uri,
    documentationCache?: DocumentationCacheManifest,
  ): Promise<ProjectVisualCacheManifest> {
    const empty: ProjectVisualCacheManifest = {
      version: DocGeneratorService.VISUAL_CACHE_VERSION,
    };
    const cacheFile = vscode.Uri.joinPath(
      docsFolder,
      ".documint-visual-cache.json",
    );

    try {
      const bytes = await vscode.workspace.fs.readFile(cacheFile);
      const parsed = JSON.parse(Buffer.from(bytes).toString("utf-8")) as
        | ProjectVisualCacheManifest
        | undefined;
      if (
        !parsed ||
        parsed.version !== DocGeneratorService.VISUAL_CACHE_VERSION
      ) {
        return {
          ...empty,
          entry: documentationCache?.projectVisuals,
        };
      }
      return parsed;
    } catch {
      return {
        ...empty,
        entry: documentationCache?.projectVisuals,
      };
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

  private async saveProjectVisualCache(
    docsFolder: vscode.Uri,
    cache: ProjectVisualCacheManifest,
  ): Promise<void> {
    const cacheFile = vscode.Uri.joinPath(
      docsFolder,
      ".documint-visual-cache.json",
    );
    const payload = JSON.stringify(cache, null, 2);
    await vscode.workspace.fs.writeFile(
      cacheFile,
      Buffer.from(payload, "utf-8"),
    );
  }

  private async ensureDocumentationAssets(
    docsFolder: vscode.Uri,
  ): Promise<DocumentationAssets> {
    const sourceLogo = vscode.Uri.joinPath(
      this.context.extensionUri,
      "resources",
      "icon.png",
    );
    try {
      const logoBytes = await vscode.workspace.fs.readFile(sourceLogo);
      const base64Logo = Buffer.from(logoBytes).toString("base64");
      return {
        logoHtmlSrc: `data:image/png;base64,${base64Logo}`,
      };
    } catch (error) {
      console.warn("[Documint] Failed to copy documentation logo:", error);
      return {};
    }
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

  private getCachedProjectVisualSections(
    files: WorkspaceFile[],
    projectName: string,
    projectAnalysis: ProjectAnalysis,
    projectVisualCache: ProjectVisualCacheManifest,
  ): string {
    this.throwIfCancelled("format", "__project_visuals__");

    const cacheKey = this.createProjectVisualCacheKey({
      files,
      projectName,
      projectAnalysis,
    });
    const cached = projectVisualCache.entry;
    if (cached?.cacheKey === cacheKey && cached.section.trim()) {
      return cached.section;
    }

    const section = [
      this.generateProjectTreeSection(files, projectName),
      this.generateArchitectureVisualSections(files, projectName, projectAnalysis),
    ].join("\n");

    projectVisualCache.entry = {
      cacheKey,
      section,
      generatedAt: new Date().toISOString(),
    };

    return section;
  }

  private createProjectVisualCacheKey(input: {
    files: WorkspaceFile[];
    projectName: string;
    projectAnalysis: ProjectAnalysis;
  }): string {
    const fileSignature = [...input.files]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((file) => ({
        path: file.path,
        language: file.language,
        contentHash: this.hashText(file.content),
        lineCount: file.content.split(/\r?\n/).length,
      }));

    const analysisSignature = {
      entryPoints: [...input.projectAnalysis.entryPoints].sort(),
      externalDependencies: [...input.projectAnalysis.externalDependencies].sort(),
      internalDependencies: [...input.projectAnalysis.internalDependencies]
        .map((edge) => ({
          from: edge.from,
          to: edge.to,
          source: edge.source,
        }))
        .sort((a, b) =>
          `${a.from}\u0000${a.to}\u0000${a.source}`.localeCompare(
            `${b.from}\u0000${b.to}\u0000${b.source}`,
          ),
        ),
      files: [...input.projectAnalysis.files]
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((file) => ({
          path: file.path,
          language: file.language,
          imports: file.imports
            .map((sourceImport) => ({
              source: sourceImport.source,
              resolvedPath: sourceImport.resolvedPath ?? "",
              symbols: [...sourceImport.symbols].sort(),
            }))
            .sort((a, b) =>
              `${a.source}\u0000${a.resolvedPath}`.localeCompare(
                `${b.source}\u0000${b.resolvedPath}`,
              ),
            ),
          symbols: file.symbols
            .map((symbol) => ({
              name: symbol.name,
              kind: symbol.kind,
              line: symbol.line,
              exported: symbol.exported,
              signature: symbol.signature,
            }))
            .sort((a, b) =>
              `${a.kind}\u0000${a.name}\u0000${a.line}`.localeCompare(
                `${b.kind}\u0000${b.name}\u0000${b.line}`,
              ),
            ),
        })),
    };

    return this.hashJson({
      visualCacheVersion: DocGeneratorService.VISUAL_CACHE_VERSION,
      projectName: input.projectName,
      files: fileSignature,
      analysis: analysisSignature,
    });
  }

  private createProjectSummaryCacheKey(input: {
    files: WorkspaceFile[];
    projectName: string;
    stats: ProjectStats;
    projectAnalysis: ProjectAnalysis;
    providerName: string;
    model: string;
    depth: "simple" | "basic" | "standard" | "comprehensive";
  }): string {
    const fileSignature = [...input.files]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((file) => ({
        path: file.path,
        language: file.language,
        contentHash: this.hashText(file.content),
      }));

    const analysisSignature = [...input.projectAnalysis.files]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((file) => ({
        path: file.path,
        imports: file.imports
          .map((sourceImport) => ({
            source: sourceImport.source,
            resolvedPath: sourceImport.resolvedPath ?? "",
          }))
          .sort((a, b) =>
            `${a.source}\u0000${a.resolvedPath}`.localeCompare(
              `${b.source}\u0000${b.resolvedPath}`,
            ),
          ),
        symbols: file.symbols
          .map((symbol) => ({
            name: symbol.name,
            kind: symbol.kind,
            exported: symbol.exported,
            signature: symbol.signature,
          }))
          .sort((a, b) =>
            `${a.kind}\u0000${a.name}\u0000${a.signature}`.localeCompare(
              `${b.kind}\u0000${b.name}\u0000${b.signature}`,
            ),
          ),
      }));

    return this.hashJson({
      promptVersion: DocGeneratorService.PROMPT_VERSION,
      providerName: input.providerName,
      model: input.model,
      depth: input.depth,
      projectName: input.projectName,
      stats: input.stats,
      files: fileSignature,
      entryPoints: [...input.projectAnalysis.entryPoints].sort(),
      externalDependencies: [...input.projectAnalysis.externalDependencies].sort(),
      internalDependencies: [...input.projectAnalysis.internalDependencies]
        .map((edge) => ({
          from: edge.from,
          to: edge.to,
          source: edge.source,
        }))
        .sort((a, b) =>
          `${a.from}\u0000${a.to}\u0000${a.source}`.localeCompare(
            `${b.from}\u0000${b.to}\u0000${b.source}`,
          ),
        ),
      analysis: analysisSignature,
    });
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
    providerName: string,
    documentationCache: DocumentationCacheManifest,
    projectVisualCache: ProjectVisualCacheManifest,
  ): Promise<string> {
    const visualSections = this.getCachedProjectVisualSections(
      files,
      projectName,
      projectAnalysis,
      projectVisualCache,
    );

    try {
      const projectContext =
        this.sourceAnalyzer.formatProjectContext(projectAnalysis);
      const depth = options.depth || "standard";
      const model =
        options.model ||
        vscode.workspace
          .getConfiguration("aiDocGenerator")
          .get<string>("model") ||
        "";
      const cacheKey = this.createProjectSummaryCacheKey({
        files,
        projectName,
        stats,
        projectAnalysis,
        providerName,
        model,
        depth,
      });
      const cachedSummary = documentationCache.projectSummary;
      let projectOverviewBody: string | undefined;
      if (cachedSummary?.cacheKey === cacheKey && cachedSummary.section.trim()) {
        projectOverviewBody = cachedSummary.section;
        this.reportProgress({
          phase: "generating",
          currentFile: "project summary",
          totalFiles: files.length,
          processedFiles: 0,
          percentage: 10,
          message: "Reused cached project overview.",
        });
      }

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

      if (!projectOverviewBody) {
        const summaryContext: DocumentationContext = {
          code: manifest,
          language: "plaintext",
          filePath: "__project_summary__",
          depth,
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
        projectOverviewBody = result.documentation;
        documentationCache.projectSummary = {
          cacheKey,
          section: projectOverviewBody,
          generatedAt: new Date().toISOString(),
        };
      }

      // Wrap in a project summary block
      return `## Project Overview

${visualSections}

${projectOverviewBody}

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

${visualSections}

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
    logoHtmlSrc?: string,
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
    htmlContent = this.renderFileMetaMarkers(htmlContent);

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
      logoSrc: logoHtmlSrc,
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

  private renderFileMetaMarkers(htmlContent: string): string {
    return htmlContent
      .replace(
        /<p>\s*\[\[DOCUMINT_FILE_META:([A-Za-z0-9_-]+)\]\]\s*<\/p>/g,
        (_match, payload: string) => this.renderFileMetaHtml(payload),
      )
      .replace(
        /\[\[DOCUMINT_FILE_META:([A-Za-z0-9_-]+)\]\]/g,
        (_match, payload: string) => this.renderFileMetaHtml(payload),
      );
  }

  private renderFileMetaHtml(payload: string): string {
    try {
      const decodedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
      const paddedPayload = decodedPayload.padEnd(
        decodedPayload.length + ((4 - (decodedPayload.length % 4)) % 4),
        "=",
      );
      const parsed = JSON.parse(
        Buffer.from(paddedPayload, "base64").toString("utf-8"),
      ) as { language?: unknown; lines?: unknown; path?: unknown };

      const language =
        typeof parsed.language === "string" ? parsed.language : "Code";
      const lines = typeof parsed.lines === "string" ? parsed.lines : "0 lines";
      const path = typeof parsed.path === "string" ? parsed.path : "";

      return [
        '<div class="file-meta-line" aria-label="File metadata">',
        `<span class="file-meta-chip file-meta-language">${this.escapeHtml(language)}</span>`,
        `<span class="file-meta-chip file-meta-lines">${this.escapeHtml(lines)}</span>`,
        `<span class="file-meta-chip file-meta-path" title="${this.escapeHtml(path)}">${this.escapeHtml(path)}</span>`,
        "</div>",
      ].join("");
    } catch {
      return "";
    }
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
