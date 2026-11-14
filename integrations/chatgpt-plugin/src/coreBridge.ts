/**
 * Headless adapter: calls DocuMint's existing deterministic source analyzer
 * and canonical Local documentation model without importing any VS Code runtime.
 * This is deliberately NOT a second parser or an AI-generated substitute.
 */
import { SourceAnalyzer } from "../../../src/analyzer/sourceAnalyzer";
import { getLanguageFromPath } from "../../../src/scanner/scannerPolicy";
import { buildLocalDocumentationModel } from "../../../src/services/localDocumentationModel";
import { renderLocalProjectDocumentationFromModel } from "../../../src/services/localProjectDocumentation";
import { renderLocalArchitectureDocumentationFromModel } from "../../../src/services/localArchitectureDocumentation";
import { renderLocalFileDocumentationFromModel } from "../../../src/services/localFileDocumentation";
import type { WorkspaceFile } from "../../../src/types";

export interface PluginSourceFile {
  path: string;
  content: string;
}

export interface PluginProjectMetadata {
  readme?: string;
  makefile?: string;
  dockerfile?: string;
}

function trim(value: string | undefined, limit = 320): string | undefined {
  const clean = value?.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
  return clean ? clean.slice(0, limit) : undefined;
}

export function analyzePluginFiles(
  projectName: string,
  inputs: PluginSourceFile[],
  extras: PluginProjectMetadata = {},
) {
  const files: WorkspaceFile[] = inputs.map(({ path, content }) => {
    const language = getLanguageFromPath(path);
    if (!language) {
      throw new Error(`Unsupported source type: ${path}`);
    }
    return { path, content, language };
  });

  if (!files.length) {
    throw new Error("No supported source files were retrieved");
  }

  const analysis = new SourceAnalyzer().analyzeProject(files);
  const model = buildLocalDocumentationModel(projectName, files, analysis, extras);

  const summary = {
    projectName: model.projectName,
    analyzedFiles: model.files.length,
    totalLines: model.totalLines,
    languages: model.languages,
    totalSymbols: model.totalSymbols,
    totalExports: model.totalExports,
    totalTodos: model.totalTodos,
    entryPoints: model.entryPoints,
    externalDependencies: model.externalDependencies.slice(0, 100),
    referencedEnvironmentVariableNames:
      model.referencedEnvironmentVariables.slice(0, 100),
    modules: model.modules.map((item) => ({
      name: item.name,
      description: trim(item.description?.text),
      fileCount: item.fileCount,
      lineCount: item.lineCount,
      exportedSymbolCount: item.exportedSymbolCount,
      primaryFiles: item.primaryFilePaths,
    })),
    moduleEdges: model.moduleEdges.slice(0, 300),
    suggestedReadingPath: model.suggestedReadingPath.slice(0, 20),
    dataModel: model.dataModel,
    security: model.security,
    failureFacts: model.failureFacts,
  };

  const fileDetails = model.files.map((file) => ({
    path: file.path,
    language: file.language,
    module: file.module,
    lineCount: file.lineCount,
    entryPoint: file.entryPoint,
    description: trim(file.description?.text, 500),
    descriptionSource: file.description?.source,
    imports: file.imports.slice(0, 100).map((item) => ({
      source: item.source,
      line: item.line,
      resolvedPath: item.resolvedPath,
    })),
    symbols: file.symbols.slice(0, 160).map((symbol) => ({
      name: symbol.name,
      kind: symbol.kind,
      exported: symbol.exported,
      line: symbol.line,
      signature: trim(symbol.signature, 220),
    })),
    uses: file.uses,
    usedBy: file.usedBy,
    todoCount: file.todos.length,
    referencedEnvironmentVariableNames: file.referencedEnvironmentVariables,
  }));

  // The exact same Local markdown renderer used by the VS Code extension.
  const markdown = [
    renderLocalProjectDocumentationFromModel(model, { surface: "markdown" }),
    renderLocalArchitectureDocumentationFromModel(model),
    ...model.files.map((file) => renderLocalFileDocumentationFromModel(file)),
  ]
    .map((section) => section.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");

  return { summary, fileDetails, markdown };
}
