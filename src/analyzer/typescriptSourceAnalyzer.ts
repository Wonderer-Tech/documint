import * as ts from "typescript";
import type { WorkspaceFile } from "../types";
import type {
  FileAnalysis,
  SourceDescription,
  SourceImport,
  SourceSymbol,
  SourceSymbolKind,
  SourceSymbolScope,
  TodoComment,
} from "./sourceAnalyzer";

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
  const explicitFileDescription = extractExplicitFileDescription(
    sourceFile,
    file.content,
  );

  for (const statement of sourceFile.statements) {
    collectStaticImport(statement, sourceFile, imports);
    collectExplicitExportSymbols(statement, sourceFile, symbols);
    collectTopLevelSymbols(
      statement,
      sourceFile,
      symbols,
      explicitExportNames,
    );
  }

  collectDynamicImports(sourceFile, imports);

  const uniqueFileSymbols = uniqueSymbols(symbols);
  const description =
    explicitFileDescription ??
    inferSingleExportDescription(uniqueFileSymbols);

  return {
    path: file.path,
    language: file.language,
    imports: uniqueImports(
      imports.sort((a, b) => a.line - b.line),
    ),
    symbols: uniqueFileSymbols,
    todos: collectTodoComments(file, sourceFile),
    description,
    referencedEnvironmentVariables:
      collectReferencedEnvironmentVariables(sourceFile),
  };
}

function collectReferencedEnvironmentVariables(
  sourceFile: ts.SourceFile,
): string[] {
  const names = new Set<string>();

  const isProcessEnv = (node: ts.Expression): boolean =>
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "process" &&
    node.name.text === "env";

  const isImportMetaEnv = (node: ts.Expression): boolean =>
    ts.isPropertyAccessExpression(node) &&
    ts.isMetaProperty(node.expression) &&
    node.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
    node.expression.name.text === "meta" &&
    node.name.text === "env";

  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      (isProcessEnv(node.expression) || isImportMetaEnv(node.expression))
    ) {
      names.add(node.name.text);
    } else if (
      ts.isElementAccessExpression(node) &&
      isProcessEnv(node.expression) &&
      node.argumentExpression &&
      (ts.isStringLiteral(node.argumentExpression) ||
        ts.isNoSubstitutionTemplateLiteral(node.argumentExpression))
    ) {
      const value = node.argumentExpression.text;
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        names.add(value);
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function collectTodoComments(
  file: WorkspaceFile,
  sourceFile: ts.SourceFile,
): TodoComment[] {
  const extension = file.path.split(".").pop()?.toLowerCase();
  const variant =
    extension === "tsx" || extension === "jsx"
      ? ts.LanguageVariant.JSX
      : ts.LanguageVariant.Standard;
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    variant,
    file.content,
  );
  const todos: TodoComment[] = [];

  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    if (
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      continue;
    }

    const startLine =
      sourceFile.getLineAndCharacterOfPosition(scanner.getTokenPos()).line + 1;
    const commentLines = scanner
      .getTokenText()
      .replace(/^\/\//, "")
      .replace(/^\/\*/, "")
      .replace(/\*\/$/, "")
      .split(/\r?\n/);

    commentLines.forEach((rawLine, index) => {
      const line = rawLine.replace(/^\s*\*\s?/, "").trim();
      const match = line.match(/\b(TODO|FIXME|HACK)\b[:\s-]*(.+)$/i);
      if (!match) {
        return;
      }
      todos.push({
        line: startLine + index,
        text: `${match[1].toUpperCase()}: ${match[2].trim()}`,
      });
    });
  }

  return todos;
}

