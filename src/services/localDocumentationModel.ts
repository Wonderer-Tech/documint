import type {
  ProjectAnalysis,
  SourceImport,
  SourceSymbol,
  TodoComment,
} from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import { extractLocalReadmeFacts } from "./localReadmeFacts";
import {
  normalizeProjectPath,
  structuralModuleName,
} from "./structuralModule";

export type LocalDescriptionSource =
  | "file-comment"
  | "declaration-comment"
  | "readme";

export interface LocalDescription {
  text: string;
  source: LocalDescriptionSource;
  line?: number;
}

export interface LocalDocumentationFile {
  path: string;
  module: string;
  language: string;
  lineCount: number;
  description?: LocalDescription;
  imports: SourceImport[];
  symbols: SourceSymbol[];
  exportedSymbols: SourceSymbol[];
  internalSymbols: SourceSymbol[];
  todos: TodoComment[];
  uses: string[];
  usedBy: string[];
  entryPoint: boolean;
}

export interface LocalDocumentationModule {
  name: string;
  filePaths: string[];
  fileCount: number;
  lineCount: number;
  languages: string[];
  exportedSymbolCount: number;
  dependencyCount: number;
  dependentCount: number;
}

export interface LocalDocumentationModuleEdge {
  from: string;
  to: string;
  count: number;
}

export interface LocalDocumentationModel {
  projectName: string;
  files: LocalDocumentationFile[];
  modules: LocalDocumentationModule[];
  moduleEdges: LocalDocumentationModuleEdge[];
  entryPoints: string[];
  externalDependencies: string[];
  internalDependencies: ProjectAnalysis["internalDependencies"];
  totalLines: number;
  totalSymbols: number;
  totalExports: number;
  totalTodos: number;
  languages: string[];
}

export interface BuildLocalDocumentationModelOptions {
  readme?: string;
}

export function buildLocalDocumentationModel(
  projectName: string,
  files: WorkspaceFile[],
  project: ProjectAnalysis,
  options: BuildLocalDocumentationModelOptions = {},
): LocalDocumentationModel {
  const sortedFiles = [...files].sort((a, b) =>
    normalizeProjectPath(a.path).localeCompare(normalizeProjectPath(b.path)),
  );
  const analysisByPath = new Map(
    project.files.map((analysis) => [
      normalizeProjectPath(analysis.path),
      analysis,
    ]),
  );
  const dependencyIndex = buildDependencyIndex(project);
  const readmeFacts = extractLocalReadmeFacts(
    options.readme,
    sortedFiles.map((file) => file.path),
  );
  const entryPoints = new Set(
    project.entryPoints.map((value) => normalizeProjectPath(value)),
  );

  const fileModels: LocalDocumentationFile[] = sortedFiles.map((file) => {
    const path = normalizeProjectPath(file.path);
    const analysis = analysisByPath.get(path);
    if (!analysis) {
      throw new Error(`Missing source analysis for ${path}`);
    }

    const sourceDescription = analysis.description;
    const readmeDescription = readmeFacts.descriptionsByPath.get(path);
    const description: LocalDescription | undefined = sourceDescription
      ? { ...sourceDescription }
      : readmeDescription
        ? { ...readmeDescription }
        : undefined;

    const exportedSymbols = analysis.symbols.filter(
      (symbol) => symbol.exported,
    );
    const internalSymbols = analysis.symbols.filter(
      (symbol) => !symbol.exported,
    );

    return {
      path,
      module: structuralModuleName(path),
      language: file.language,
      lineCount: countLines(file.content),
      description,
      imports: analysis.imports.map((sourceImport) => ({ ...sourceImport })),
      symbols: [...analysis.symbols],
      exportedSymbols,
      internalSymbols,
      todos: [...analysis.todos],
      uses: uniqueSorted(dependencyIndex.uses.get(path) ?? []),
      usedBy: uniqueSorted(dependencyIndex.usedBy.get(path) ?? []),
      entryPoint: entryPoints.has(path),
    };
  });

  const modules = buildModules(fileModels);
  const moduleEdges = buildModuleEdges(project.internalDependencies);

  return {
    projectName: cleanText(projectName) || "Project",
    files: fileModels,
    modules,
    moduleEdges,
    entryPoints: uniqueSorted(project.entryPoints.map(normalizeProjectPath)),
    externalDependencies: uniqueSorted(project.externalDependencies),
    internalDependencies: project.internalDependencies.map((edge) => ({
      ...edge,
      from: normalizeProjectPath(edge.from),
      to: normalizeProjectPath(edge.to),
    })),
    totalLines: fileModels.reduce((sum, file) => sum + file.lineCount, 0),
    totalSymbols: fileModels.reduce(
      (sum, file) => sum + file.symbols.length,
      0,
    ),
    totalExports: fileModels.reduce(
      (sum, file) => sum + file.exportedSymbols.length,
      0,
    ),
    totalTodos: fileModels.reduce(
      (sum, file) => sum + file.todos.length,
      0,
    ),
    languages: uniqueSorted(
      fileModels.map((file) => file.language).filter(Boolean),
    ),
  };
}

function buildDependencyIndex(project: ProjectAnalysis): {
  uses: Map<string, string[]>;
  usedBy: Map<string, string[]>;
} {
  const uses = new Map<string, string[]>();
  const usedBy = new Map<string, string[]>();

  for (const edge of project.internalDependencies) {
    const from = normalizeProjectPath(edge.from);
    const to = normalizeProjectPath(edge.to);

    const outgoing = uses.get(from) ?? [];
    outgoing.push(to);
    uses.set(from, outgoing);

    const incoming = usedBy.get(to) ?? [];
    incoming.push(from);
    usedBy.set(to, incoming);
  }

  return { uses, usedBy };
}

function buildModules(
  files: LocalDocumentationFile[],
): LocalDocumentationModule[] {
  const rows = new Map<string, LocalDocumentationModule>();

  for (const file of files) {
    const current = rows.get(file.module) ?? {
      name: file.module,
      filePaths: [],
      fileCount: 0,
      lineCount: 0,
      languages: [],
      exportedSymbolCount: 0,
      dependencyCount: 0,
      dependentCount: 0,
    };

    current.filePaths.push(file.path);
    current.fileCount++;
    current.lineCount += file.lineCount;
    current.languages.push(file.language);
    current.exportedSymbolCount += file.exportedSymbols.length;
    current.dependencyCount += file.uses.length;
    current.dependentCount += file.usedBy.length;
    rows.set(file.module, current);
  }

  return Array.from(rows.values())
    .map((module) => ({
      ...module,
      filePaths: uniqueSorted(module.filePaths),
      languages: uniqueSorted(module.languages),
    }))
    .sort(
      (a, b) =>
        b.fileCount - a.fileCount ||
        a.name.localeCompare(b.name),
    );
}

function buildModuleEdges(
  edges: ProjectAnalysis["internalDependencies"],
): LocalDocumentationModuleEdge[] {
  const counts = new Map<string, LocalDocumentationModuleEdge>();

  for (const edge of edges) {
    const from = structuralModuleName(edge.from);
    const to = structuralModuleName(edge.to);
    if (from === to) {
      continue;
    }

    const key = `${from}\0${to}`;
    const current = counts.get(key) ?? { from, to, count: 0 };
    current.count++;
    counts.set(key, current);
  }

  return Array.from(counts.values()).sort(
    (a, b) =>
      b.count - a.count ||
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to),
  );
}

function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function cleanText(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}
