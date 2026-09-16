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

const JAVASCRIPT_CONTROL_KEYWORDS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "with",
]);

const INTERNAL_IMPORT_EXTENSIONS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "go",
  "rs",
  "c",
  "cc",
  "cpp",
  "cxx",
  "h",
  "hh",
  "hpp",
  "hxx",
  "cs",
  "java",
  "kt",
  "php",
  "rb",
  "swift",
  "scala",
  "sh",
  "yaml",
  "yml",
  "json",
  "xml",
  "html",
  "css",
  "scss",
  "sql",
];

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
    let inGoImportBlock = false;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (file.language === "go") {
        const trimmed = line.trim();
        if (/^import\s*\(\s*$/.test(trimmed)) {
          inGoImportBlock = true;
        } else if (inGoImportBlock && trimmed === ")") {
          inGoImportBlock = false;
        } else if (inGoImportBlock) {
          this.extractGoBlockImport(trimmed, lineNumber, imports);
        } else {
          this.extractImports(line, lineNumber, file.language, imports);
        }
      } else {
        this.extractImports(line, lineNumber, file.language, imports);
      }

      this.extractSymbols(line, lineNumber, file.language, symbols);
      this.extractTodos(line, lineNumber, file.language, todos);
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
      "Verified project map generated before documentation generation:",
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
    const dependents = (dependencyIndex.dependentsByPath.get(file.path) ?? []).map(
      (edge) => `- ${edge.from}`,
    );
    const dependencies = (
      dependencyIndex.dependenciesByPath.get(file.path) ?? []
    ).map((edge) => `- ${edge.to}`);
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
      const namedReExportMatch = trimmed.match(
        /^export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/,
      );
      if (namedReExportMatch) {
        imports.push({
          line: lineNumber,
          source: namedReExportMatch[2],
          symbols: this.extractImportedSymbols(namedReExportMatch[1]),
        });
        return;
      }

      const wildcardReExportMatch = trimmed.match(
        /^export\s+\*\s+from\s+["']([^"']+)["']/,
      );
      if (wildcardReExportMatch) {
        imports.push({
          line: lineNumber,
          source: wildcardReExportMatch[1],
          symbols: [],
        });
        return;
      }

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

      for (const dynamicMatch of trimmed.matchAll(
        /\bimport\(\s*["']([^"']+)["']\s*\)/g,
      )) {
        imports.push({
          line: lineNumber,
          source: dynamicMatch[1],
          symbols: [],
        });
      }
      return;
    }

    if (language === "python") {
      const fromMatch = trimmed.match(/^from\s+([\w.]+)\s+import\s+(.+)$/);
      if (fromMatch) {
        const symbols = this.extractPythonImportedSymbols(fromMatch[2]);
        if (/^\.+$/.test(fromMatch[1]) && symbols.length > 0) {
          for (const symbol of symbols) {
            if (symbol === "*") {
              continue;
            }
            imports.push({
              line: lineNumber,
              source: `${fromMatch[1]}${symbol}`,
              symbols: [symbol],
            });
          }
        } else {
          imports.push({
            line: lineNumber,
            source: fromMatch[1],
            symbols,
          });
        }
        return;
      }

      const importMatch = trimmed.match(/^import\s+([\w.,\s]+)/);
      if (importMatch) {
        for (const source of importMatch[1].split(",")) {
          const normalizedSource = source.trim().split(/\s+as\s+/i)[0].trim();
          if (normalizedSource) {
            imports.push({
              line: lineNumber,
              source: normalizedSource,
              symbols: [],
            });
          }
        }
      }
      return;
    }

    if (language === "go") {
      const match = trimmed.match(
        /^import\s+(?:(?:[A-Za-z_.][\w.]*)\s+)?["`]([^"`]+)["`]/,
      );
      if (match) {
        imports.push({ line: lineNumber, source: match[1], symbols: [] });
      }
      return;
    }

    if (language === "rust") {
      const moduleMatch = trimmed.match(
        /^(?:pub(?:\([^)]*\))?\s+)?mod\s+([A-Za-z_]\w*)\s*;/,
      );
      if (moduleMatch) {
        imports.push({
          line: lineNumber,
          source: `./${moduleMatch[1]}`,
          symbols: [moduleMatch[1]],
        });
      }
      return;
    }

    if (language === "c" || language === "cpp") {
      const localIncludeMatch = trimmed.match(/^#\s*include\s*"([^"]+)"/);
      if (localIncludeMatch) {
        const source = localIncludeMatch[1];
        imports.push({
          line: lineNumber,
          source: source.startsWith(".") ? source : `./${source}`,
          symbols: [],
        });
        return;
      }

      const systemIncludeMatch = trimmed.match(/^#\s*include\s*<([^>]+)>/);
      if (systemIncludeMatch) {
        imports.push({
          line: lineNumber,
          source: systemIncludeMatch[1],
          symbols: [],
        });
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
      const arrowFunctionPattern =
        /^(export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:<[^>]+>\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=>/;
      if (arrowFunctionPattern.test(trimmed)) {
        this.addMatchSymbol(
          trimmed,
          lineNumber,
          arrowFunctionPattern,
          "function",
          symbols,
        );
        return;
      }

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

      const methodPattern =
        /^(?:(?:public|private|protected|static|abstract|override|readonly|async|get|set)\s+)*([A-Za-z_$][\w$]*)\s*(?:<[^>]+>\s*)?\(([^)]*)\)\s*(?::\s*[^={]+)?\s*\{/;
      const methodMatch = trimmed.match(methodPattern);
      if (
        methodMatch &&
        !JAVASCRIPT_CONTROL_KEYWORDS.has(methodMatch[1].toLowerCase())
      ) {
        this.addMatchSymbol(
          trimmed,
          lineNumber,
          methodPattern,
          "method",
          symbols,
        );
      }
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
        /^(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?(?:const\s+)?fn\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/,
        "function",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(?:pub(?:\([^)]*\))?\s+)?struct\s+([A-Za-z_]\w*)/,
        "struct",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(?:pub(?:\([^)]*\))?\s+)?enum\s+([A-Za-z_]\w*)/,
        "enum",
        symbols,
      );
      this.addMatchSymbol(
        trimmed,
        lineNumber,
        /^(?:pub(?:\([^)]*\))?\s+)?trait\s+([A-Za-z_]\w*)/,
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
    language: string,
    todos: TodoComment[],
  ): void {
    const commentText = this.extractCommentText(line, language);
    if (!commentText) {
      return;
    }

    const match = commentText.match(/\b(TODO|FIXME|HACK)\b[:\s-]*(.+)$/i);
    if (match) {
      todos.push({
        line: lineNumber,
        text: `${match[1].toUpperCase()}: ${match[2]
          .replace(/\*\/\s*$/, "")
          .replace(/-->\s*$/, "")
          .trim()}`,
      });
    }
  }

  private extractCommentText(line: string, language: string): string | undefined {
    const trimmed = line.trim();
    if (trimmed.startsWith("*")) {
      return trimmed.slice(1).trim();
    }

    const markers = this.commentMarkersForLanguage(language);
    const match = this.findCommentMarkerOutsideQuotes(line, markers);
    return match
      ? line.slice(match.index + match.marker.length).trim()
      : undefined;
  }

  private commentMarkersForLanguage(language: string): string[] {
    if (
      this.isJavaScriptLike(language) ||
      [
        "java",
        "kotlin",
        "go",
        "rust",
        "c",
        "cpp",
        "csharp",
        "swift",
      ].includes(language)
    ) {
      return ["//", "/*"];
    }
    if (["python", "ruby", "shell", "yaml"].includes(language)) {
      return ["#"];
    }
    if (language === "php") {
      return ["//", "#", "/*"];
    }
    if (language === "sql") {
      return ["--"];
    }
    if (language === "html" || language === "xml") {
      return ["<!--"];
    }
    if (language === "css" || language === "scss") {
      return ["/*"];
    }
    return [];
  }

  private findCommentMarkerOutsideQuotes(
    value: string,
    markers: string[],
  ): { index: number; marker: string } | undefined {
    let quote: "\"" | "'" | "`" | undefined;
    let escaped = false;

    for (let index = 0; index < value.length; index++) {
      const char = value[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quote) {
        if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = undefined;
        }
        continue;
      }
      if (char === "\"" || char === "'" || char === "`") {
        quote = char;
        continue;
      }

      for (const marker of markers) {
        if (!value.startsWith(marker, index)) {
          continue;
        }
        if (
          (marker === "#" || marker === "--") &&
          index > 0 &&
          !/\s/.test(value[index - 1])
        ) {
          continue;
        }
        return { index, marker };
      }
    }

    return undefined;
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
    const symbols = new Set<string>();
    const segments = importClause.replace(/[{}]/g, "").split(",");

    for (const value of segments) {
      const segment = value.trim().replace(/^type\s+/, "");
      if (!segment) {
        continue;
      }

      const namespaceMatch = segment.match(
        /^\*\s+as\s+([A-Za-z_$][\w$]*)$/,
      );
      if (namespaceMatch) {
        symbols.add(namespaceMatch[1]);
        continue;
      }

      const original = segment.split(/\s+as\s+/)[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(original) && original !== "type") {
        symbols.add(original);
      }
    }

    return Array.from(symbols);
  }

  private extractPythonImportedSymbols(importClause: string): string[] {
    return importClause
      .replace(/[()]/g, "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.split(/\s+as\s+/i)[0].trim())
      .filter(Boolean);
  }

  private extractGoBlockImport(
    trimmed: string,
    lineNumber: number,
    imports: SourceImport[],
  ): void {
    const match = trimmed.match(
      /^(?:(?:[A-Za-z_.][\w.]*)\s+)?["`]([^"`]+)["`]/,
    );
    if (match) {
      imports.push({ line: lineNumber, source: match[1], symbols: [] });
    }
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

    const normalizedFromPath = this.normalize(fromPath);
    const baseDir = path.posix.dirname(normalizedFromPath);
    const basePaths = new Set<string>([
      this.resolveRelativeBasePath(baseDir, importSource),
    ]);

    if (normalizedFromPath.endsWith(".rs")) {
      const stem = path.posix.basename(normalizedFromPath, ".rs");
      if (!new Set(["lib", "main", "mod"]).has(stem)) {
        const nestedModuleDir = path.posix.join(baseDir, stem);
        basePaths.add(this.resolveRelativeBasePath(nestedModuleDir, importSource));
      }
    }

    const candidates: string[] = [];
    for (const basePath of basePaths) {
      candidates.push(basePath);
      for (const extension of INTERNAL_IMPORT_EXTENSIONS) {
        candidates.push(`${basePath}.${extension}`);
      }
      candidates.push(
        `${basePath}/index.ts`,
        `${basePath}/index.tsx`,
        `${basePath}/index.js`,
        `${basePath}/index.jsx`,
        `${basePath}/__init__.py`,
        `${basePath}/mod.rs`,
      );
    }

    return candidates.find((candidate) => pathIndex.has(candidate));
  }

  private resolveRelativeBasePath(baseDir: string, importSource: string): string {
    const pythonRelative = importSource.match(/^(\.+)([A-Za-z_]?[\w.]*)$/);
    if (pythonRelative && !importSource.includes("/")) {
      let targetDir = baseDir;
      const parentLevels = Math.max(0, pythonRelative[1].length - 1);
      for (let level = 0; level < parentLevels; level++) {
        targetDir = path.posix.dirname(targetDir);
      }
      const modulePath = pythonRelative[2].replace(/\./g, "/");
      return this.normalize(
        modulePath ? path.posix.join(targetDir, modulePath) : targetDir,
      );
    }

    return this.normalize(path.posix.join(baseDir, importSource));
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
