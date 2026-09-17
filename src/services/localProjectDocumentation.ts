import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";

export interface LocalProjectDocumentationInput {
  projectName: string;
  files: WorkspaceFile[];
  project: ProjectAnalysis;
}

interface AggregateRow {
  name: string;
  fileCount: number;
  lineCount: number;
  symbolCount: number;
  exportedSymbolCount: number;
}

interface TreeNode {
  files: Set<string>;
  children: Map<string, TreeNode>;
}

/**
 * Renders a deterministic project overview from scanner/analyzer facts only.
 * No provider, prompt, or semantic inference is involved.
 */
export function renderLocalProjectDocumentation(
  input: LocalProjectDocumentationInput,
): string {
  const projectName = cleanText(input.projectName) || "Project";
  const files = [...input.files].sort((a, b) => a.path.localeCompare(b.path));
  const analysisByPath = new Map(
    input.project.files.map((file) => [file.path, file]),
  );
  const totalLines = files.reduce((sum, file) => sum + countLines(file.content), 0);
  const totalSymbols = input.project.files.reduce(
    (sum, file) => sum + file.symbols.length,
    0,
  );
  const totalExports = input.project.files.reduce(
    (sum, file) => sum + file.symbols.filter((symbol) => symbol.exported).length,
    0,
  );
  const totalTodos = input.project.files.reduce(
    (sum, file) => sum + file.todos.length,
    0,
  );

  return [
    `# ${escapeHeading(projectName)} — Local Documentation`,
    "",
    "> Generated entirely from static source analysis. No AI inference, model, API key, or external provider is used.",
    "",
    "## Project Facts",
    "",
    `- **Files:** ${files.length}`,
    `- **Lines:** ${totalLines}`,
    `- **Detected symbols:** ${totalSymbols}`,
    `- **Exported symbols:** ${totalExports}`,
    `- **Internal dependency links:** ${input.project.internalDependencies.length}`,
    `- **External dependencies:** ${input.project.externalDependencies.length}`,
    `- **TODO/FIXME/HACK comments:** ${totalTodos}`,
    "",
    "## Language Summary",
    "",
    renderAggregateTable(buildLanguageRows(files, analysisByPath)),
    "",
    "## Module Summary",
    "",
    renderAggregateTable(buildModuleRows(files, analysisByPath)),
    "",
    "## Entry Points",
    "",
    renderPathList(input.project.entryPoints, "No entry points detected."),
    "",
    "## External Dependencies",
    "",
    renderCodeList(
      input.project.externalDependencies,
      "No external dependencies detected from source imports.",
    ),
    "",
    "## Structurally Connected Files",
    "",
    renderStructuralFiles(files, analysisByPath, input.project),
    "",
    "## Source Tree",
    "",
    "```text",
    renderSourceTree(projectName, files),
    "```",
  ].join("\n");
}

function buildLanguageRows(
  files: WorkspaceFile[],
  analysisByPath: Map<string, ProjectAnalysis["files"][number]>,
): AggregateRow[] {
  const rows = new Map<string, AggregateRow>();
  for (const file of files) {
    addAggregate(rows, file.language || "unknown", file, analysisByPath.get(file.path));
  }
  return Array.from(rows.values()).sort(
    (a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name),
  );
}

function buildModuleRows(
  files: WorkspaceFile[],
  analysisByPath: Map<string, ProjectAnalysis["files"][number]>,
): AggregateRow[] {
  const rows = new Map<string, AggregateRow>();
  for (const file of files) {
    addAggregate(rows, moduleName(file.path), file, analysisByPath.get(file.path));
  }
  return Array.from(rows.values()).sort(
    (a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name),
  );
}

function addAggregate(
  rows: Map<string, AggregateRow>,
  name: string,
  file: WorkspaceFile,
  analysis: ProjectAnalysis["files"][number] | undefined,
): void {
  const row = rows.get(name) ?? {
    name,
    fileCount: 0,
    lineCount: 0,
    symbolCount: 0,
    exportedSymbolCount: 0,
  };
  row.fileCount++;
  row.lineCount += countLines(file.content);
  row.symbolCount += analysis?.symbols.length ?? 0;
  row.exportedSymbolCount +=
    analysis?.symbols.filter((symbol) => symbol.exported).length ?? 0;
  rows.set(name, row);
}

