import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import { renderLocalArchitectureVisualSections } from "./localVisualBlueprint";

export interface LocalArchitectureDocumentationInput {
  projectName: string;
  files: WorkspaceFile[];
  project: ProjectAnalysis;
}

interface ModuleNode {
  name: string;
  fileCount: number;
}

interface ModuleEdge {
  from: string;
  to: string;
  count: number;
}

/**
 * Renders deterministic architecture/dependency sections from resolved project
 * dependency edges. It intentionally assigns no semantic roles to modules.
 */
export function renderLocalArchitectureDocumentation(
  input: LocalArchitectureDocumentationInput,
): string {
  const projectName = cleanText(input.projectName) || "Project";
  const files = [...input.files].sort((a, b) => a.path.localeCompare(b.path));
  const modules = buildModules(files);
  const moduleEdges = buildModuleEdges(input.project);
  const dependencyEdges = [...input.project.internalDependencies].sort(
    (a, b) =>
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to) ||
      a.source.localeCompare(b.source),
  );

  return [
    "## Architecture & Dependencies",
    "",
    `> Deterministic architecture view for ${inlineCode(projectName)}. Relationships below come only from resolved source imports; no AI interpretation is used.`,
    "",
    "### Module Relationships",
    "",
    renderModuleRelationshipTable(moduleEdges),
    "",
    renderLocalArchitectureVisualSections(input),
    "",
    "### Module Architecture — Mermaid",
    "",
    "```mermaid",
    renderModuleMermaid(modules, moduleEdges),
    "```",
    "",
    "### File Dependency Graph — Mermaid",
    "",
    "```mermaid",
    renderFileMermaid(files, dependencyEdges),
    "```",
    "",
    "### Module Architecture — D2",
    "",
    "```d2",
    renderModuleD2(modules, moduleEdges),
    "```",
    "",
    "### Internal Dependency Edges",
    "",
    renderDependencyTable(dependencyEdges),
  ].join("\n");
}

function buildModules(files: WorkspaceFile[]): ModuleNode[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const module = moduleName(file.path);
    counts.set(module, (counts.get(module) ?? 0) + 1);
  }
  return Array.from(counts, ([name, fileCount]) => ({ name, fileCount })).sort(
    (a, b) => a.name.localeCompare(b.name),
  );
}

function buildModuleEdges(project: ProjectAnalysis): ModuleEdge[] {
  const counts = new Map<string, ModuleEdge>();
  for (const edge of project.internalDependencies) {
    const from = moduleName(edge.from);
    const to = moduleName(edge.to);
    if (from === to) {
      continue;
    }
    const key = `${from}\u0000${to}`;
    const current = counts.get(key) ?? { from, to, count: 0 };
    current.count++;
    counts.set(key, current);
  }
  return Array.from(counts.values()).sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
  );
}

function renderModuleRelationshipTable(edges: ModuleEdge[]): string {
  if (edges.length === 0) {
    return "No cross-module dependency links detected.";
  }

  return [
    "| From Module | To Module | Resolved Links |",
    "| --- | --- | ---: |",
    ...edges.map(
      (edge) =>
        `| ${inlineCode(edge.from)} | ${inlineCode(edge.to)} | ${edge.count} |`,
    ),
  ].join("\n");
}

function renderModuleMermaid(modules: ModuleNode[], edges: ModuleEdge[]): string {
  const ids = new Map(modules.map((module, index) => [module.name, `m${index}`]));
  const lines = ["flowchart LR"];

  for (const module of modules) {
    lines.push(
      `  ${ids.get(module.name)}["${escapeMermaidLabel(module.name)} (${module.fileCount} file${module.fileCount === 1 ? "" : "s"})"]`,
    );
  }
  for (const edge of edges) {
    const fromId = ids.get(edge.from);
    const toId = ids.get(edge.to);
    if (fromId && toId) {
      lines.push(
        `  ${fromId} -->|"${edge.count} link${edge.count === 1 ? "" : "s"}"| ${toId}`,
      );
    }
  }

  return lines.join("\n");
}

function renderFileMermaid(
  files: WorkspaceFile[],
  edges: ProjectAnalysis["internalDependencies"],
): string {
  const ids = new Map(files.map((file, index) => [file.path, `f${index}`]));
  const lines = ["flowchart LR"];

  for (const file of files) {
    lines.push(`  ${ids.get(file.path)}["${escapeMermaidLabel(file.path)}"]`);
  }
  for (const edge of edges) {
    const fromId = ids.get(edge.from);
    const toId = ids.get(edge.to);
    if (fromId && toId) {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  return lines.join("\n");
}

function renderModuleD2(modules: ModuleNode[], edges: ModuleEdge[]): string {
  const ids = new Map(modules.map((module, index) => [module.name, `m${index}`]));
  const lines: string[] = [];

  for (const module of modules) {
    lines.push(
      `${ids.get(module.name)}: "${escapeD2Label(module.name)} (${module.fileCount} file${module.fileCount === 1 ? "" : "s"})"`,
    );
  }
  for (const edge of edges) {
    const fromId = ids.get(edge.from);
    const toId = ids.get(edge.to);
    if (fromId && toId) {
      lines.push(
        `${fromId} -> ${toId}: "${edge.count} link${edge.count === 1 ? "" : "s"}"`,
      );
    }
  }

  return lines.join("\n");
}

function renderDependencyTable(
  edges: ProjectAnalysis["internalDependencies"],
): string {
  if (edges.length === 0) {
    return "No internal dependency edges detected.";
  }

  return [
    "| From File | To File | Import Source |",
    "| --- | --- | --- |",
    ...edges.map(
      (edge) =>
        `| ${inlineCode(edge.from)} | ${inlineCode(edge.to)} | ${inlineCode(edge.source)} |`,
    ),
  ].join("\n");
}

function moduleName(filePath: string): string {
  const parts = normalizePath(filePath).split("/").filter(Boolean);
  return parts.length > 1 ? parts[0] : "(root)";
}

function normalizePath(value: string): string {
  return String(value).replace(/\\/g, "/");
}

function cleanText(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function inlineCode(value: string): string {
  return `\`${cleanText(value).replace(/`/g, "'")}\``;
}

function escapeMermaidLabel(value: string): string {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeD2Label(value: string): string {
  return cleanText(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
