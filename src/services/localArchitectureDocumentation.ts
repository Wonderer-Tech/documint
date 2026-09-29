import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import {
  buildLocalDocumentationModel,
  type LocalDocumentationModel,
} from "./localDocumentationModel";
import {
  renderLocalArchitectureVisualSectionsFromModel,
} from "./localVisualBlueprint";

export interface LocalArchitectureDocumentationInput {
  projectName: string;
  files: WorkspaceFile[];
  project: ProjectAnalysis;
}

export interface LocalArchitectureRenderOptions {
  surface?: "markdown" | "html";
}

export function renderLocalArchitectureDocumentation(
  input: LocalArchitectureDocumentationInput,
  options: LocalArchitectureRenderOptions = {},
): string {
  return renderLocalArchitectureDocumentationFromModel(
    buildLocalDocumentationModel(input.projectName, input.files, input.project),
    options,
  );
}

export function renderLocalArchitectureDocumentationFromModel(
  model: LocalDocumentationModel,
  options: LocalArchitectureRenderOptions = {},
): string {
  const surface = options.surface ?? "html";
  const sections = [
    "## Architecture & Dependencies",
    "",
    `> Deterministic architecture view for ${inlineCode(model.projectName)}. Relationships below come only from resolved source imports; no AI interpretation is used.`,
    "",
    "### Module Relationships",
    "",
    renderModuleRelationshipTable(model),
  ];

  if (surface === "markdown") {
    if (model.modules.length <= 15) {
      sections.push(
        "",
        "### Module Architecture",
        "",
        "```mermaid",
        renderModuleMermaid(model),
        "```",
      );
    }
    return sections.join("\n");
  }

  sections.push(
    "",
    renderLocalArchitectureVisualSectionsFromModel(model),
    "",
    "### Module Architecture — Mermaid",
    "",
    "```mermaid",
    renderModuleMermaid(model),
    "```",
    "",
    "### File Dependency Graph — Mermaid",
    "",
    "```mermaid",
    renderFileMermaid(model),
    "```",
    "",
    "### Module Architecture — D2",
    "",
    "```d2",
    renderModuleD2(model),
    "```",
    "",
    "### Internal Dependency Edges",
    "",
    renderDependencyTable(model),
  );

  return sections.join("\n");
}

function renderModuleRelationshipTable(model: LocalDocumentationModel): string {
  if (model.moduleEdges.length === 0) {
    return "No cross-module dependency links detected.";
  }

  return [
    "| From Module | To Module | Resolved Links |",
    "| --- | --- | ---: |",
    ...model.moduleEdges.map(
      (edge) =>
        `| ${inlineCode(edge.from)} | ${inlineCode(edge.to)} | ${edge.count} |`,
    ),
  ].join("\n");
}

function renderModuleMermaid(model: LocalDocumentationModel): string {
  const ids = new Map(
    model.modules.map((module, index) => [module.name, `m${index}`]),
  );
  const lines = ["flowchart LR"];

  for (const module of model.modules) {
    lines.push(
      `  ${ids.get(module.name)}["${escapeMermaidLabel(module.name)} (${module.fileCount} file${module.fileCount === 1 ? "" : "s"})"]`,
    );
  }
  for (const edge of model.moduleEdges) {
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

function renderFileMermaid(model: LocalDocumentationModel): string {
  const ids = new Map(
    model.files.map((file, index) => [file.path, `f${index}`]),
  );
  const lines = ["flowchart LR"];

  for (const file of model.files) {
    lines.push(
      `  ${ids.get(file.path)}["${escapeMermaidLabel(file.path)}"]`,
    );
  }
  for (const edge of model.internalDependencies) {
    const fromId = ids.get(edge.from);
    const toId = ids.get(edge.to);
    if (fromId && toId) {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  return lines.join("\n");
}

function renderModuleD2(model: LocalDocumentationModel): string {
  const ids = new Map(
    model.modules.map((module, index) => [module.name, `m${index}`]),
  );
  const lines: string[] = [];

  for (const module of model.modules) {
    lines.push(
      `${ids.get(module.name)}: "${escapeD2Label(module.name)} (${module.fileCount} file${module.fileCount === 1 ? "" : "s"})"`,
    );
  }
  for (const edge of model.moduleEdges) {
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

function renderDependencyTable(model: LocalDocumentationModel): string {
  if (model.internalDependencies.length === 0) {
    return "No internal dependency edges detected.";
  }

  return [
    "| From File | To File | Import Source |",
    "| --- | --- | --- |",
    ...model.internalDependencies.map(
      (edge) =>
        `| ${inlineCode(edge.from)} | ${inlineCode(edge.to)} | ${inlineCode(edge.source)} |`,
    ),
  ].join("\n");
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
