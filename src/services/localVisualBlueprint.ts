import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import {
  buildLocalDocumentationModel,
  type LocalDocumentationFile,
  type LocalDocumentationModel,
} from "./localDocumentationModel";

export interface LocalArchitectureFileNode {
  path: string;
  language: string;
  lineCount: number;
  symbolCount: number;
  exportedSymbolCount: number;
  dependencyCount: number;
  score: number;
}

export interface LocalArchitectureModuleNode {
  id: string;
  name: string;
  role: "Module";
  fileCount: number;
  lineCount: number;
  languages: string[];
  importantFiles: LocalArchitectureFileNode[];
}

export interface LocalArchitectureModuleEdge {
  from: string;
  to: string;
  count: number;
}

export interface LocalArchitectureGraphNode {
  id: string;
  label: string;
  path: string;
  module: string;
  language: string;
  symbolCount: number;
  dependencyCount: number;
  lineCount: number;
}

export interface LocalArchitectureGraphEdge {
  from: string;
  to: string;
  label: string;
}

export interface LocalArchitectureVisualBlueprint {
  source: "local";
  projectName: string;
  modules: LocalArchitectureModuleNode[];
  moduleEdges: LocalArchitectureModuleEdge[];
  importantFiles: LocalArchitectureFileNode[];
  entryPoints: string[];
  externalDependencies: string[];
  dependencyGraph: {
    nodes: LocalArchitectureGraphNode[];
    edges: LocalArchitectureGraphEdge[];
  };
}

export interface LocalArchitectureVisualInput {
  projectName: string;
  files: WorkspaceFile[];
  project: ProjectAnalysis;
}

export function buildLocalArchitectureVisualBlueprint(
  input: LocalArchitectureVisualInput,
): LocalArchitectureVisualBlueprint {
  return buildLocalArchitectureVisualBlueprintFromModel(
    buildLocalDocumentationModel(input.projectName, input.files, input.project),
  );
}

export function buildLocalArchitectureVisualBlueprintFromModel(
  model: LocalDocumentationModel,
): LocalArchitectureVisualBlueprint {
  const fileByPath = new Map(model.files.map((file) => [file.path, file]));
  const rankedFiles = model.files
    .map(toFileNode)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const modules: LocalArchitectureModuleNode[] = model.modules
    .map((module) => {
      const importantFiles = module.filePaths
        .map((path) => fileByPath.get(path))
        .filter((file): file is LocalDocumentationFile => Boolean(file))
        .map(toFileNode)
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
        .slice(0, 5);

      return {
        id: safeVisualId(module.name),
        name: module.name,
        role: "Module" as const,
        fileCount: module.fileCount,
        lineCount: module.lineCount,
        languages: [...module.languages],
        importantFiles,
      };
    })
    .sort((a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name))
    .slice(0, 14);

  const moduleIds = new Map(modules.map((module) => [module.name, module.id]));
  const moduleEdges = model.moduleEdges
    .filter(
      (edge) => moduleIds.has(edge.from) && moduleIds.has(edge.to),
    )
    .map((edge) => ({
      from: moduleIds.get(edge.from)!,
      to: moduleIds.get(edge.to)!,
      count: edge.count,
    }))
    .slice(0, 24);

  const graphFiles = rankedFiles.slice(0, 36);
  const graphPaths = new Set(graphFiles.map((file) => file.path));

  return {
    source: "local",
    projectName: cleanVisualText(model.projectName) || "Project",
    modules,
    moduleEdges,
    importantFiles: rankedFiles.slice(0, 12),
    entryPoints: model.entryPoints.slice(0, 10),
    externalDependencies: model.externalDependencies.slice(0, 18),
    dependencyGraph: {
      nodes: graphFiles.map((file) => {
        const source = fileByPath.get(file.path)!;
        return {
          id: safeVisualId(file.path),
          label: fileNameFromPath(file.path),
          path: file.path,
          module: source.module,
          language: file.language,
          symbolCount: file.symbolCount,
          dependencyCount: file.dependencyCount,
          lineCount: file.lineCount,
        };
      }),
      edges: model.internalDependencies
        .filter(
          (edge) => graphPaths.has(edge.from) && graphPaths.has(edge.to),
        )
        .slice(0, 80)
        .map((edge) => ({
          from: safeVisualId(edge.from),
          to: safeVisualId(edge.to),
          label: cleanVisualText(edge.source),
        })),
    },
  };
}

export function renderLocalArchitectureVisualSections(
  input: LocalArchitectureVisualInput,
): string {
  return renderLocalArchitectureVisualSectionsFromModel(
    buildLocalDocumentationModel(input.projectName, input.files, input.project),
  );
}

export function renderLocalArchitectureVisualSectionsFromModel(
  model: LocalDocumentationModel,
): string {
  const blueprint = buildLocalArchitectureVisualBlueprintFromModel(model);

  return [
    "### Local Visual Blueprint: Architecture Map",
    "",
    "The HTML version turns this source-derived Local payload into the architecture dashboard, module scale chart, module map, and interactive module details. No AI interpretation is used.",
    "",
    "```architecture-blueprint",
    stringifyVisualJson(blueprint),
    "```",
    "",
    "### Whiteboard Architecture Sketch",
    "",
    "The HTML version renders this same Local architecture evidence as a whiteboard sketch with SVG and Excalidraw JSON export.",
    "",
    "```excalidraw-blueprint",
    stringifyVisualJson(blueprint),
    "```",
    "",
    "### Interactive Dependency Graph",
    "",
    "The HTML version renders the highest-connected source files as a searchable, zoomable dependency graph.",
    "",
    "```dependency-graph",
    stringifyVisualJson({
      source: "local",
      projectName: blueprint.projectName,
      nodes: blueprint.dependencyGraph.nodes,
      edges: blueprint.dependencyGraph.edges,
    }),
    "```",
  ].join("\n");
}

function toFileNode(file: LocalDocumentationFile): LocalArchitectureFileNode {
  const dependencyCount = file.uses.length + file.usedBy.length;
  const symbolCount = file.symbols.length;
  const exportedSymbolCount = file.exportedSymbols.length;
  const score =
    (file.entryPoint ? 1_000_000 : 0) +
    dependencyCount * 10_000 +
    exportedSymbolCount * 100 +
    symbolCount;

  return {
    path: cleanVisualText(file.path),
    language: cleanVisualText(file.language),
    lineCount: file.lineCount,
    symbolCount,
    exportedSymbolCount,
    dependencyCount,
    score,
  };
}

function safeVisualId(value: string): string {
  const id = cleanVisualText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return id || "node";
}

function fileNameFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
}

function cleanVisualText(value: string): string {
  return String(value)
    .replace(/[\r\n\t]/g, " ")
    .replace(/```/g, "'''")
    .trim();
}

function stringifyVisualJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/```/g, "` ` `");
}
