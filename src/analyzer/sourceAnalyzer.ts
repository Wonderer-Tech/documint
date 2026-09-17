import * as path from "path";
import type { WorkspaceFile } from "../types";
import {
  SourceAnalyzer as BaseSourceAnalyzer,
  type ProjectAnalysis,
} from "./sourceAnalyzerBase";

export type {
  FileAnalysis,
  FileDependencyIndex,
  ProjectAnalysis,
  SourceImport,
  SourceSymbol,
  SourceSymbolKind,
  TodoComment,
} from "./sourceAnalyzerBase";

const MODERN_MODULE_EXTENSIONS = ["mts", "cts", "mjs", "cjs"] as const;
const JAVASCRIPT_LIKE_LANGUAGES = new Set([
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
]);

/**
 * Public analyzer facade.
 *
 * The base analyzer keeps the existing cross-language behavior intact. This
 * facade only fills the modern Node/TypeScript module-resolution gap introduced
 * when the scanner added .mts/.cts/.mjs/.cjs support: extensionless relative
 * imports and directory index imports now resolve to those files as internal
 * project dependencies too.
 */
export class SourceAnalyzer extends BaseSourceAnalyzer {
  analyzeProject(files: WorkspaceFile[]): ProjectAnalysis {
    const project = super.analyzeProject(files);
    const pathIndex = new Set(project.files.map((file) => normalize(file.path)));
    const existingEdges = new Set(
      project.internalDependencies.map((edge) =>
        dependencyKey(edge.from, edge.to, edge.source),
      ),
    );

    for (const file of project.files) {
      if (!JAVASCRIPT_LIKE_LANGUAGES.has(file.language)) {
        continue;
      }

      const fromPath = normalize(file.path);
      const baseDir = path.posix.dirname(fromPath);

      for (const sourceImport of file.imports) {
        if (sourceImport.resolvedPath || !sourceImport.source.startsWith(".")) {
          continue;
        }

        const basePath = normalize(path.posix.join(baseDir, sourceImport.source));
        const candidates = [
          ...MODERN_MODULE_EXTENSIONS.map((extension) =>
            `${basePath}.${extension}`,
          ),
          ...MODERN_MODULE_EXTENSIONS.map((extension) =>
            `${basePath}/index.${extension}`,
          ),
        ];
        const resolvedPath = candidates.find((candidate) =>
          pathIndex.has(candidate),
        );
        if (!resolvedPath) {
          continue;
        }

        sourceImport.resolvedPath = resolvedPath;
        const key = dependencyKey(file.path, resolvedPath, sourceImport.source);
        if (!existingEdges.has(key)) {
          project.internalDependencies.push({
            from: file.path,
            to: resolvedPath,
            source: sourceImport.source,
          });
          existingEdges.add(key);
        }
      }
    }

    return project;
  }
}

function dependencyKey(from: string, to: string, source: string): string {
  return `${normalize(from)}\u0000${normalize(to)}\u0000${source}`;
}

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}
