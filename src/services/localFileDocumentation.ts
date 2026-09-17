import type {
  FileAnalysis,
  FileDependencyIndex,
  ProjectAnalysis,
  SourceSymbol,
} from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";

export interface LocalFileDocumentationInput {
  file: WorkspaceFile;
  analysis: FileAnalysis;
  project: ProjectAnalysis;
  dependencyIndex?: FileDependencyIndex;
}

/**
 * Renders factual per-file Markdown from source-analysis evidence only.
 *
 * This renderer deliberately performs no semantic inference. Every section is
 * derived from scanner/analyzer facts so Local Documentation can remain fully
 * deterministic, offline, and provider-independent.
 */
export function renderLocalFileDocumentation(
  input: LocalFileDocumentationInput,
): string {
  const { file, analysis, project } = input;
  const dependencyIndex = input.dependencyIndex ?? buildDependencyIndex(project);
  const exportedSymbols = analysis.symbols.filter((symbol) => symbol.exported);
  const otherSymbols = analysis.symbols.filter((symbol) => !symbol.exported);
  const dependencies = uniqueSorted(
    (dependencyIndex.dependenciesByPath.get(file.path) ?? []).map(
      (edge) => edge.to,
    ),
  );
  const dependents = uniqueSorted(
    (dependencyIndex.dependentsByPath.get(file.path) ?? []).map(
      (edge) => edge.from,
    ),
  );
  const lineCount = file.content.split(/\r?\n/).length;

  return [
    `## ${inlineCode(file.path)}`,
    "",
    "> Local documentation generated from static source analysis only. No AI inference is used.",
    "",
    `- **Language:** ${inlineCode(file.language)}`,
    `- **Lines:** ${lineCount}`,
    `- **Detected symbols:** ${analysis.symbols.length}`,
    `- **Imports:** ${analysis.imports.length}`,
    `- **TODO/FIXME/HACK comments:** ${analysis.todos.length}`,
    "",
    "### Exported API",
    "",
    renderSymbolTable(exportedSymbols, "No exported symbols detected."),
    "",
    "### Other Detected Symbols",
    "",
    renderSymbolTable(otherSymbols, "No additional symbols detected."),
    "",
    "### Imports",
    "",
    renderImports(analysis),
    "",
    "### Internal Dependencies",
    "",
    renderPathList(dependencies, "No internal dependencies detected."),
    "",
    "### Known Dependents",
    "",
    renderPathList(dependents, "No known project dependents detected."),
    "",
    "### TODO / FIXME / HACK",
    "",
    renderTodos(analysis),
  ].join("\n");
}

function renderSymbolTable(symbols: SourceSymbol[], emptyMessage: string): string {
  if (symbols.length === 0) {
    return emptyMessage;
  }

  const rows = symbols.map(
    (symbol) =>
      `| ${escapeTableCell(symbol.kind)} | ${inlineCode(symbol.name)} | ${inlineCode(symbol.signature)} | ${symbol.line} |`,
  );

  return [
    "| Kind | Name | Signature | Line |",
    "| --- | --- | --- | ---: |",
    ...rows,
  ].join("\n");
}

function renderImports(analysis: FileAnalysis): string {
  if (analysis.imports.length === 0) {
    return "No imports detected.";
  }

  const rows = analysis.imports.map((sourceImport) => {
    const symbols = sourceImport.symbols.length
      ? sourceImport.symbols.map(inlineCode).join(", ")
      : "—";
    const resolved = sourceImport.resolvedPath
      ? inlineCode(sourceImport.resolvedPath)
      : "External or unresolved";

    return `| ${inlineCode(sourceImport.source)} | ${symbols} | ${resolved} | ${sourceImport.line} |`;
  });

  return [
    "| Source | Imported Symbols | Resolved Project File | Line |",
    "| --- | --- | --- | ---: |",
    ...rows,
  ].join("\n");
}

function renderPathList(paths: string[], emptyMessage: string): string {
  return paths.length > 0
    ? paths.map((filePath) => `- ${inlineCode(filePath)}`).join("\n")
    : emptyMessage;
}

function renderTodos(analysis: FileAnalysis): string {
  if (analysis.todos.length === 0) {
    return "No TODO, FIXME, or HACK comments detected.";
  }

  const rows = analysis.todos.map(
    (todo) => `| ${todo.line} | ${escapeTableCell(todo.text)} |`,
  );

  return ["| Line | Comment |", "| ---: | --- |", ...rows].join("\n");
}

function buildDependencyIndex(project: ProjectAnalysis): FileDependencyIndex {
  const dependenciesByPath = new Map<
    string,
    ProjectAnalysis["internalDependencies"]
  >();
  const dependentsByPath = new Map<
    string,
    ProjectAnalysis["internalDependencies"]
  >();

  for (const edge of project.internalDependencies) {
    const dependencies = dependenciesByPath.get(edge.from) ?? [];
    dependencies.push(edge);
    dependenciesByPath.set(edge.from, dependencies);

    const dependents = dependentsByPath.get(edge.to) ?? [];
    dependents.push(edge);
    dependentsByPath.set(edge.to, dependents);
  }

  return { dependenciesByPath, dependentsByPath };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function inlineCode(value: string): string {
  return `\`${String(value).replace(/`/g, "'").replace(/[\r\n]+/g, " ")}\``;
}

function escapeTableCell(value: string): string {
  return String(value)
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]+/g, " ")
    .trim();
}
