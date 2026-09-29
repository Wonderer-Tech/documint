import { marked } from "marked";
import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import { renderLocalArchitectureDocumentationFromModel } from "./localArchitectureDocumentation";
import { renderLocalFileDocumentationFromModel } from "./localFileDocumentation";
import { renderLocalProjectDocumentationFromModel } from "./localProjectDocumentation";
import {
  buildLocalDocumentationModel,
  type LocalDocumentationModel,
} from "./localDocumentationModel";
import { generateHtmlTemplate } from "./htmlTemplate";
import { buildLocalCodeMapData } from "./localCodeMapData";

export interface LocalDocumentationDocument {
  markdown: string;
  html: string;
  fileCount: number;
  totalLines: number;
  languages: string[];
  model: LocalDocumentationModel;
}

export interface LocalDocumentationDocumentOptions {
  readme?: string;
}

/**
 * Assembles the complete Local Documentation artifact from deterministic
 * scanner/analyzer evidence. This module has no provider or VS Code runtime
 * dependency and performs no AI/model calls.
 */
export function buildLocalDocumentationDocument(
  projectName: string,
  files: WorkspaceFile[],
  project: ProjectAnalysis,
  options: LocalDocumentationDocumentOptions = {},
): LocalDocumentationDocument {
  const model = buildLocalDocumentationModel(
    projectName,
    files,
    project,
    { readme: options.readme },
  );
  const markdownOverview = renderLocalProjectDocumentationFromModel(
    model,
    { surface: "markdown" },
  );
  const htmlOverview = renderLocalProjectDocumentationFromModel(
    model,
    { surface: "html" },
  );
  const markdownArchitecture = renderLocalArchitectureDocumentationFromModel(
    model,
    { surface: "markdown" },
  );
  const htmlArchitecture = renderLocalArchitectureDocumentationFromModel(
    model,
    { surface: "summary" },
  );
  const fileSections = model.files.map((file) =>
    renderLocalFileDocumentationFromModel(file),
  );
  const markdown = assembleDocumentMarkdown(
    markdownOverview,
    markdownArchitecture,
    fileSections,
  );
  const htmlSourceMarkdown = assembleDocumentMarkdown(
    htmlOverview,
    htmlArchitecture,
    fileSections,
  );
  const totalLines = model.totalLines;
  const languages = model.languages;
  const { contentHtml, tocHtml } = renderMarkdownForTemplate(
    htmlSourceMarkdown,
    model.files.map((file) => file.path),
  );
  const generationDate = new Date().toISOString();
  const safeProjectName = model.projectName;

  return {
    markdown,
    html: generateHtmlTemplate({
      title: `${safeProjectName} — Local Documentation`,
      tocHtml,
      contentHtml,
      projectName: safeProjectName,
      fileCount: model.files.length,
      generationDate,
      languages,
      totalLines,
      localCodeMap: buildLocalCodeMapData(model),
      externalAssets: false,
    }),
    fileCount: model.files.length,
    totalLines,
    languages,
    model,
  };
}

function assembleDocumentMarkdown(
  overview: string,
  architecture: string,
  fileSections: string[],
): string {
  return [
    overview,
    "",
    "---",
    "",
    architecture,
    ...fileSections.flatMap((section) => ["", "---", "", section]),
  ].join("\n");
}

function renderMarkdownForTemplate(markdown: string, filePaths: string[]): {
  contentHtml: string;
  tocHtml: string;
} {
  const usedIds = new Map<string, number>();
  const headings: Array<{ level: number; id: string; text: string; filePath?: string }> = [];
  const knownFiles = new Set(filePaths.map((filePath) => filePath.replace(/\\/g, "/")));
  let contentHtml = marked.parse(markdown) as string;

  contentHtml = contentHtml.replace(
    /<h([1-6])>([\s\S]*?)<\/h\1>/g,
    (_full, levelText: string, innerHtml: string) => {
      const level = Number(levelText);
      const text = stripTags(innerHtml).trim() || "section";
      const base = slug(text) || "section";
      const seen = usedIds.get(base) ?? 0;
      usedIds.set(base, seen + 1);
      const id = seen === 0 ? base : `${base}-${seen + 1}`;
      const filePath = level === 2 && /^<code>[\s\S]*<\/code>$/.test(innerHtml) && knownFiles.has(text)
        ? text : undefined;
      headings.push({ level, id, text, filePath });
      const fileAttribute = filePath ? ` data-documint-file-path="${escapeHtmlAttribute(filePath)}"` : "";
      return `<h${level} id="${escapeHtmlAttribute(id)}"${fileAttribute}>${innerHtml}</h${level}>`;
    },
  );

  const tocItems = headings
    .filter((heading) => heading.level <= 3)
    .map(
      (heading) =>
        `<li><a class="toc-link level-${heading.level}" href="#${escapeHtmlAttribute(heading.id)}"${heading.filePath ? ` data-documint-file-path="${escapeHtmlAttribute(heading.filePath)}"` : ""}><span class="toc-text">${escapeHtml(heading.text)}</span></a></li>`,
    )
    .join("");

  return {
    contentHtml,
    tocHtml: `<ul>${tocItems}</ul>`,
  };
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`'"<>]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanText(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}
