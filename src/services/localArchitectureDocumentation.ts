import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import {
  buildLocalDocumentationModel,
  type LocalDocumentationModel,
} from "./localDocumentationModel";

export interface LocalArchitectureDocumentationInput {
  projectName: string;
  files: WorkspaceFile[];
  project: ProjectAnalysis;
}

export interface LocalArchitectureRenderOptions {
  surface?: "markdown" | "summary";
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
  const surface = options.surface ?? "markdown";
  const sections = [
    "## Architecture & Dependencies",
    "",
    `> Deterministic architecture view for ${inlineCode(model.projectName)}. Relationships below come only from resolved source imports; no AI interpretation is used.`,
    "",
    "### Module Relationships",
    "",
    renderModuleRelationshipTable(model),
  ];

  if (surface === "summary") {
    return sections.join("\n");
  }

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
