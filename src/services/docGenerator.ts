import * as vscode from "vscode";
import { marked } from "marked";
import { WorkspaceScanner } from "../scanner/workspaceScanner";
import { BaseAIProvider } from "../providers/aiProvider";
import { ProviderFactory } from "../providers/providerFactory";
import {
  DocumentationContext,
  GenerationProgress,
  DocumentationError,
  WorkspaceFile,
} from "../types";
import { SecretStorageManager } from "../config/secretStorage";
import { generateHtmlTemplate } from "./htmlTemplate";

export interface DocGeneratorOptions {
  provider?: string;
  model?: string;
  /** Token context window — from auto-fetch or user override in sidebar */
  contextWindow?: number;
  depth?: "basic" | "standard" | "comprehensive";
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

export class DocGeneratorService {
  private scanner: WorkspaceScanner;
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

      this.reportProgress({
        phase: "scanning",
        currentFile: "",
        totalFiles: files.length,
        processedFiles: files.length,
        percentage: 8,
        message: `Found ${files.length} files (${stats.totalLines.toLocaleString()} lines) across ${stats.languages.length} language(s)`,
      });

      if (this.cancellationToken?.isCancellationRequested) {
        throw new DocumentationError("Generation cancelled", "scan");
      }

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
        options,
      );

      let allDocumentation = `# DocuMint\n\n`;
      allDocumentation +=
        `# ${workspaceFolder.name} — Documentation\n\n` + projectSummary;
      allDocumentation += `\n\n---\n\n`;

      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (this.cancellationToken?.isCancellationRequested) {
          throw new DocumentationError("Generation cancelled", "api");
        }

        this.reportProgress({
          phase: "generating",
          currentFile: file.path,
          totalFiles,
          processedFiles: i,
          percentage: 12 + (i / totalFiles) * 78,
          message: `Documenting ${file.path}...`,
        });

        try {
          const result = await this.generateForFile(file, options);
          const lineCount = file.content.split("\n").length;
          const fileMeta = `*${file.language} · ${lineCount.toLocaleString()} lines · \`${file.path}\`*\n\n`;
          allDocumentation += `# ${file.path}\n\n${fileMeta}${result.documentation}\n\n---\n\n`;
        } catch (error) {
          console.warn(`Failed to generate docs for ${file.path}:`, error);
          allDocumentation += `# ${file.path}\n\n> ⚠️ Documentation generation failed: ${error instanceof Error ? error.message : String(error)}\n\n---\n\n`;
        }
      }

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

  /**
   * Generates a project-level overview using a condensed manifest of all files.
   */
  private async generateProjectSummary(
    files: WorkspaceFile[],
    projectName: string,
    stats: ProjectStats,
    options: DocGeneratorOptions,
  ): Promise<string> {
    try {
      // Build a manifest: file path + first 5 lines of each file
      const manifest = files
        .map((f) => {
          const preview = f.content.split("\n").slice(0, 5).join("\n").trim();
          return `### ${f.path} (${f.language})\n\`\`\`\n${preview}\n\`\`\``;
        })
        .join("\n\n");

      const summaryContext: DocumentationContext = {
        code: manifest,
        language: "plaintext",
        filePath: "__project_summary__",
        depth: "standard",
        existingContext: `Project: ${projectName}\nLanguages: ${stats.languages.join(", ")}\nFiles: ${stats.fileCount}\nTotal lines: ${stats.totalLines}`,
      };

      const result = await this.aiProvider.generateDocumentation({
        ...summaryContext,
        model: options.model,
        contextWindow: options.contextWindow,
        code: `Project: ${projectName}
Languages: ${stats.languages.join(", ")}
Total files: ${stats.fileCount}
Total lines of code: ${stats.totalLines.toLocaleString()}

File manifest (path + first 5 lines each):
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
    } catch {
      // Non-fatal: fall back to a static summary
      return `## Project Overview

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

  private async generateForFile(
    file: { path: string; language: string; content: string },
    options: DocGeneratorOptions,
  ) {
    const context: DocumentationContext = {
      code: file.content,
      language: file.language,
      filePath: file.path,
      depth: options.depth || "standard",
      model: options.model,
      contextWindow: options.contextWindow,
    };

    return await this.aiProvider.generateDocumentation(context);
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

    // Normalise Windows backslash paths in headings before parsing
    const normalisedMarkdown = markdown.replace(/^(#{1,4}\s+.+)$/gm, (line) =>
      line.replace(/\\/g, "/"),
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
}
