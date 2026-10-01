import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import {
  buildLocalDocumentationModel,
  type LocalDocumentationModel,
} from "./localDocumentationModel";
import { escapeMarkdownPlainText, escapeMarkdownTableText } from "./markdownEscaping";
import { relativeSourceHref } from "./sourceLink";

export interface LocalProjectDocumentationInput {
  projectName: string;
  files: WorkspaceFile[];
  project: ProjectAnalysis;
}

export interface LocalProjectDocumentationRenderOptions {
  surface?: "markdown" | "html";
}

/**
 * Compatibility wrapper for callers that still hold scanner/analyzer inputs.
 * Production Local document assembly builds the canonical model once and calls
 * renderLocalProjectDocumentationFromModel directly.
 */
export function renderLocalProjectDocumentation(
  input: LocalProjectDocumentationInput,
): string {
  return renderLocalProjectDocumentationFromModel(
    buildLocalDocumentationModel(input.projectName, input.files, input.project),
  );
}

export function renderLocalProjectDocumentationFromModel(
  model: LocalDocumentationModel,
  options: LocalProjectDocumentationRenderOptions = {},
): string {
  const surface = options.surface ?? "markdown";
  if (surface === "html") {
    return "";
  }

  const sections: string[] = [
    `# ${escapeHeading(model.projectName)} — Local Documentation`,
    "",
    "> Generated entirely from static source analysis. No AI inference, model, API key, or external provider is used.",
  ];

  if (surface === "markdown") {
    sections.push(
      "",
      "## Where is what",
      "",
      renderWhereIsWhat(model),
    );
  }

  if (surface === "markdown" && model.gettingStarted) {
    sections.push(
      "",
      "## How to run",
      "",
      renderGettingStarted(model),
    );
  }

  if (
    surface === "markdown" &&
    model.referencedEnvironmentVariables.length > 0
  ) {
    sections.push(
      "",
      "## Referenced environment variables",
      "",
      "These names are referenced in source code; static analysis does not claim they are required in every run.",
      "",
      ...model.referencedEnvironmentVariables.map(
        (name) => `- ${inlineCode(name)}`,
      ),
    );
  }

  if (surface === "markdown") {
    sections.push(
      "",
      "## Suggested reading path",
      "",
      renderSuggestedReadingPath(model),
    );
  }

  if (surface === "markdown") {
    sections.push(
      "",
      "## Project Facts",
      "",
      `- **Files:** ${model.files.length}`,
      `- **Lines:** ${model.totalLines}`,
      `- **Files with trusted descriptions:** ${model.files.filter((file) => Boolean(file.description)).length}`,
      `- **Undocumented files:** ${model.files.filter((file) => !file.description).length}`,
      `- **Detected symbols:** ${model.totalSymbols}`,
      `- **Exported symbols:** ${model.totalExports}`,
      `- **Internal dependency links:** ${model.internalDependencies.length}`,
      `- **External dependencies:** ${model.externalDependencies.length}`,
      `- **TODO/FIXME/HACK comments:** ${model.totalTodos}`,
      "",
      "## Language Summary",
      "",
      renderLanguageSummary(model),
      "",
      "## Module Summary",
      "",
      renderModuleSummary(model),
      "",
      "## Entry Points",
      "",
      renderPathList(model.entryPoints, "No entry points detected."),
      "",
      "## External Dependencies",
      "",
      renderCodeList(
        model.externalDependencies,
        "No external dependencies detected from source imports.",
      ),
    );

    sections.push(
      "",
      "## Core files",
      "",
      renderCoreFiles(model),
    );
  }

  const undocumented = renderUndocumentedFiles(model);
  if (surface === "markdown" && undocumented) {
    sections.push("", "## Undocumented files", "", undocumented);
  }

  if (surface === "markdown") {
    sections.push(
      "",
      "## Source Tree",
      "",
      "```text",
      renderSourceTree(model.projectName, model.files.map((file) => file.path)),
      "```",
    );
  }

  return sections.join("\n");
}

function renderWhereIsWhat(model: LocalDocumentationModel): string {
  if (model.modules.length === 0) {
    return "No structural modules detected.";
  }

  return [
    "| Module | What's inside | Files | Lines | Start with |",
    "| --- | --- | ---: | ---: | --- |",
    ...model.modules.map((module) => {
      const primary = module.primaryFilePaths.length
        ? module.primaryFilePaths.map(markdownDocumentationFileLink).join(", ")
        : "—";
      const description = module.description
        ? escapeMarkdownTableText(module.description.text)
        : "—";
      return `| ${inlineCode(module.name)} | ${description} | ${module.fileCount} | ${module.lineCount} | ${primary} |`;
    }),
  ].join("\n");
}

