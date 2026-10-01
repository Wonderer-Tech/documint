import type {
  ProjectAnalysis,
  SourceImport,
  SourceSymbol,
  TodoComment,
} from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import { extractLocalDataModelFacts, type LocalDataModelFacts } from "./localDataModelFacts";
import { extractLocalReadmeFacts } from "./localReadmeFacts";
import {
  parseDockerfileFacts,
  parseMakefileTargets,
  type LocalDockerfileFacts,
  type LocalMakeTarget,
} from "./localBuildFacts";
import {
  normalizeProjectPath,
  structuralModuleName,
} from "./structuralModule";

export type LocalDescriptionSource =
  | "file-comment"
  | "declaration-comment"
  | "module-docstring"
  | "package-comment"
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
  referencedEnvironmentVariables: string[];
  uses: string[];
  usedBy: string[];
  entryPoint: boolean;
}

export interface LocalDocumentationModule {
  name: string;
  description?: LocalDescription;
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
  packageJsonPath?: string;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  extensionEntry?: string;
  scripts: LocalPackageScript[];
  vscodeCommands: LocalVsCodeCommand[];
  vscodeSettings: LocalVsCodeSetting[];
  makefile?: {
    path: string;
    targets: LocalMakeTarget[];
  };
  dockerfile?: LocalDockerfileFacts & {
    path: string;
  };
}

export interface LocalReadingPathItem {
  path: string;
  reason: string;
  entryPoint: boolean;
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
  referencedEnvironmentVariables: string[];
  suggestedReadingPath: LocalReadingPathItem[];
  dataModel?: LocalDataModelFacts;
}

export interface BuildLocalDocumentationModelOptions {
  readme?: string;
  makefile?: string;
  dockerfile?: string;
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
    const filePath = normalizeProjectPath(file.path);
    const analysis = analysisByPath.get(filePath);
    if (!analysis) {
      throw new Error(`Missing source analysis for ${filePath}`);
    }

