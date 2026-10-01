import type { LocalDocumentationModel } from "./localDocumentationModel";

export interface LocalCodeMapExport {
  name: string;
  kind: string;
  line: number;
}

export interface LocalCodeMapTodo {
  line: number;
  text: string;
}

export interface LocalCodeMapFile {
  path: string;
  module: string;
  language: string;
  lines: number;
  description?: string;
  descriptionSource?: string;
  exports: LocalCodeMapExport[];
  internalSymbols: LocalCodeMapExport[];
  todos: LocalCodeMapTodo[];
  environmentVariables: string[];
  uses: string[];
  usedBy: string[];
  entryPoint: boolean;
}

export interface LocalCodeMapModule {
  name: string;
  description?: string;
  descriptionSource?: string;
  primaryFilePaths: string[];
  files: number;
  lines: number;
}

export interface LocalCodeMapEdge {
  from: string;
  to: string;
  count: number;
}

export interface LocalCodeMapReadingItem {
  path: string;
  reason: string;
}

export interface LocalCodeMapRunScript {
  name: string;
  run: string;
  command: string;
}

export interface LocalCodeMapVsCodeCommand {
  id: string;
  title: string;
}

export interface LocalCodeMapVsCodeSetting {
  key: string;
  defaultValue?: unknown;
}

export interface LocalCodeMapMakeTarget {
  name: string;
}

export interface LocalCodeMapDockerfile {
  path: string;
  baseImages: string[];
  stages: string[];
  exposedPorts: string[];
  entrypoint?: string;
  command?: string;
}

export interface LocalCodeMapDataEntity {
  name: string;
  kind: string;
  fields: string[];
}

export interface LocalCodeMapDataSource {
  path: string;
  format: string;
  entities: LocalCodeMapDataEntity[];
}

export interface LocalCodeMapDataModel {
  entityCount: number;
  sources: LocalCodeMapDataSource[];
}


export interface LocalCodeMapLanguageSummary {
  name: string;
  files: number;
  lines: number;
}

export interface LocalCodeMapProjectSummary {
  files: number;
  lines: number;
  describedFiles: number;
  undocumentedFiles: number;
  symbols: number;
  exports: number;
  internalDependencies: number;
  externalDependencies: number;
  todos: number;
  languages: LocalCodeMapLanguageSummary[];
  entryPoints: string[];
  externalDependencyNames: string[];
}

export interface LocalCodeMapData {
  projectName: string;
  summary: LocalCodeMapProjectSummary;
  files: LocalCodeMapFile[];
  modules: LocalCodeMapModule[];
  edges: LocalCodeMapEdge[];
  readingPath: LocalCodeMapReadingItem[];
  referencedEnvironmentVariables: string[];
  dataModel?: LocalCodeMapDataModel;
  gettingStarted?: {
    packageJsonPath?: string;
    packageManager?: "npm" | "pnpm" | "yarn" | "bun";
    extensionEntry?: string;
    scripts: LocalCodeMapRunScript[];
    vscodeCommands: LocalCodeMapVsCodeCommand[];
    vscodeSettings: LocalCodeMapVsCodeSetting[];
    makefile?: {
      path: string;
      targets: LocalCodeMapMakeTarget[];
    };
    dockerfile?: LocalCodeMapDockerfile;
  };
}

export function buildLocalCodeMapData(
  model: LocalDocumentationModel,
): LocalCodeMapData {
  const languageRows = new Map<
    string,
    { files: number; lines: number }
  >();
  for (const file of model.files) {
    const row = languageRows.get(file.language) ?? { files: 0, lines: 0 };
    row.files++;
    row.lines += file.lineCount;
    languageRows.set(file.language, row);
  }

  return {
    projectName: model.projectName,
    summary: {
      files: model.files.length,
      lines: model.totalLines,
      describedFiles: model.files.filter(
        (file) => Boolean(file.description),
      ).length,
      undocumentedFiles: model.files.filter(
        (file) => !file.description,
      ).length,
      symbols: model.totalSymbols,
      exports: model.totalExports,
      internalDependencies: model.internalDependencies.length,
      externalDependencies: model.externalDependencies.length,
      todos: model.totalTodos,
      languages: Array.from(languageRows.entries())
        .map(([name, row]) => ({
          name,
          files: row.files,
          lines: row.lines,
        }))
        .sort(
          (a, b) =>
            b.files - a.files ||
            b.lines - a.lines ||
            a.name.localeCompare(b.name),
        ),
      entryPoints: [...model.entryPoints],
      externalDependencyNames: [...model.externalDependencies],
    },
    files: model.files.map((file) => ({
      path: file.path,
      module: file.module,
      language: file.language,
      lines: file.lineCount,
      description: file.description?.text,
      descriptionSource: file.description?.source,
      exports: file.exportedSymbols.map((symbol) => ({
        name: symbol.name,
        kind: symbol.kind,
        line: symbol.line,
      })),
      internalSymbols: file.internalSymbols.map((symbol) => ({
        name: symbol.name,
        kind: symbol.kind,
        line: symbol.line,
      })),
      todos: file.todos.map((todo) => ({
        line: todo.line,
        text: todo.text,
      })),
      environmentVariables: [...file.referencedEnvironmentVariables],
      uses: [...file.uses],
      usedBy: [...file.usedBy],
      entryPoint: file.entryPoint,
    })),
    modules: model.modules.map((module) => ({
      name: module.name,
      description: module.description?.text,
      descriptionSource: module.description?.source,
      primaryFilePaths: [...module.primaryFilePaths],
      files: module.fileCount,
      lines: module.lineCount,
    })),
    edges: model.moduleEdges.map((edge) => ({ ...edge })),
    readingPath: model.suggestedReadingPath.map((item) => ({
      path: item.path,
      reason: item.reason,
    })),
    referencedEnvironmentVariables: [
      ...model.referencedEnvironmentVariables,
    ],
    dataModel: model.dataModel
      ? {
          entityCount: model.dataModel.entityCount,
          sources: model.dataModel.sources.map((source) => ({
            path: source.path,
            format: source.format,
            entities: source.entities.map((entity) => ({
              name: entity.name,
              kind: entity.kind,
              fields: [...entity.fields],
            })),
          })),
        }
      : undefined,
    gettingStarted: model.gettingStarted
      ? {
          packageJsonPath: model.gettingStarted.packageJsonPath,
          packageManager: model.gettingStarted.packageManager,
          extensionEntry: model.gettingStarted.extensionEntry,
          scripts: model.gettingStarted.scripts.map((script) => ({
            name: script.name,
            run: script.run,
            command: script.command,
          })),
          vscodeCommands: model.gettingStarted.vscodeCommands.map(
            (command) => ({ ...command }),
          ),
          vscodeSettings: model.gettingStarted.vscodeSettings.map(
            (setting) => ({ ...setting }),
          ),
          makefile: model.gettingStarted.makefile
            ? {
                path: model.gettingStarted.makefile.path,
                targets: model.gettingStarted.makefile.targets.map(
                  (target) => ({ ...target }),
                ),
              }
            : undefined,
          dockerfile: model.gettingStarted.dockerfile
            ? {
                path: model.gettingStarted.dockerfile.path,
                baseImages: [...model.gettingStarted.dockerfile.baseImages],
                stages: [...model.gettingStarted.dockerfile.stages],
                exposedPorts: [
                  ...model.gettingStarted.dockerfile.exposedPorts,
                ],
                entrypoint: model.gettingStarted.dockerfile.entrypoint,
                command: model.gettingStarted.dockerfile.command,
              }
            : undefined,
        }
      : undefined,
  };
}