function renderGettingStarted(model: LocalDocumentationModel): string {
  const facts = model.gettingStarted;
  if (!facts) {
    return "No supported project manifest facts detected.";
  }

  const sections: string[] = [];

  if (facts.packageJsonPath) {
    sections.push(
      `Detected package metadata from ${inlineCode(facts.packageJsonPath)}.`,
    );
  }

  if (facts.packageManager) {
    sections.push(
      sections.length ? "" : "",
      `**Package manager:** ${inlineCode(facts.packageManager)}`,
    );
  }

  if (facts.extensionEntry) {
    sections.push(
      "",
      `**Extension entry:** ${inlineCode(facts.extensionEntry)}`,
    );
  }

  if (facts.scripts.length > 0) {
    sections.push(
      "",
      "### Package scripts",
      "",
      "| Script | Run | Command |",
      "| --- | --- | --- |",
      ...facts.scripts.map(
        (script) =>
          `| ${inlineCode(script.name)} | ${inlineCode(script.run)} | ${inlineCode(script.command)} |`,
      ),
    );
  }

  if (facts.makefile) {
    sections.push(
      "",
      "### Makefile",
      "",
      `Detected from ${inlineCode(facts.makefile.path)}.`,
    );

    if (facts.makefile.targets.length > 0) {
      sections.push(
        "",
        "| Target | Run |",
        "| --- | --- |",
        ...facts.makefile.targets.map(
          (target) =>
            `| ${inlineCode(target.name)} | ${inlineCode(`make ${target.name}`)} |`,
        ),
      );
    } else {
      sections.push("", "No concrete Make targets detected.");
    }
  }

  if (facts.dockerfile) {
    const docker = facts.dockerfile;
    sections.push(
      "",
      "### Dockerfile facts",
      "",
      `Detected from ${inlineCode(docker.path)}.`,
    );

    if (docker.baseImages.length > 0) {
      sections.push(
        `- **Base images:** ${docker.baseImages.map(inlineCode).join(", ")}`,
      );
    }
    if (docker.stages.length > 0) {
      sections.push(
        `- **Stages:** ${docker.stages.map(inlineCode).join(", ")}`,
      );
    }
    if (docker.exposedPorts.length > 0) {
      sections.push(
        `- **Exposed ports:** ${docker.exposedPorts.map(inlineCode).join(", ")}`,
      );
    }
    if (docker.entrypoint) {
      sections.push(
        `- **ENTRYPOINT:** ${inlineCode(docker.entrypoint)}`,
      );
    }
    if (docker.command) {
      sections.push(
        `- **CMD:** ${inlineCode(docker.command)}`,
      );
    }
  }

  if (facts.vscodeCommands.length > 0) {
    sections.push(
      "",
      "### VS Code commands",
      "",
      "| Command ID | Title |",
      "| --- | --- |",
      ...facts.vscodeCommands.map(
        (command) =>
          `| ${inlineCode(command.id)} | ${escapeMarkdownTableText(command.title)} |`,
      ),
    );
  }

  if (facts.vscodeSettings.length > 0) {
    sections.push(
      "",
      "### VS Code settings",
      "",
      "| Setting | Default |",
      "| --- | --- |",
      ...facts.vscodeSettings.map(
        (setting) =>
          `| ${inlineCode(setting.key)} | ${formatDefaultValue(setting.defaultValue)} |`,
      ),
    );
  }

  return sections.length > 0
    ? sections.join("\n")
    : "No supported project manifest facts detected.";
}

function renderSuggestedReadingPath(
  model: LocalDocumentationModel,
): string {
  if (model.suggestedReadingPath.length === 0) {
    return "No source-backed reading path could be derived.";
  }

  return model.suggestedReadingPath
    .map(
      (item, index) =>
        `${index + 1}. ${markdownDocumentationFileLink(item.path)} — ${escapeMarkdownTableText(item.reason)}`,
    )
    .join("\n");
}

function renderLanguageSummary(model: LocalDocumentationModel): string {
  const rows = new Map<
    string,
    { files: number; lines: number; symbols: number; exports: number }
  >();

  for (const file of model.files) {
    const current = rows.get(file.language) ?? {
      files: 0,
      lines: 0,
      symbols: 0,
      exports: 0,
    };
    current.files++;
    current.lines += file.lineCount;
    current.symbols += file.symbols.length;
    current.exports += file.exportedSymbols.length;
    rows.set(file.language, current);
  }

  return [
    "| Name | Files | Lines | Symbols | Exports |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...Array.from(rows.entries())
      .sort((a, b) => b[1].files - a[1].files || a[0].localeCompare(b[0]))
      .map(
        ([name, row]) =>
          `| ${inlineCode(name)} | ${row.files} | ${row.lines} | ${row.symbols} | ${row.exports} |`,
      ),
  ].join("\n");
}

