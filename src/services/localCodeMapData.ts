import type { LocalDocumentationModel } from "./localDocumentationModel";

export interface LocalCodeMapExport {
  name: string;
  kind: string;
  line: number;
}

export interface LocalCodeMapFile {
  path: string;
  module: string;
  language: string;
  lines: number;
  description?: string;
  descriptionSource?: string;
  exports: LocalCodeMapExport[];
  environmentVariables: string[];
  uses: string[];
  usedBy: string[];
  entryPoint: boolean;
}

export interface LocalCodeMapModule {
  name: string;
  description?: string;
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

export interface LocalCodeMapData {
  projectName: string;
  files: LocalCodeMapFile[];
  modules: LocalCodeMapModule[];
  edges: LocalCodeMapEdge[];
  readingPath: LocalCodeMapReadingItem[];
  gettingStarted?: {
    packageManager?: "npm" | "pnpm" | "yarn" | "bun";
    extensionEntry?: string;
    scripts: LocalCodeMapRunScript[];
  };
}

export function buildLocalCodeMapData(
  model: LocalDocumentationModel,
): LocalCodeMapData {
  return {
    projectName: model.projectName,
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
      environmentVariables: [...file.referencedEnvironmentVariables],
      uses: [...file.uses],
      usedBy: [...file.usedBy],
      entryPoint: file.entryPoint,
    })),
    modules: model.modules.map((module) => ({
      name: module.name,
      description: module.description?.text,
      files: module.fileCount,
      lines: module.lineCount,
    })),
    edges: model.moduleEdges.map((edge) => ({ ...edge })),
    readingPath: model.suggestedReadingPath.map((item) => ({
      path: item.path,
      reason: item.reason,
    })),
    gettingStarted: model.gettingStarted
      ? {
          packageManager: model.gettingStarted.packageManager,
          extensionEntry: model.gettingStarted.extensionEntry,
          scripts: model.gettingStarted.scripts.map((script) => ({
            name: script.name,
            run: script.run,
            command: script.command,
          })),
        }
      : undefined,
  };
}
