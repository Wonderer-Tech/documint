import { marked } from "marked";
import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import { renderLocalArchitectureDocumentation } from "./localArchitectureDocumentation";
import { renderLocalFileDocumentation } from "./localFileDocumentation";
import { renderLocalProjectDocumentation } from "./localProjectDocumentation";
import { generateHtmlTemplate } from "./htmlTemplate";

export interface LocalDocumentationDocument {
  markdown: string;
  html: string;
  fileCount: number;
  totalLines: number;
  languages: string[];
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
): LocalDocumentationDocument {
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const analysisByPath = new Map(
    project.files.map((analysis) => [analysis.path, analysis]),
  );
  const overview = renderLocalProjectDocumentation({
    projectName,
    files: sortedFiles,
    project,
  });
  const architecture = renderLocalArchitectureDocumentation({
    projectName,
    files: sortedFiles,
    project,
  });
  const fileSections = sortedFiles.map((file) => {
    const analysis = analysisByPath.get(file.path);
    if (!analysis) {
      throw new Error(`Missing source analysis for ${file.path}`);
    }
    return renderLocalFileDocumentation({ file, analysis, project });
  });
  const markdown = [
    overview,
    "",
    "---",
    "",
    architecture,
    ...fileSections.flatMap((section) => ["", "---", "", section]),
    "",
    "---",
    "",
    "*Generated locally by **DocuMint** from static source analysis. No AI provider was used.*",
  ].join("\n");
  const totalLines = sortedFiles.reduce(
    (sum, file) => sum + file.content.split(/\r?\n/).length,
    0,
  );
  const languages = Array.from(
    new Set(sortedFiles.map((file) => file.language).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const { contentHtml, tocHtml } = renderMarkdownForTemplate(markdown);
  const generationDate = new Date().toISOString();
  const safeProjectName = cleanText(projectName) || "Project";

  return {
    markdown,
    html: generateHtmlTemplate({
      title: `${safeProjectName} — Local Documentation`,
      tocHtml,
      contentHtml,
      projectName: safeProjectName,
      fileCount: sortedFiles.length,
      generationDate,
      languages,
      totalLines,
    }),
    fileCount: sortedFiles.length,
    totalLines,
    languages,
  };
}

function renderMarkdownForTemplate(markdown: string): {
  contentHtml: string;
  tocHtml: string;
} {
  const usedIds = new Map<string, number>();
  const headings: Array<{ level: number; id: string; text: string }> = [];
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
      headings.push({ level, id, text });
      return `<h${level} id="${escapeHtmlAttribute(id)}">${innerHtml}</h${level}>`;
    },
  );

  const tocItems = headings
    .filter((heading) => heading.level <= 3)
    .map(
      (heading) =>
        `<li class="toc-level-${heading.level}"><a href="#${escapeHtmlAttribute(heading.id)}">${escapeHtml(heading.text)}</a></li>`,
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
