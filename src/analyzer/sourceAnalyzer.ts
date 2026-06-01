import * as path from "path";
import { WorkspaceFile } from "../types";

export type SourceSymbolKind =
  | "class"
  | "function"
  | "method"
  | "interface"
  | "type"
  | "enum"
  | "constant"
  | "variable"
  | "struct"
  | "trait";

export interface SourceSymbol {
  name: string;
  kind: SourceSymbolKind;
  line: number;
  exported: boolean;
  signature: string;
}

export interface SourceImport {
  source: string;
  line: number;
  symbols: string[];
  resolvedPath?: string;
}

export interface TodoComment {
  line: number;
  text: string;
}

export interface FileAnalysis {
  path: string;
  language: string;
  imports: SourceImport[];
  symbols: SourceSymbol[];
  todos: TodoComment[];
}

export interface ProjectAnalysis {
  files: FileAnalysis[];
  entryPoints: string[];
  externalDependencies: string[];
  internalDependencies: Array<{
    from: string;
    to: string;
    source: string;
  }>;
}

export interface FileDependencyIndex {
  dependenciesByPath: Map<string, ProjectAnalysis["internalDependencies"]>;
  dependentsByPath: Map<string, ProjectAnalysis["internalDependencies"]>;
}

export class SourceAnalyzer {
  analyzeProject(files: WorkspaceFile[]): ProjectAnalysis {
    const analyses = files.map((file) => this.analyzeFile(file));
    const pathIndex = new Set(analyses.map((file) => this.normalize(file.path)));
    const internalDependencies: ProjectAnalysis["internalDependencies"] = [];
    const externalDependencies = new Set<string>();

    for (const file of analyses) {
      for (const sourceImport of file.imports) {
        const resolvedPath = this.resolveInternalImport(
          file.path,
          sourceImport.source,
          pathIndex,
        );

        if (resolvedPath) {
          sourceImport.resolvedPath = resolvedPath;
          internalDependencies.push({
            from: file.path,
            to: resolvedPath,
            source: sourceImport.source,
          });
        } else if (!sourceImport.source.startsWith(".")) {
          externalDependencies.add(this.packageName(sourceImport.source));
        }
      }
    }

    return {
      files: analyses,
      entryPoints: this.findEntryPoints(analyses),
      externalDependencies: Array.from(externalDependencies).sort(),
      internalDependencies,
    };
  }

  analyzeFile(file: WorkspaceFile): FileAnalysis {
    const lines = file.content.split(/\r?\n/);
    const imports: SourceImport[] = [];
    const symbols: SourceSymbol[] = [];
    const todos: TodoComment[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      this.extractImports(line, lineNumber, file.language, imports);
      this.extractSymbols(line, lineNumber, file.language, symbols);
      this.extractTodos(line, lineNumber, todos);
    });

