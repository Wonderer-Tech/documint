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
  primaryFilePaths: string[];
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

export interface LocalPackageScript {
  name: string;
  command: string;
}

export interface LocalVsCodeCommand {
  id: string;
  title?: string;
}

export interface LocalVsCodeSetting {
  key: string;
  defaultValue?: unknown;
}

export interface LocalGettingStartedFacts {
  packageManager: "npm";
  scripts: LocalPackageScript[];
  vscodeCommands: LocalVsCodeCommand[];
  vscodeSettings: LocalVsCodeSetting[];
  extensionEntry?: string;
}

export interface LocalReadingPathItem {
  path: string;
  reason: string;
  entryPoint: boolean;
}

export interface LocalPackageScript {
  name: string;
  command: string;
  run: string;
}

export interface LocalVsCodeCommand {
  id: string;
  title: string;
}

export interface LocalVsCodeSetting {
  key: string;
  defaultValue?: unknown;
}

export interface LocalGettingStartedFacts {
  packageJsonPath: string;
  extensionEntry?: string;
  scripts: LocalPackageScript[];
  vscodeCommands: LocalVsCodeCommand[];
  vscodeSettings: LocalVsCodeSetting[];
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
  gettingStarted?: LocalGettingStartedFacts;
  suggestedReadingPath: LocalReadingPathItem[];
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
  const gettingStarted = extractGettingStartedFacts(sortedFiles);
  const suggestedReadingPath = buildSuggestedReadingPath(fileModels);

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
    gettingStarted,
    suggestedReadingPath,
  };
}

function buildSuggestedReadingPath(
  files: LocalDocumentationFile[],
): LocalReadingPathItem[] {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const selected: LocalReadingPathItem[] = [];
  const seen = new Set<string>();
  const queue: Array<{ path: string; parent?: string }> = files
    .filter((file) => file.entryPoint)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => ({ path: file.path }));

  while (queue.length > 0 && selected.length < 8) {
    const current = queue.shift()!;
    if (seen.has(current.path)) {
      continue;
    }
    const file = byPath.get(current.path);
    if (!file) {
      continue;
    }

    seen.add(file.path);
    selected.push({
      path: file.path,
      entryPoint: file.entryPoint,
      reason: file.entryPoint
        ? "Detected project entry point."
        : current.parent
          ? `Imported by ${current.parent}.`
          : readingReason(file),
    });

    const next = file.uses
      .map((path) => byPath.get(path))
      .filter((value): value is LocalDocumentationFile => Boolean(value))
      .filter((value) => !seen.has(value.path))
      .sort(
        (a, b) =>
          b.usedBy.length - a.usedBy.length ||
          b.exportedSymbols.length - a.exportedSymbols.length ||
          a.path.localeCompare(b.path),
      );

    for (const dependency of next) {
      queue.push({ path: dependency.path, parent: file.path });
    }
  }

  if (selected.length < 8) {
    const fallbacks = files
      .filter((file) => !seen.has(file.path))
      .sort(
        (a, b) =>
          b.usedBy.length - a.usedBy.length ||
          b.uses.length - a.uses.length ||
          b.exportedSymbols.length - a.exportedSymbols.length ||
          a.path.localeCompare(b.path),
      );

    for (const file of fallbacks) {
      if (selected.length >= 8) break;
      seen.add(file.path);
      selected.push({
        path: file.path,
        entryPoint: file.entryPoint,
        reason: readingReason(file),
      });
    }
  }

  return selected;
}

function readingReason(file: LocalDocumentationFile): string {
  if (file.usedBy.length > 0) {
    return `Used by ${file.usedBy.length} project file${file.usedBy.length === 1 ? "" : "s"}.`;
  }
  if (file.uses.length > 0) {
    return `Uses ${file.uses.length} internal project file${file.uses.length === 1 ? "" : "s"}.`;
  }
  if (file.exportedSymbols.length > 0) {
    return `Exports ${file.exportedSymbols.length} detected API symbol${file.exportedSymbols.length === 1 ? "" : "s"}.`;
  }
  return "Included as a structurally relevant source file.";
}

function extractGettingStartedFacts(
  files: WorkspaceFile[],
): LocalGettingStartedFacts | undefined {
  const manifest = files.find(
    (file) => normalizeProjectPath(file.path) === "package.json",
  );
  if (!manifest) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(manifest.content) as {
      main?: unknown;
      scripts?: unknown;
      contributes?: {
        commands?: unknown;
        configuration?: {
          properties?: unknown;
        };
      };
    };

    const scripts =
      parsed.scripts && typeof parsed.scripts === "object"
        ? Object.entries(parsed.scripts as Record<string, unknown>)
            .filter((entry): entry is [string, string] =>
              typeof entry[1] === "string",
            )
            .map(([name, command]) => ({ name, command }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];

    const vscodeCommands = Array.isArray(parsed.contributes?.commands)
      ? parsed.contributes!.commands
          .filter(
            (value): value is { command: string; title?: string } =>
              Boolean(
                value &&
                typeof value === "object" &&
                typeof (value as { command?: unknown }).command === "string",
              ),
          )
          .map((value) => ({
            id: value.command,
            title: typeof value.title === "string" ? value.title : undefined,
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      : [];

    const properties = parsed.contributes?.configuration?.properties;
    const vscodeSettings =
      properties && typeof properties === "object"
        ? Object.entries(properties as Record<string, unknown>)
            .map(([key, value]) => ({
              key,
              defaultValue:
                value &&
                typeof value === "object" &&
                "default" in value
                  ? (value as { default?: unknown }).default
                  : undefined,
            }))
            .sort((a, b) => a.key.localeCompare(b.key))
        : [];

    const extensionEntry =
      typeof parsed.main === "string" ? parsed.main : undefined;

    if (
      scripts.length === 0 &&
      vscodeCommands.length === 0 &&
      vscodeSettings.length === 0 &&
      !extensionEntry
    ) {
      return undefined;
    }

    return {
      packageManager: "npm",
      scripts,
      vscodeCommands,
      vscodeSettings,
      extensionEntry,
    };
  } catch {
    return undefined;
  }
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
      primaryFilePaths: [],
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

  const filesByPath = new Map(files.map((file) => [file.path, file]));

  return Array.from(rows.values())
    .map((module) => {
      const filePaths = uniqueSorted(module.filePaths);
      const primaryFilePaths = filePaths
        .map((path) => filesByPath.get(path))
        .filter((file): file is LocalDocumentationFile => Boolean(file))
        .sort(
          (a, b) =>
            Number(b.entryPoint) - Number(a.entryPoint) ||
            b.usedBy.length - a.usedBy.length ||
            b.exportedSymbols.length - a.exportedSymbols.length ||
            b.uses.length - a.uses.length ||
            a.path.localeCompare(b.path),
        )
        .slice(0, 2)
        .map((file) => file.path);

      return {
        ...module,
        filePaths,
        primaryFilePaths,
        languages: uniqueSorted(module.languages),
      };
    })
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
