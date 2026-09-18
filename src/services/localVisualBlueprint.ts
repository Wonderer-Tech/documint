import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";

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

/**
 * Builds the JSON contract consumed by the generated HTML visual enhancers.
 * Every field comes from scanner/analyzer evidence. Local mode deliberately
 * assigns the neutral role "Module" instead of guessing semantic architecture.
 */
export function buildLocalArchitectureVisualBlueprint(
  input: LocalArchitectureVisualInput,
): LocalArchitectureVisualBlueprint {
  const files = [...input.files].sort((a, b) => a.path.localeCompare(b.path));
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const analysisByPath = new Map(
    input.project.files.map((file) => [file.path, file]),
  );
  const entryPoints = new Set(input.project.entryPoints);
  const dependencyDegree = new Map<string, number>();

  for (const edge of input.project.internalDependencies) {
    dependencyDegree.set(edge.from, (dependencyDegree.get(edge.from) ?? 0) + 1);
    dependencyDegree.set(edge.to, (dependencyDegree.get(edge.to) ?? 0) + 1);
  }

  const toFileNode = (file: WorkspaceFile): LocalArchitectureFileNode => {
    const analysis = analysisByPath.get(file.path);
    const symbolCount = analysis?.symbols.length ?? 0;
    const exportedSymbolCount =
      analysis?.symbols.filter((symbol) => symbol.exported).length ?? 0;
    const dependencyCount = dependencyDegree.get(file.path) ?? 0;
    const lineCount = countLines(file.content);
    const score =
      (entryPoints.has(file.path) ? 1_000_000 : 0) +
      dependencyCount * 10_000 +
      exportedSymbolCount * 100 +
      symbolCount;

    return {
      path: cleanVisualText(file.path),
      language: cleanVisualText(file.language),
      lineCount,
      symbolCount,
      exportedSymbolCount,
      dependencyCount,
      score,
    };
  };

  const modules = new Map<
    string,
    LocalArchitectureModuleNode & { allFiles: LocalArchitectureFileNode[] }
  >();

  for (const file of files) {
    const name = structuralModuleName(file.path);
    const id = safeVisualId(name);
    const fileNode = toFileNode(file);
    const current = modules.get(id);

    if (current) {
      current.fileCount++;
      current.lineCount += fileNode.lineCount;
      current.languages = Array.from(
        new Set([...current.languages, fileNode.language]),
      ).sort((a, b) => a.localeCompare(b));
      current.allFiles.push(fileNode);
    } else {
      modules.set(id, {
        id,
        name,
        role: "Module",
        fileCount: 1,
        lineCount: fileNode.lineCount,
        languages: [fileNode.language],
        importantFiles: [],
        allFiles: [fileNode],
      });
    }
  }

  const moduleList = Array.from(modules.values()).map((module) => {
    module.importantFiles = [...module.allFiles]
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
      .slice(0, 5);
    const { allFiles: _allFiles, ...publicModule } = module;
    return publicModule;
  });

  const moduleEdgeCounts = new Map<string, LocalArchitectureModuleEdge>();
  for (const edge of input.project.internalDependencies) {
    if (!fileByPath.has(edge.from) || !fileByPath.has(edge.to)) continue;

    const from = safeVisualId(structuralModuleName(edge.from));
    const to = safeVisualId(structuralModuleName(edge.to));
    if (from === to) continue;

    const key = `${from}\0${to}`;
    const current = moduleEdgeCounts.get(key) ?? { from, to, count: 0 };
    current.count++;
    moduleEdgeCounts.set(key, current);
  }

  const rankedFiles = files
    .map(toFileNode)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const graphFiles = rankedFiles.slice(0, 36);
  const graphPaths = new Set(graphFiles.map((file) => file.path));

  return {
    source: "local",
    projectName: cleanVisualText(input.projectName) || "Project",
    modules: moduleList
      .sort((a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name))
      .slice(0, 14),
    moduleEdges: Array.from(moduleEdgeCounts.values())
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.from.localeCompare(b.from) ||
          a.to.localeCompare(b.to),
      )
      .slice(0, 24),
    importantFiles: rankedFiles.slice(0, 12),
    entryPoints: input.project.entryPoints
      .map(cleanVisualText)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 10),
    externalDependencies: input.project.externalDependencies
      .map(cleanVisualText)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 18),
    dependencyGraph: {
      nodes: graphFiles.map((file) => ({
        id: safeVisualId(file.path),
        label: fileNameFromPath(file.path),
        path: file.path,
        module: structuralModuleName(file.path),
        language: file.language,
        symbolCount: file.symbolCount,
        dependencyCount: file.dependencyCount,
        lineCount: file.lineCount,
      })),
      edges: input.project.internalDependencies
        .filter((edge) => graphPaths.has(edge.from) && graphPaths.has(edge.to))
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
  const blueprint = buildLocalArchitectureVisualBlueprint(input);

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

function structuralModuleName(filePath: string): string {
  const parts = normalizePath(filePath).split("/").filter(Boolean);
  if (parts.length <= 1) return "(root)";

  const first = parts[0];
  const structuralContainers = new Set([
    "apps",
    "packages",
    "src",
    "app",
    "lib",
    "server",
    "client",
  ]);

  if (parts.length > 2 && structuralContainers.has(first.toLowerCase())) {
    return `${first}/${parts[1]}`;
  }

  return first;
}

function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}

function normalizePath(value: string): string {
  return String(value).replace(/\\/g, "/");
}

function cleanVisualText(value: string): string {
  return String(value)
    .replace(/[\r\n\t]/g, " ")
    .replace(/```/g, "'''")
    .trim();
}

function safeVisualId(value: string): string {
  const id = cleanVisualText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return id || "node";
}

function fileNameFromPath(filePath: string): string {
  const parts = normalizePath(filePath).split("/");
  return parts[parts.length - 1] || filePath;
}

function stringifyVisualJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/```/g, "` ` `");
}