function extractExplicitFileDescription(
  sourceFile: ts.SourceFile,
  content: string,
): SourceDescription | undefined {
  const firstStatement = sourceFile.statements[0];
  const boundary = firstStatement
    ? firstStatement.getStart(sourceFile)
    : content.length;
  const prefix = content.slice(0, boundary);
  const blocks = Array.from(prefix.matchAll(/\/\*\*([\s\S]*?)\*\//g));

  for (const block of blocks) {
    const raw = block[1] ?? "";
    if (!/@(?:file|module)\b/.test(raw)) {
      continue;
    }

    const text = cleanJSDocSummary(raw);
    if (!text) {
      continue;
    }

    const offset = block.index ?? 0;
    return {
      text,
      source: "file-comment",
      line:
        sourceFile.getLineAndCharacterOfPosition(offset).line + 1,
    };
  }

  return undefined;
}

function declarationDescription(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): SourceDescription | undefined {
  const leading = sourceFile.text.slice(
    node.getFullStart(),
    node.getStart(sourceFile),
  );
  const blocks = Array.from(leading.matchAll(/\/\*\*([\s\S]*?)\*\//g));
  const block = blocks[blocks.length - 1];
  if (!block) {
    return undefined;
  }

  const text = cleanJSDocSummary(block[1] ?? "");
  if (!text) {
    return undefined;
  }

  const absoluteOffset = node.getFullStart() + (block.index ?? 0);
  return {
    text,
    source: "declaration-comment",
    line:
      sourceFile.getLineAndCharacterOfPosition(absoluteOffset).line + 1,
  };
}

function cleanJSDocSummary(value: string): string {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, "").trim());

  const summary: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (summary.length > 0) {
        summary.push("");
      }
      continue;
    }

    const fileTag = line.match(/^@(?:file|module)\b\s*(.*)$/);
    if (fileTag) {
      if (fileTag[1]) {
        summary.push(fileTag[1]);
      }
      continue;
    }

    if (line.startsWith("@")) {
      break;
    }
    summary.push(line);
  }

  return summary
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function inferSingleExportDescription(
  symbols: SourceSymbol[],
): SourceDescription | undefined {
  const exported = symbols.filter(
    (symbol) => symbol.exported && symbol.scope === "module",
  );
  if (exported.length !== 1) {
    return undefined;
  }

  return exported[0].description
    ? {
        ...exported[0].description,
        source: "declaration-comment",
      }
    : undefined;
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

function collectExplicitExportSymbols(
  statement: ts.Statement,
  sourceFile: ts.SourceFile,
  symbols: SourceSymbol[],
): void {
  if (
    !ts.isExportDeclaration(statement) ||
    !statement.exportClause
  ) {
    return;
  }

  if (ts.isNamespaceExport(statement.exportClause)) {
    symbols.push({
      name: statement.exportClause.name.text,
      kind: "export",
      line: lineOf(statement.exportClause, sourceFile),
      exported: true,
      signature: normalizeSignature(statement.getText(sourceFile)),
      scope: "module",
      description: declarationDescription(statement, sourceFile),
    });
    return;
  }

  for (const element of statement.exportClause.elements) {
    const originalName = (element.propertyName ?? element.name).text;
    const exportedName = element.name.text;
    const crossesModuleBoundary = Boolean(statement.moduleSpecifier);
    const isAlias = exportedName !== originalName;

    if (!crossesModuleBoundary && !isAlias) {
      continue;
    }

    symbols.push({
      name: exportedName,
      kind: "export",
      line: lineOf(element, sourceFile),
      exported: true,
      signature: normalizeSignature(statement.getText(sourceFile)),
      scope: "module",
      description: declarationDescription(statement, sourceFile),
    });
  }
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
      const names = bindingNames(declaration.name);
      if (names.length === 0) {
        continue;
      }

      for (const name of names) {
        const initializer = declaration.initializer;
        const kind: SourceSymbolKind =
          ts.isIdentifier(declaration.name) &&
          initializer &&
          (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
            ? "function"
            : declarationKind;

        symbols.push({
          name,
          kind,
          line: lineOf(declaration, sourceFile),
          exported: statementExported || explicitExportNames.has(name),
          signature: ts.isIdentifier(declaration.name)
            ? variableSignature(statement, declaration, sourceFile)
            : normalizeSignature(statement.getText(sourceFile)),
          scope: "module",
          description:
            statement.declarationList.declarations.length === 1 &&
            names.length === 1
              ? declarationDescription(statement, sourceFile)
              : undefined,
        });
      }
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
        description: declarationDescription(member, sourceFile),
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
        description: declarationDescription(member, sourceFile),
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
    description: declarationDescription(declaration, sourceFile),
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

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }

  const names: string[] = [];
  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }
    names.push(...bindingNames(element.name));
  }
  return names;
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
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*\)/g, ")")
    .replace(/\s*,\s*/g, ", ")
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
