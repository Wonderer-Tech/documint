import type { FileAnalysis } from "../analyzer/sourceAnalyzer";

export interface DocumentationValidationResult {
  warnings: string[];
  missingExportedSymbols: string[];
  unexpectedApiSymbols: string[];
  unexpectedDependencyClaims: string[];
  placeholders: string[];
}

const PLACEHOLDER_PATTERNS = [
  /\bactual[A-Z]\w*/g,
  /\bActual[A-Z]\w*/g,
  /\bfunctionName\b/g,
  /\bClassName\b/g,
  /\bmyMethod\b/g,
  /\bdoSomething\b/g,
  /\[description\]/gi,
  /\[root cause\]/gi,
  /\[what to inspect\]/gi,
  /\[observable symptom\]/gi,
];

export class DocumentationValidator {
  validateFileDocumentation(
    documentation: string,
    analysis: FileAnalysis,
  ): DocumentationValidationResult {
    const missingExportedSymbols = this.findMissingExportedSymbols(
      documentation,
      analysis,
    );
    const unexpectedApiSymbols = this.findUnexpectedApiSymbols(
      documentation,
      analysis,
    );
    const unexpectedDependencyClaims = this.findUnexpectedDependencyClaims(
      documentation,
      analysis,
    );
    const placeholders = this.findPlaceholders(documentation);
    const warnings: string[] = [];

    if (missingExportedSymbols.length > 0) {
      warnings.push(
        `Missing exported symbols: ${missingExportedSymbols
          .map((symbol) => `\`${symbol}\``)
          .join(", ")}`,
      );
    }

    if (unexpectedApiSymbols.length > 0) {
      warnings.push(
        `API reference mentions symbols not detected in source: ${unexpectedApiSymbols
          .slice(0, 8)
          .map((symbol) => `\`${symbol}\``)
          .join(", ")}`,
      );
    }

    if (unexpectedDependencyClaims.length > 0) {
      warnings.push(
        `Dependency section mentions imports/packages not detected in source: ${unexpectedDependencyClaims
          .slice(0, 8)
          .map((value) => `\`${value}\``)
          .join(", ")}`,
      );
    }

    if (placeholders.length > 0) {
      warnings.push(
        `Placeholder text still present: ${placeholders
          .slice(0, 8)
          .map((value) => `\`${value}\``)
          .join(", ")}`,
      );
    }

    if (!this.hasBalancedCodeFence(documentation)) {
      warnings.push("Markdown code fences are not balanced.");
    }

    if (!this.hasBalancedMermaidBlocks(documentation)) {
      warnings.push("Mermaid diagram blocks are not balanced.");
    }

    return {
      warnings,
      missingExportedSymbols,
      unexpectedApiSymbols,
      unexpectedDependencyClaims,
      placeholders,
    };
  }

  appendQualityNotes(
    documentation: string,
    validation: DocumentationValidationResult,
  ): string {
    if (validation.warnings.length === 0) {
      return documentation;
    }

    return `${documentation.trim()}

## DocuMint Quality Check

DocuMint checked this section against detected source facts before saving.

${validation.warnings.map((warning) => `- ${warning}`).join("\n")}
`;
  }

  private findMissingExportedSymbols(
    documentation: string,
    analysis: FileAnalysis,
  ): string[] {
    const exportedSymbols = analysis.symbols
      .filter((symbol) => symbol.exported)
      .map((symbol) => symbol.name);
    const lowerDocumentation = documentation.toLowerCase();

    return exportedSymbols.filter(
      (symbol) => !lowerDocumentation.includes(symbol.toLowerCase()),
    );
  }

  /**
   * Checks only symbol-like H3 headings inside an API Reference section. This
   * deliberately ignores prose and code examples so ordinary local variables
   * are not mistaken for hallucinated public API claims.
   */
  private findUnexpectedApiSymbols(
    documentation: string,
    analysis: FileAnalysis,
  ): string[] {
    const knownSymbols = new Set(
      analysis.symbols.map((symbol) => symbol.name.toLowerCase()),
    );
    const claimedSymbols = new Set<string>();
    const sections = documentation.split(/^##\s+/gm);

    for (const section of sections) {
      if (!/^API Reference\s*(?:\n|$)/i.test(section)) {
        continue;
      }

      for (const line of section.split(/\r?\n/)) {
        const candidate = this.extractApiHeadingSymbol(line);
        if (!candidate || candidate.toLowerCase() === "constructor") {
          continue;
        }
        if (!knownSymbols.has(candidate.toLowerCase())) {
          claimedSymbols.add(candidate);
        }
      }
    }

    return Array.from(claimedSymbols).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Validates only concrete code-spanned identifiers in dependency sections.
   * Prose remains untouched because lightweight source analysis cannot safely
   * decide whether a narrative architectural statement is true.
   */
  private findUnexpectedDependencyClaims(
    documentation: string,
    analysis: FileAnalysis,
  ): string[] {
    const known = this.knownDependencyIdentifiers(analysis);
    const claimed = new Set<string>();
    const sections = documentation.split(/^##\s+/gm);

    for (const section of sections) {
      if (!/^(?:Dependencies|Dependencies and Data Flow)\s*(?:\n|$)/i.test(section)) {
        continue;
      }

      for (const line of section.split(/\r?\n/)) {
        for (const match of line.matchAll(/`([^`\n]+)`/g)) {
          const candidate = match[1].trim();
          if (!this.looksLikeDependencyIdentifier(candidate)) {
            continue;
          }
          if (!known.has(candidate.toLowerCase())) {
            claimed.add(candidate);
          }
        }
      }
    }

    return Array.from(claimed).sort((a, b) => a.localeCompare(b));
  }

  private knownDependencyIdentifiers(analysis: FileAnalysis): Set<string> {
    const known = new Set<string>();

    for (const sourceImport of analysis.imports) {
      const source = sourceImport.source.trim();
      if (source) {
        known.add(source.toLowerCase());
        known.add(this.packageRoot(source).toLowerCase());
      }

      if (sourceImport.resolvedPath) {
        known.add(sourceImport.resolvedPath.toLowerCase());
        const fileName = sourceImport.resolvedPath
          .replace(/\\/g, "/")
          .split("/")
          .pop();
        if (fileName) {
          known.add(fileName.toLowerCase());
        }
      }

      for (const symbol of sourceImport.symbols) {
        if (symbol.trim()) {
          known.add(symbol.trim().toLowerCase());
        }
      }
    }

    return known;
  }

  private packageRoot(source: string): string {
    if (source.startsWith("@")) {
      return source.split("/").slice(0, 2).join("/");
    }
    return source.startsWith(".") ? source : source.split("/")[0];
  }

  private looksLikeDependencyIdentifier(value: string): boolean {
    return (
      value.length > 0 &&
      value.length <= 160 &&
      /^[.@A-Za-z0-9_$][A-Za-z0-9_$@./-]*$/.test(value)
    );
  }

  private extractApiHeadingSymbol(line: string): string | undefined {
    const heading = line.trim();
    if (!heading.startsWith("### ")) {
      return undefined;
    }

    const content = heading.slice(4).trim();
    const kindMatch = content.match(
      /^(?:class|function|method|interface|type|enum|const|constant|variable|struct|trait)\s+`?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)/i,
    );
    const signatureMatch = content.match(
      /^`?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\(/,
    );
    const codeHeadingMatch = content.match(
      /^`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)(?:\b|[<(])/,
    );
    const raw =
      kindMatch?.[1] ?? signatureMatch?.[1] ?? codeHeadingMatch?.[1];

    return raw?.split(".").pop();
  }

  private findPlaceholders(documentation: string): string[] {
    const placeholders = new Set<string>();

    for (const pattern of PLACEHOLDER_PATTERNS) {
      for (const match of documentation.matchAll(pattern)) {
        placeholders.add(match[0]);
      }
    }

    return Array.from(placeholders);
  }

  private hasBalancedCodeFence(documentation: string): boolean {
    const matches = documentation.match(/(^|\n)\s*(```|~~~)/g);
    return !matches || matches.length % 2 === 0;
  }

  private hasBalancedMermaidBlocks(documentation: string): boolean {
    const openings = documentation.match(/```\s*mermaid/gi)?.length ?? 0;
    if (openings === 0) {
      return true;
    }

    return this.hasBalancedCodeFence(documentation);
  }
}