function renderModuleSummary(model: LocalDocumentationModel): string {
  return [
    "| Name | Files | Lines | Exports | Uses | Used by |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...model.modules.map(
      (module) =>
        `| ${inlineCode(module.name)} | ${module.fileCount} | ${module.lineCount} | ${module.exportedSymbolCount} | ${module.dependencyCount} | ${module.dependentCount} |`,
    ),
  ].join("\n");
}

function renderCoreFiles(model: LocalDocumentationModel): string {
  const ranked = [...model.files]
    .sort(
      (a, b) =>
        Number(b.entryPoint) - Number(a.entryPoint) ||
        b.usedBy.length + b.uses.length - (a.usedBy.length + a.uses.length) ||
        b.exportedSymbols.length - a.exportedSymbols.length ||
        a.path.localeCompare(b.path),
    )
    .slice(0, 20);

  return [
    "Files are ordered by detected entry-point status, internal dependency links, and exported-symbol count.",
    "",
    "| File | Module | Language | Lines | Exports | Uses | Used by | Entry Point |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
    ...ranked.map(
      (file) =>
        `| ${markdownDocumentationFileLink(file.path)} | ${inlineCode(file.module)} | ${inlineCode(file.language)} | ${file.lineCount} | ${file.exportedSymbols.length} | ${file.uses.length} | ${file.usedBy.length} | ${file.entryPoint ? "Yes" : "No"} |`,
    ),
  ].join("\n");
}

function renderUndocumentedFiles(
  model: LocalDocumentationModel,
): string | undefined {
  const undocumented = model.files.filter((file) => !file.description);
  if (undocumented.length === 0) {
    return undefined;
  }

  return [
    `${undocumented.length} file${undocumented.length === 1 ? "" : "s"} have no trusted module-level description yet.`,
    "",
    ...undocumented.map((file) => `- ${markdownDocumentationFileLink(file.path)}`),
  ].join("\n");
}

function formatDefaultValue(value: unknown): string {
  if (value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return inlineCode(value);
  }

  try {
    return inlineCode(JSON.stringify(value));
  } catch {
    return inlineCode(String(value));
  }
}

interface TreeNode {
  files: Set<string>;
  children: Map<string, TreeNode>;
}

function renderSourceTree(projectName: string, paths: string[]): string {
  const root: TreeNode = { files: new Set(), children: new Map() };
  for (const filePath of paths) {
    const parts = normalizePath(filePath).split("/").filter(Boolean);
    if (parts.length === 0) {
      continue;
    }
    let node = root;
    for (const part of parts.slice(0, -1)) {
      let child = node.children.get(part);
      if (!child) {
        child = { files: new Set(), children: new Map() };
        node.children.set(part, child);
      }
      node = child;
    }
    node.files.add(parts[parts.length - 1]);
  }

  const lines = [`${cleanTreeLabel(projectName) || "project"}/`];
  appendTreeChildren(root, "", lines);
  return lines.join("\n");
}

function appendTreeChildren(
  node: TreeNode,
  prefix: string,
  lines: string[],
): void {
  const entries = [
    ...Array.from(node.children.keys()).map((name) => ({ name, folder: true })),
    ...Array.from(node.files).map((name) => ({ name, folder: false })),
  ].sort((a, b) => {
    if (a.folder !== b.folder) {
      return a.folder ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  entries.forEach((entry, index) => {
    const last = index === entries.length - 1;
    lines.push(
      `${prefix}${last ? "└── " : "├── "}${cleanTreeLabel(entry.name)}${entry.folder ? "/" : ""}`,
    );
    if (entry.folder) {
      appendTreeChildren(
        node.children.get(entry.name)!,
        `${prefix}${last ? "    " : "│   "}`,
        lines,
      );
    }
  });
}

function renderPathList(paths: string[], emptyMessage: string): string {
  return paths.length > 0
    ? paths
        .map((value) => `- ${markdownDocumentationFileLink(value)}`)
        .join("\n")
    : emptyMessage;
}

function renderCodeList(values: string[], emptyMessage: string): string {
  return values.length > 0
    ? values.map((value) => `- ${inlineCode(value)}`).join("\n")
    : emptyMessage;
}

function normalizePath(value: string): string {
  return String(value).replace(/\\/g, "/");
}

function cleanText(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function cleanTreeLabel(value: string): string {
  return cleanText(value)
    .replace(/[\u2500-\u257f]/g, "-")
    .replace(/`/g, "'");
}

function escapeHeading(value: string): string {
  return escapeMarkdownPlainText(value);
}

function markdownDocumentationFileLink(filePath: string): string {
  return `[${inlineCode(filePath)}](${relativeSourceHref(filePath)})`;
}

function inlineCode(value: string): string {
  return `\`${cleanText(value).replace(/`/g, "'")}\``;
}