    const sourceDescription = analysis.description;
    const readmeDescription = readmeFacts.descriptionsByPath.get(filePath);
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
      path: filePath,
      module: structuralModuleName(filePath),
      language: file.language,
      lineCount: countLines(file.content),
      description,
      imports: analysis.imports.map((sourceImport) => ({ ...sourceImport })),
      symbols: [...analysis.symbols],
      exportedSymbols,
      internalSymbols,
      todos: [...analysis.todos],
      referencedEnvironmentVariables: uniqueSorted(
        analysis.referencedEnvironmentVariables ?? [],
      ),
      uses: uniqueSorted(dependencyIndex.uses.get(filePath) ?? []),
      usedBy: uniqueSorted(dependencyIndex.usedBy.get(filePath) ?? []),
      entryPoint: entryPoints.has(filePath),
    };
  });

  const modules = buildModules(
    fileModels,
    readmeFacts.descriptionsByModule,
  );
  const moduleEdges = buildModuleEdges(project.internalDependencies);
  const gettingStarted = extractGettingStartedFacts(
    sortedFiles,
    options,
  );
  const referencedEnvironmentVariables = uniqueSorted(
    fileModels.flatMap((file) => file.referencedEnvironmentVariables),
  );
  const suggestedReadingPath = buildSuggestedReadingPath(fileModels);
  const dataModel = extractLocalDataModelFacts(sortedFiles);

  return {
    projectName: cleanText(projectName) || "Project",
    files: fileModels,
    modules,
    moduleEdges,
    entryPoints: uniqueSorted(
      project.entryPoints.map((value) => normalizeProjectPath(value)),
    ),
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
    referencedEnvironmentVariables,
    suggestedReadingPath,
    dataModel,
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
  descriptionsByModule: Map<
    string,
    { text: string; source: "readme" }
  >,
): LocalDocumentationModule[] {
  const rows = new Map<string, LocalDocumentationModule>();

  for (const file of files) {
    const current: LocalDocumentationModule = rows.get(file.module) ?? {
      name: file.module,
      description: descriptionsByModule.get(file.module),
      filePaths: [] as string[],
      primaryFilePaths: [] as string[],
      fileCount: 0,
      lineCount: 0,
      languages: [] as string[],
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
        .map((filePath) => filesByPath.get(filePath))
        .filter((file): file is LocalDocumentationFile => Boolean(file))
        .sort(comparePrimaryFiles)
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

function comparePrimaryFiles(
  a: LocalDocumentationFile,
  b: LocalDocumentationFile,
): number {
  return (
    Number(b.entryPoint) - Number(a.entryPoint) ||
    b.usedBy.length - a.usedBy.length ||
    b.exportedSymbols.length - a.exportedSymbols.length ||
    b.uses.length - a.uses.length ||
    a.path.localeCompare(b.path)
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

function extractGettingStartedFacts(
  files: WorkspaceFile[],
  supplemental: BuildLocalDocumentationModelOptions,
): LocalGettingStartedFacts | undefined {
  const packageFile = files.find(
    (file) => normalizeProjectPath(file.path) === "package.json",
  );

  let manifest: any;
  if (packageFile) {
    try {
      manifest = JSON.parse(packageFile.content);
    } catch {
      manifest = undefined;
    }
  }

  const packageManager = manifest
    ? detectPackageManager(manifest.packageManager)
    : undefined;

  const scripts: LocalPackageScript[] = manifest
    ? Object.entries(
        manifest?.scripts && typeof manifest.scripts === "object"
          ? manifest.scripts
          : {},
      )
        .filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string",
        )
        .map(([name, command]) => ({
          name,
          command,
          run: `${packageManager ?? "npm"} run ${name}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const vscodeCommands: LocalVsCodeCommand[] = Array.isArray(
    manifest?.contributes?.commands,
  )
    ? manifest.contributes.commands
        .filter(
          (command: any) =>
            command &&
            typeof command.command === "string" &&
            typeof command.title === "string",
        )
        .map((command: any) => ({
          id: command.command,
          title: command.title,
        }))
        .sort((a: LocalVsCodeCommand, b: LocalVsCodeCommand) =>
          a.id.localeCompare(b.id),
        )
    : [];

  const configurationEntries = Array.isArray(
    manifest?.contributes?.configuration,
  )
    ? manifest.contributes.configuration
    : manifest?.contributes?.configuration
      ? [manifest.contributes.configuration]
      : [];

  const vscodeSettings: LocalVsCodeSetting[] = configurationEntries
    .flatMap((configuration: any) => {
      const properties =
        configuration?.properties &&
        typeof configuration.properties === "object"
          ? configuration.properties
          : {};
      return Object.entries(properties)
        .filter(([, value]) => {
          return !(
            value &&
            typeof value === "object" &&
            "deprecationMessage" in (value as object)
          );
        })
        .map(([key, value]) => ({
          key,
          defaultValue:
            value &&
            typeof value === "object" &&
            "default" in (value as object)
              ? (value as any).default
              : undefined,
        }));
    })
    .sort((a: LocalVsCodeSetting, b: LocalVsCodeSetting) =>
      a.key.localeCompare(b.key),
    );

  const extensionEntry =
    typeof manifest?.main === "string"
      ? manifest.main
      : undefined;

  const makeTargets = parseMakefileTargets(
    supplemental.makefile,
  );
  const makefile =
    supplemental.makefile !== undefined
      ? {
          path: "Makefile",
          targets: makeTargets,
        }
      : undefined;

  const dockerFacts = parseDockerfileFacts(
    supplemental.dockerfile,
  );
  const dockerfile = dockerFacts
    ? {
        path: "Dockerfile",
        ...dockerFacts,
      }
    : undefined;

  if (
    !packageFile &&
    !makefile &&
    !dockerfile
  ) {
    return undefined;
  }

  if (
    scripts.length === 0 &&
    vscodeCommands.length === 0 &&
    vscodeSettings.length === 0 &&
    !extensionEntry &&
    !makefile &&
    !dockerfile
  ) {
    return undefined;
  }

  return {
    packageJsonPath: packageFile
      ? "package.json"
      : undefined,
    packageManager,
    extensionEntry,
    scripts,
    vscodeCommands,
    vscodeSettings,
    makefile,
    dockerfile,
  };
}

function detectPackageManager(
  value: unknown,
): "npm" | "pnpm" | "yarn" | "bun" {
  if (typeof value !== "string") {
    return "npm";
  }

  const match = value.trim().toLowerCase().match(/^(npm|pnpm|yarn|bun)(?:@|$)/);
  return (match?.[1] as "npm" | "pnpm" | "yarn" | "bun" | undefined) ?? "npm";
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
      .map((filePath) => byPath.get(filePath))
      .filter((value): value is LocalDocumentationFile => Boolean(value))
      .filter((value) => !seen.has(value.path))
      .sort(comparePrimaryFiles);

    for (const dependency of next) {
      queue.push({ path: dependency.path, parent: file.path });
    }
  }

  if (selected.length < 8) {
    const fallbacks = files
      .filter((file) => !seen.has(file.path))
      .sort(comparePrimaryFiles);

    for (const file of fallbacks) {
      if (selected.length >= 8) {
        break;
      }
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

function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function cleanText(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}