    return {
      path: file.path,
      language: file.language,
      imports: this.uniqueImports(imports),
      symbols: this.uniqueSymbols(symbols),
      todos,
    };
  }

  formatProjectContext(project: ProjectAnalysis): string {
    const fileSummaries = project.files.slice(0, 80).map((file) => {
      const exports = file.symbols
        .filter((symbol) => symbol.exported)
        .slice(0, 12)
        .map((symbol) => `${symbol.kind} ${symbol.name}`)
        .join(", ");
      const imports = file.imports
        .slice(0, 8)
        .map((sourceImport) =>
          sourceImport.resolvedPath
            ? `${sourceImport.source} -> ${sourceImport.resolvedPath}`
            : sourceImport.source,
        )
        .join(", ");

      return [
        `- ${file.path} (${file.language})`,
        exports ? `  exports: ${exports}` : "  exports: none detected",
        imports ? `  imports: ${imports}` : "  imports: none detected",
      ].join("\n");
    });

    const internalEdges = project.internalDependencies
      .slice(0, 80)
      .map((edge) => `- ${edge.from} -> ${edge.to}`)
      .join("\n");

    return [
      "Verified project map generated before AI documentation:",
      "",
      `Entry points: ${project.entryPoints.join(", ") || "none detected"}`,
      `External dependencies: ${
        project.externalDependencies.join(", ") || "none detected"
      }`,
      "",
      "Files and detected symbols:",
      fileSummaries.join("\n"),
      "",
      "Internal dependency links:",
      internalEdges || "none detected",
    ].join("\n");
  }

  buildDependencyIndex(project: ProjectAnalysis): FileDependencyIndex {
    const dependenciesByPath = new Map<
      string,
      ProjectAnalysis["internalDependencies"]
    >();
    const dependentsByPath = new Map<
      string,
      ProjectAnalysis["internalDependencies"]
    >();

    for (const edge of project.internalDependencies) {
      const dependencies = dependenciesByPath.get(edge.from) ?? [];
      dependencies.push(edge);
      dependenciesByPath.set(edge.from, dependencies);

      const dependents = dependentsByPath.get(edge.to) ?? [];
      dependents.push(edge);
      dependentsByPath.set(edge.to, dependents);
    }

    return { dependenciesByPath, dependentsByPath };
  }

  formatFileContext(
    file: FileAnalysis,
    project: ProjectAnalysis,
    dependencyIndex = this.buildDependencyIndex(project),
  ): string {
    const exports = file.symbols
      .filter((symbol) => symbol.exported)
      .map((symbol) => this.formatSymbol(symbol));
    const symbols = file.symbols.map((symbol) => this.formatSymbol(symbol));
    const imports = file.imports.map((sourceImport) => {
      const resolved = sourceImport.resolvedPath
        ? ` -> ${sourceImport.resolvedPath}`
        : "";
      const importedSymbols = sourceImport.symbols.length
        ? ` (${sourceImport.symbols.join(", ")})`
        : "";
      return `- line ${sourceImport.line}: ${sourceImport.source}${resolved}${importedSymbols}`;
    });
    const dependents = (dependencyIndex.dependentsByPath.get(file.path) ?? [])
      .map((edge) => `- ${edge.from}`);
    const dependencies = (dependencyIndex.dependenciesByPath.get(file.path) ?? [])
      .map((edge) => `- ${edge.to}`);
    const todos = file.todos.map((todo) => `- line ${todo.line}: ${todo.text}`);

    return [
      "Verified file analysis from source code:",
      `File: ${file.path}`,
      `Language: ${file.language}`,
      "",
      "Detected exports:",
      exports.join("\n") || "none detected",
      "",
      "Detected symbols:",
      symbols.join("\n") || "none detected",
      "",
      "Detected imports:",
      imports.join("\n") || "none detected",
      "",
      "Internal dependencies:",
      dependencies.join("\n") || "none detected",
      "",
      "Known dependents:",
      dependents.join("\n") || "none detected",
      "",
      "TODO/FIXME/HACK comments:",
      todos.join("\n") || "none detected",
    ].join("\n");
  }

  private extractImports(
    line: string,
    lineNumber: number,
    language: string,
    imports: SourceImport[],
  ): void {
    const trimmed = line.trim();

    if (this.isJavaScriptLike(language)) {
      const fromMatch = trimmed.match(
        /^import\s+(?:type\s+)?(.+?)\s+from\s+["']([^"']+)["']/,
      );
      if (fromMatch) {
        imports.push({
          line: lineNumber,
          source: fromMatch[2],
          symbols: this.extractImportedSymbols(fromMatch[1]),
        });
        return;
      }

      const sideEffectMatch = trimmed.match(/^import\s+["']([^"']+)["']/);
      if (sideEffectMatch) {
        imports.push({
          line: lineNumber,
          source: sideEffectMatch[1],
          symbols: [],
        });
        return;
      }

      const requireMatch = trimmed.match(/require\(["']([^"']+)["']\)/);
      if (requireMatch) {
        imports.push({
          line: lineNumber,
          source: requireMatch[1],
          symbols: [],
        });
      }
      return;
    }

    if (language === "python") {
      const fromMatch = trimmed.match(/^from\s+([\w.]+)\s+import\s+(.+)$/);
      if (fromMatch) {
        imports.push({
          line: lineNumber,
          source: fromMatch[1],
          symbols: fromMatch[2].split(",").map((value) => value.trim()),
        });
        return;
      }

      const importMatch = trimmed.match(/^import\s+([\w.,\s]+)/);
      if (importMatch) {
        for (const source of importMatch[1].split(",")) {
          imports.push({
            line: lineNumber,
            source: source.trim().split(/\s+as\s+/)[0],
            symbols: [],
          });
        }
      }
      return;
    }

    if (language === "go") {
      const match = trimmed.match(/^["']([^"']+)["']|^import\s+["']([^"']+)["']/);
      const source = match?.[1] ?? match?.[2];
      if (source) {
        imports.push({ line: lineNumber, source, symbols: [] });
      }
      return;
    }

    if (language === "java" || language === "kotlin") {
      const match = trimmed.match(/^import\s+([\w.*]+)/);
      if (match) {
        imports.push({ line: lineNumber, source: match[1], symbols: [] });
      }
    }
  }

  private extractSymbols(
    line: string,
    lineNumber: number,
    language: string,
    symbols: SourceSymbol[],
  ): void {
    const trimmed = line.trim();

    if (this.isJavaScriptLike(language)) {
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/,
        "function",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/,
        "class",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(export\s+)?interface\s+([A-Za-z_$][\w$]*)/,
        "interface",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(export\s+)?type\s+([A-Za-z_$][\w$]*)/,
        "type",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(export\s+)?enum\s+([A-Za-z_$][\w$]*)/,
        "enum",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/,
        "constant",
        symbols,
      );
      return;
    }

    if (language === "python") {
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^class\s+([A-Za-z_]\w*)/,
        "class",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/,
        "function",
        symbols,
      );
      return;
    }

    if (language === "go") {
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(([^)]*)\)/,
        "function",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^type\s+([A-Za-z_]\w*)\s+struct/,
        "struct",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^type\s+([A-Za-z_]\w*)\s+interface/,
        "interface",
        symbols,
      );
      return;
    }

    if (language === "rust") {
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(pub\s+)?fn\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/,
        "function",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(pub\s+)?struct\s+([A-Za-z_]\w*)/,
        "struct",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(pub\s+)?enum\s+([A-Za-z_]\w*)/,
        "enum",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(pub\s+)?trait\s+([A-Za-z_]\w*)/,
        "trait",
        symbols,
      );
      return;
    }

    this.addMatchSymbol(
      trimmed,
      lineNumber,
      /^(?:public|private|protected|internal|static|\s)*\s*(?:class|interface|enum)\s+([A-Za-z_]\w*)/,
      "class",
      symbols,
    );
    this.addMatchSymbol(
      trimmed,
      lineNumber,
      /^(?:public|private|protected|internal|static|final|\s)+[\w<>\[\],.?]+\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/,
      "method",
      symbols,
    );
  }

  private extractTodos(
    line: string,
    lineNumber: number,
    todos: TodoComment[],
  ): void {
    const match = line.match(/\b(TODO|FIXME|HACK)\b[:\s-]*(.+)$/i);
    if (match) {
      todos.push({
        line: lineNumber,
        text: `${match[1].toUpperCase()}: ${match[2].trim()}`,
      });
    }
  }

  private addMatchSymbol(
    line: string,
    lineNumber: number,
    pattern: RegExp,
    kind: SourceSymbolKind,
    symbols: SourceSymbol[],
  ): void {
    const match = line.match(pattern);
    if (!match) {
      return;
    }

    const exported = /^\s*(export|pub)\b/.test(line);
    const name = match
      .slice(1)
      .find((value) => /^[A-Za-z_$][\w$]*$/.test(value ?? ""));
    if (!name) {
      return;
    }

    symbols.push({
      name,
      kind,
      line: lineNumber,
      exported,
      signature: line.substring(0, 180),
    });
  }

  private extractImportedSymbols(importClause: string): string[] {
    return importClause
      .replace(/[{}]/g, "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.split(/\s+as\s+/)[0].trim())
      .filter((value) => value !== "*" && value !== "type");
  }

  private uniqueImports(imports: SourceImport[]): SourceImport[] {
    const seen = new Set<string>();
    return imports.filter((sourceImport) => {
      const key = `${sourceImport.source}:${sourceImport.line}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private uniqueSymbols(symbols: SourceSymbol[]): SourceSymbol[] {
    const seen = new Set<string>();
    return symbols.filter((symbol) => {
      const key = `${symbol.name}:${symbol.kind}:${symbol.line}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private findEntryPoints(files: FileAnalysis[]): string[] {
    const entryPatterns = [
      /(^|\/)(index|main|app|server|extension)\.[^.]+$/,
      /(^|\/)src\/(index|main|app|server|extension)\.[^.]+$/,
    ];
    return files
      .filter((file) => entryPatterns.some((pattern) => pattern.test(file.path)))
      .map((file) => file.path)
      .sort();
  }

  private resolveInternalImport(
    fromPath: string,
    importSource: string,
    pathIndex: Set<string>,
  ): string | undefined {
    if (!importSource.startsWith(".")) {
      return undefined;
    }

    const baseDir = path.posix.dirname(this.normalize(fromPath));
    const basePath = this.normalize(path.posix.join(baseDir, importSource));
    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      `${basePath}.jsx`,
      `${basePath}.py`,
      `${basePath}.go`,
      `${basePath}.rs`,
      `${basePath}/index.ts`,
      `${basePath}/index.tsx`,
      `${basePath}/index.js`,
      `${basePath}/index.jsx`,
    ];

    return candidates.find((candidate) => pathIndex.has(candidate));
  }

  private packageName(importSource: string): string {
    if (importSource.startsWith("@")) {
      return importSource.split("/").slice(0, 2).join("/");
    }
    return importSource.split("/")[0];
  }

  private isJavaScriptLike(language: string): boolean {
    return [
      "typescript",
      "typescriptreact",
      "javascript",
      "javascriptreact",
    ].includes(language);
  }

  private formatSymbol(symbol: SourceSymbol): string {
    const exported = symbol.exported ? " exported" : "";
    return `- line ${symbol.line}:${exported} ${symbol.kind} ${symbol.name} (${symbol.signature})`;
  }

  private normalize(filePath: string): string {
    return filePath.replace(/\\/g, "/");
  }
}
