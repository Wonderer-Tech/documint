import type {
  FileAnalysis,
  FileDependencyIndex,
  ProjectAnalysis,
  SourceSymbol,
} from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import type { LocalDocumentationFile } from "./localDocumentationModel";
import { structuralModuleName } from "./structuralModule";

export interface LocalFileDocumentationInput {
  file: WorkspaceFile;
  analysis: FileAnalysis;
  project: ProjectAnalysis;
  dependencyIndex?: FileDependencyIndex;
}

export function renderLocalFileDocumentation(
  input: LocalFileDocumentationInput,
): string {
  const dependencyIndex = input.dependencyIndex ?? buildDependencyIndex(input.project);
  const path = input.file.path.replace(/\\/g, "/");
  const uses = uniqueSorted(
    (dependencyIndex.dependenciesByPath.get(input.file.path) ?? []).map(
      (edge) => edge.to,
    ),
  );
  const usedBy = uniqueSorted(
    (dependencyIndex.dependentsByPath.get(input.file.path) ?? []).map(
      (edge) => edge.from,
    ),
  );
  const exportedSymbols = input.analysis.symbols.filter((symbol) => symbol.exported);

  return renderLocalFileDocumentationFromModel({
    path,
    module: structuralModuleName(path),
    language: input.file.language,
    lineCount: input.file.content.split(/\r?\n/).length,
    description: input.analysis.description,
    imports: input.analysis.imports,
    symbols: input.analysis.symbols,
    exportedSymbols,
    internalSymbols: input.analysis.symbols.filter((symbol) => !symbol.exported),
    todos: input.analysis.todos,
    uses,
    usedBy,
    entryPoint: input.project.entryPoints.includes(input.file.path),
  });
}

export function renderLocalFileDocumentationFromModel(
  file: LocalDocumentationFile,
): string {
  const sections: string[] = [
    `## ${inlineCode(file.path)}`,
    "",
    file.description
      ? `> ${escapeMarkdownText(file.description.text)}  \n> _Source: ${descriptionSourceLabel(file.description.source)}${file.description.line ? `, line ${file.description.line}` : ""}._`
      : "> _No module-level description found._",
    "",
    `**Module:** ${inlineCode(file.module)} · **Language:** ${inlineCode(file.language)} · **Lines:** ${file.lineCount}`,
  ];

  if (file.uses.length > 0) {
    sections.push("", `**Uses:** ${file.uses.map(inlineCode).join(", ")}`);
  }
  if (file.usedBy.length > 0) {
    sections.push("", `**Used by:** ${file.usedBy.map(inlineCode).join(", ")}`);
  }

  if (file.exportedSymbols.length > 0) {
    sections.push(
      "",
      "### Exported API",
      "",
      renderSymbolTable(file.exportedSymbols, ""),
    );
  }

  if (file.internalSymbols.length > 0) {
    sections.push(
      "",
      "### Internal API",
      "",
      renderSymbolTable(file.internalSymbols, ""),
    );
  }

  if (file.imports.length > 0) {
    sections.push("", "### Imports", "", renderImports(file));
  }

  if (file.todos.length > 0) {
    sections.push("", "### TODO / FIXME / HACK", "", renderTodos(file));
  }

  return sections.join("\n");
}

function renderSymbolTable(symbols: SourceSymbol[], emptyMessage: string): string {
  if (symbols.length === 0) return emptyMessage;

  return [
    "| Kind | Name | Signature | Line |",
    "| --- | --- | --- | ---: |",
    ...symbols.map(
      (symbol) =>
        `| ${escapeTableCell(symbol.kind)} | ${inlineCode(symbol.name)} | ${inlineCode(symbol.signature)} | ${symbol.line} |`,
    ),
  ].join("\n");
}

function renderImports(file: LocalDocumentationFile): string {
  if (file.imports.length === 0) return "No imports detected.";

  return [
    "| Source | Imported Symbols | Resolved Project File | Line |",
    "| --- | --- | --- | ---: |",
    ...file.imports.map((sourceImport) => {
      const symbols = sourceImport.symbols.length
        ? sourceImport.symbols.map(inlineCode).join(", ")
        : "—";
      const resolved = sourceImport.resolvedPath
        ? inlineCode(sourceImport.resolvedPath)
        : "External or unresolved";
      return `| ${inlineCode(sourceImport.source)} | ${symbols} | ${resolved} | ${sourceImport.line} |`;
    }),
  ].join("\n");
}

function renderPathList(paths: string[], emptyMessage: string): string {
  return paths.length > 0
    ? paths.map((filePath) => `- ${inlineCode(filePath)}`).join("\n")
    : emptyMessage;
}

function renderTodos(file: LocalDocumentationFile): string {
  if (file.todos.length === 0) {
    return "No TODO, FIXME, or HACK comments detected.";
  }

  return [
    "| Line | Comment |",
    "| ---: | --- |",
    ...file.todos.map(
      (todo) => `| ${todo.line} | ${escapeTableCell(todo.text)} |`,
    ),
  ].join("\n");
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

function descriptionSourceLabel(source: string): string {
  switch (source) {
    case "file-comment":
      return "file/module comment";
    case "declaration-comment":
      return "documented exported declaration";
    case "module-docstring":
      return "module docstring";
    case "package-comment":
      return "package comment";
    case "readme":
      return "README";
    default:
      return source;
  }
}

function escapeMarkdownText(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
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
