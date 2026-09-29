import * as ts from "typescript";
import type { WorkspaceFile } from "../types";
import type {
  FileAnalysis,
  SourceImport,
  SourceSymbol,
  SourceSymbolKind,
  SourceSymbolScope,
} from "./sourceAnalyzerBase";

const JAVASCRIPT_LIKE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "mts",
  "cts",
  "js",
  "jsx",
  "mjs",
  "cjs",
]);

export function isJavaScriptLikeWorkspaceFile(file: WorkspaceFile): boolean {
  const extension = file.path.split(".").pop()?.toLowerCase() ?? "";
  return JAVASCRIPT_LIKE_EXTENSIONS.has(extension);
}

export function analyzeJavaScriptLikeFile(
  file: WorkspaceFile,
  todos: FileAnalysis["todos"],
): FileAnalysis {
  const sourceFile = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(file.path),
  );

  const imports: SourceImport[] = [];
  const symbols: SourceSymbol[] = [];
  const explicitExportNames = collectExplicitExportNames(sourceFile);

  for (const statement of sourceFile.statements) {
    collectStaticImport(statement, sourceFile, imports);
    collectTopLevelSymbols(
      statement,
      sourceFile,
      symbols,
      explicitExportNames,
    );
  }

  collectDynamicImports(sourceFile, imports);

  return {
    path: file.path,
    language: file.language,
    imports: uniqueImports(
      imports.sort((a, b) => a.line - b.line),
    ),
    symbols: uniqueSymbols(symbols),
    todos,
  };
}

function scriptKindForPath(filePath: string): ts.ScriptKind {
  const extension = filePath.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "tsx":
      return ts.ScriptKind.TSX;
    case "jsx":
      return ts.ScriptKind.JSX;
    case "js":
    case "mjs":
    case "cjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function collectStaticImport(
  statement: ts.Statement,
  sourceFile: ts.SourceFile,
  imports: SourceImport[],
): void {
  if (ts.isImportDeclaration(statement) && ts.isStringLiteralLike(statement.moduleSpecifier)) {
    imports.push({
      source: statement.moduleSpecifier.text,
      line: lineOf(statement, sourceFile),
      symbols: importClauseSymbols(statement.importClause),
    });
    return;
  }

  if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteralLike(statement.moduleSpecifier)) {
    imports.push({
      source: statement.moduleSpecifier.text,
      line: lineOf(statement, sourceFile),
      symbols: exportClauseSymbols(statement.exportClause),
    });
  }
}

function importClauseSymbols(clause: ts.ImportClause | undefined): string[] {
  if (!clause) {
    return [];
  }

  const symbols: string[] = [];
  if (clause.name) {
    symbols.push(clause.name.text);
  }

  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) {
    symbols.push(bindings.name.text);
  } else if (bindings && ts.isNamedImports(bindings)) {
    for (const element of bindings.elements) {
      symbols.push((element.propertyName ?? element.name).text);
    }
  }

  return uniqueStrings(symbols);
}

function exportClauseSymbols(
  clause: ts.NamedExportBindings | undefined,
): string[] {
  if (!clause) {
    return [];
  }

  if (ts.isNamespaceExport(clause)) {
    return [clause.name.text];
  }

  return uniqueStrings(
    clause.elements.map((element) => (element.propertyName ?? element.name).text),
  );
}

function collectDynamicImports(
  sourceFile: ts.SourceFile,
  imports: SourceImport[],
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const first = node.arguments[0];
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === "require";

      if (
        (isDynamicImport || isRequire) &&
        (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))
      ) {
        imports.push({
          source: first.text,
          line: lineOf(node, sourceFile),
          symbols: [],
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
}

function collectExplicitExportNames(sourceFile: ts.SourceFile): Set<string> {
  const exported = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        exported.add((element.propertyName ?? element.name).text);
      }
      continue;
    }

    if (
      ts.isExportAssignment(statement) &&
      !statement.isExportEquals &&
      ts.isIdentifier(statement.expression)
    ) {
      exported.add(statement.expression.text);
    }
  }

  return exported;
}