function renderAggregateTable(rows: AggregateRow[]): string {
  if (rows.length === 0) {
    return "No source files detected.";
  }

  return [
    "| Name | Files | Lines | Symbols | Exports |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${inlineCode(row.name)} | ${row.fileCount} | ${row.lineCount} | ${row.symbolCount} | ${row.exportedSymbolCount} |`,
    ),
  ].join("\n");
}

function renderStructuralFiles(
  files: WorkspaceFile[],
  analysisByPath: Map<string, ProjectAnalysis["files"][number]>,
  project: ProjectAnalysis,
): string {
  if (files.length === 0) {
    return "No source files detected.";
  }

  const entryPoints = new Set(project.entryPoints);
  const linkCounts = new Map<string, number>();
  for (const edge of project.internalDependencies) {
    linkCounts.set(edge.from, (linkCounts.get(edge.from) ?? 0) + 1);
    linkCounts.set(edge.to, (linkCounts.get(edge.to) ?? 0) + 1);
  }

  const ranked = files
    .map((file) => {
      const analysis = analysisByPath.get(file.path);
      return {
        file,
        exports: analysis?.symbols.filter((symbol) => symbol.exported).length ?? 0,
        links: linkCounts.get(file.path) ?? 0,
        entryPoint: entryPoints.has(file.path),
      };
    })
    .sort(
      (a, b) =>
        Number(b.entryPoint) - Number(a.entryPoint) ||
        b.links - a.links ||
        b.exports - a.exports ||
        a.file.path.localeCompare(b.file.path),
    )
    .slice(0, 20);

  return [
    "Files are ordered by detected entry-point status, internal dependency links, and exported-symbol count.",
    "",
    "| File | Language | Lines | Exports | Internal Links | Entry Point |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...ranked.map(
      ({ file, exports, links, entryPoint }) =>
        `| ${inlineCode(file.path)} | ${inlineCode(file.language)} | ${countLines(file.content)} | ${exports} | ${links} | ${entryPoint ? "Yes" : "No"} |`,
    ),
  ].join("\n");
}

function renderSourceTree(projectName: string, files: WorkspaceFile[]): string {
  const root: TreeNode = { files: new Set(), children: new Map() };
  for (const file of files) {
    const parts = normalizePath(file.path).split("/").filter(Boolean);
    if (parts.length === 0) {
      continue;
    }
    let node = root;
    for (const part of parts.slice(0, -1)) {
      let child = node.children.get(part);
      if (!child) {
        child = { files: new Set(), children: new Map() };
        node.children.set(part, child);
      }
      node = child;
    }
    node.files.add(parts[parts.length - 1]);
  }

  const lines = [`${cleanTreeLabel(projectName) || "project"}/`];
  appendTreeChildren(root, "", lines);
  return lines.join("\n");
}

function appendTreeChildren(node: TreeNode, prefix: string, lines: string[]): void {
  const entries = [
    ...Array.from(node.children.keys()).map((name) => ({ name, folder: true })),
    ...Array.from(node.files).map((name) => ({ name, folder: false })),
  ].sort((a, b) => {
    if (a.folder !== b.folder) {
      return a.folder ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  entries.forEach((entry, index) => {
    const last = index === entries.length - 1;
    lines.push(
      `${prefix}${last ? "└── " : "├── "}${cleanTreeLabel(entry.name)}${entry.folder ? "/" : ""}`,
    );
    if (entry.folder) {
      appendTreeChildren(
        node.children.get(entry.name)!,
        `${prefix}${last ? "    " : "│   "}`,
        lines,
      );
    }
  });
}

function renderPathList(paths: string[], emptyMessage: string): string {
  const values = uniqueSorted(paths);
  return values.length > 0
    ? values.map((value) => `- ${inlineCode(value)}`).join("\n")
    : emptyMessage;
}

function renderCodeList(values: string[], emptyMessage: string): string {
  const sorted = uniqueSorted(values);
  return sorted.length > 0
    ? sorted.map((value) => `- ${inlineCode(value)}`).join("\n")
    : emptyMessage;
}

function moduleName(filePath: string): string {
  const parts = normalizePath(filePath).split("/").filter(Boolean);
  return parts.length > 1 ? parts[0] : "(root)";
}

function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function normalizePath(value: string): string {
  return String(value).replace(/\\/g, "/");
}

function cleanText(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function cleanTreeLabel(value: string): string {
  return cleanText(value).replace(/[\u2500-\u257f]/g, "-");
}

function escapeHeading(value: string): string {
  return cleanText(value).replace(/[#]/g, "\\#");
}

function inlineCode(value: string): string {
  return `\`${cleanText(value).replace(/`/g, "'")}\``;
}