function collectTopLevelSymbols(
  statement: ts.Statement,
  sourceFile: ts.SourceFile,
  symbols: SourceSymbol[],
  explicitExportNames: Set<string>,
): void {
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    symbols.push(
      symbolFromNamedDeclaration(
        statement,
        statement.name.text,
        "function",
        "module",
        sourceFile,
        explicitExportNames,
      ),
    );
    return;
  }

  if (ts.isClassDeclaration(statement) && statement.name) {
    symbols.push(
      symbolFromNamedDeclaration(
        statement,
        statement.name.text,
        "class",
        "module",
        sourceFile,
        explicitExportNames,
      ),
    );
    collectClassMethods(statement, sourceFile, symbols);
    return;
  }

  if (ts.isInterfaceDeclaration(statement)) {
    symbols.push(
      symbolFromNamedDeclaration(
        statement,
        statement.name.text,
        "interface",
        "module",
        sourceFile,
        explicitExportNames,
      ),
    );
    return;
  }

  if (ts.isTypeAliasDeclaration(statement)) {
    symbols.push(
      symbolFromNamedDeclaration(
        statement,
        statement.name.text,
        "type",
        "module",
        sourceFile,
        explicitExportNames,
      ),
    );
    return;
  }

  if (ts.isEnumDeclaration(statement)) {
    symbols.push(
      symbolFromNamedDeclaration(
        statement,
        statement.name.text,
        "enum",
        "module",
        sourceFile,
        explicitExportNames,
      ),
    );
    return;
  }

  if (ts.isVariableStatement(statement)) {
    const declarationKind: SourceSymbolKind =
      statement.declarationList.flags & ts.NodeFlags.Const
        ? "constant"
        : "variable";
    const statementExported = hasExportModifier(statement);

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }

      const name = declaration.name.text;
      const initializer = declaration.initializer;
      const kind: SourceSymbolKind =
        initializer &&
        (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
          ? "function"
          : declarationKind;

      symbols.push({
        name,
        kind,
        line: lineOf(declaration, sourceFile),
        exported: statementExported || explicitExportNames.has(name),
        signature: variableSignature(statement, declaration, sourceFile),
        scope: "module",
      });
    }
  }
}

function collectClassMethods(
  declaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  symbols: SourceSymbol[],
): void {
  for (const member of declaration.members) {
    if (ts.isConstructorDeclaration(member)) {
      symbols.push({
        name: "constructor",
        kind: "method",
        line: lineOf(member, sourceFile),
        exported: false,
        signature: declarationSignature(member, sourceFile),
        scope: "class",
      });
      continue;
    }

    if (
      (ts.isMethodDeclaration(member) ||
        ts.isGetAccessorDeclaration(member) ||
        ts.isSetAccessorDeclaration(member)) &&
      member.name
    ) {
      const name = propertyNameText(member.name);
      if (!name) {
        continue;
      }

      symbols.push({
        name,
        kind: "method",
        line: lineOf(member, sourceFile),
        exported: false,
        signature: declarationSignature(member, sourceFile),
        scope: "class",
      });
    }
  }
}

function symbolFromNamedDeclaration(
  declaration:
    | ts.FunctionDeclaration
    | ts.ClassDeclaration
    | ts.InterfaceDeclaration
    | ts.TypeAliasDeclaration
    | ts.EnumDeclaration,
  name: string,
  kind: SourceSymbolKind,
  scope: SourceSymbolScope,
  sourceFile: ts.SourceFile,
  explicitExportNames: Set<string>,
): SourceSymbol {
  return {
    name,
    kind,
    line: lineOf(declaration, sourceFile),
    exported: hasExportModifier(declaration) || explicitExportNames.has(name),
    signature: declarationSignature(declaration, sourceFile),
    scope,
  };
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) {
    return false;
  }
  return (
    ts.getModifiers(node)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) ?? false
  );
}

function declarationSignature(node: ts.Node, sourceFile: ts.SourceFile): string {
  let text: string;

  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    node.body
  ) {
    text = sourceFile.text.slice(node.getStart(sourceFile), node.body.getStart(sourceFile));
  } else {
    text = node.getText(sourceFile);
    if (
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const brace = text.indexOf("{");
      if (brace >= 0) {
        text = text.slice(0, brace);
      }
    }
  }

  return normalizeSignature(text);
}

function variableSignature(
  statement: ts.VariableStatement,
  declaration: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): string {
  const exportPrefix = hasExportModifier(statement) ? "export " : "";
  const declarationKeyword =
    statement.declarationList.flags & ts.NodeFlags.Const
      ? "const"
      : statement.declarationList.flags & ts.NodeFlags.Let
        ? "let"
        : "var";
  const name = declaration.name.getText(sourceFile);
  const typeText = declaration.type
    ? `: ${declaration.type.getText(sourceFile)}`
    : "";
  const initializer = declaration.initializer;

  if (initializer && ts.isArrowFunction(initializer)) {
    let initializerText = initializer.getText(sourceFile);
    if (ts.isBlock(initializer.body)) {
      initializerText = sourceFile.text.slice(
        initializer.getStart(sourceFile),
        initializer.body.getStart(sourceFile),
      );
    }
    return normalizeSignature(
      `${exportPrefix}${declarationKeyword} ${name}${typeText} = ${initializerText}`,
    );
  }

  if (initializer && ts.isFunctionExpression(initializer)) {
    const bodyStart = initializer.body.getStart(sourceFile);
    const initializerText = sourceFile.text.slice(
      initializer.getStart(sourceFile),
      bodyStart,
    );
    return normalizeSignature(
      `${exportPrefix}${declarationKeyword} ${name}${typeText} = ${initializerText}`,
    );
  }

  return normalizeSignature(
    `${exportPrefix}${declarationKeyword} ${name}${typeText}`,
  );
}

function propertyNameText(name: ts.PropertyName): string | undefined {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  return undefined;
}

function normalizeSignature(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*\{\s*$/, "")
    .replace(/;\s*$/, "")
    .trim()
    .slice(0, 400);
}

function lineOf(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function uniqueImports(imports: SourceImport[]): SourceImport[] {
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

function uniqueSymbols(symbols: SourceSymbol[]): SourceSymbol[] {
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

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
