import type { ProjectAnalysis } from "../analyzer/sourceAnalyzer";
import type { WorkspaceFile } from "../types";
import { normalizeProjectPath } from "./structuralModule";

export type LocalFailureSignalKind =
  | "throw"
  | "error-report";

export interface LocalFailureSignal {
  kind: LocalFailureSignalKind;
  path: string;
  line: number;
  errorType?: string;
  message: string;
}

export interface LocalRecoveryHelper {
  path: string;
  line: number;
  name: string;
  kind: string;
  exported: boolean;
}

export interface LocalFailureFacts {
  failures: LocalFailureSignal[];
  recoveryHelpers: LocalRecoveryHelper[];
}

const RECOVERY_NAME_PATTERN =
  /(?:retry|recover|recovery|fallback|backoff|resume)/i;

export function extractLocalFailureFacts(
  files: WorkspaceFile[],
  project: ProjectAnalysis,
): LocalFailureFacts | undefined {
  const failures: LocalFailureSignal[] = [];

  for (const file of files) {
    const path = normalizeProjectPath(file.path);
    failures.push(...extractStaticFailureSignals(path, file.content));
  }

  const recoveryHelpers: LocalRecoveryHelper[] = [];
  for (const analysis of project.files) {
    const path = normalizeProjectPath(analysis.path);
    for (const symbol of analysis.symbols) {
      if (!RECOVERY_NAME_PATTERN.test(symbol.name)) continue;
      recoveryHelpers.push({
        path,
        line: symbol.line,
        name: symbol.name,
        kind: symbol.kind,
        exported: symbol.exported,
      });
    }
  }

  const uniqueFailures = dedupeFailures(failures);
  const uniqueHelpers = dedupeHelpers(recoveryHelpers);
  if (!uniqueFailures.length && !uniqueHelpers.length) {
    return undefined;
  }

  return {
    failures: uniqueFailures,
    recoveryHelpers: uniqueHelpers,
  };
}

function extractStaticFailureSignals(
  path: string,
  content: string,
): LocalFailureSignal[] {
  const signals: LocalFailureSignal[] = [];
  const masked = maskCommentOnlyLines(content);

  const throwPattern =
    /\bthrow\s+new\s+([A-Za-z_$][\w$]*)\s*\(\s*(["'`])([\s\S]*?)\2/g;
  for (const match of masked.matchAll(throwPattern)) {
    const message = staticLiteralText(match[3], match[2]);
    if (!message) continue;
    signals.push({
      kind: "throw",
      path,
      line: lineNumberAt(masked, match.index ?? 0),
      errorType: match[1],
      message,
    });
  }

  const rejectPattern =
    /\b(?:Promise\.)?reject\s*\(\s*new\s+([A-Za-z_$][\w$]*)\s*\(\s*(["'`])([\s\S]*?)\2/g;
  for (const match of masked.matchAll(rejectPattern)) {
    const message = staticLiteralText(match[3], match[2]);
    if (!message) continue;
    signals.push({
      kind: "throw",
      path,
      line: lineNumberAt(masked, match.index ?? 0),
      errorType: match[1],
      message,
    });
  }

  const reportPattern =
    /\bshowErrorMessage\s*\(\s*(["'`])([\s\S]*?)\1/g;
  for (const match of masked.matchAll(reportPattern)) {
    const message = staticLiteralText(match[2], match[1]);
    if (!message) continue;
    signals.push({
      kind: "error-report",
      path,
      line: lineNumberAt(masked, match.index ?? 0),
      message,
    });
  }

  return signals;
}

function staticLiteralText(
  raw: string,
  quote: string,
): string | undefined {
  if (quote === "`" && raw.includes("${")) {
    return undefined;
  }

  const text = raw
    .replace(/\\r?\\n/g, " ")
    .replace(/\\(["'`\\])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length > 280) {
    return undefined;
  }
  return text;
}

function maskCommentOnlyLines(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => (isCommentOnlyLine(line) ? " ".repeat(line.length) : line))
    .join("\n");
}

function isCommentOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("--") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("<!--")
  );
}

function lineNumberAt(content: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor++) {
    if (content.charCodeAt(cursor) === 10) line++;
  }
  return line;
}

function dedupeFailures(
  failures: LocalFailureSignal[],
): LocalFailureSignal[] {
  const seen = new Set<string>();
  return failures
    .filter((item) => {
      const key = [
        item.kind,
        item.path,
        item.line,
        item.errorType ?? "",
        item.message,
      ].join("\0");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        a.path.localeCompare(b.path) ||
        a.line - b.line ||
        a.message.localeCompare(b.message),
    );
}

function dedupeHelpers(
  helpers: LocalRecoveryHelper[],
): LocalRecoveryHelper[] {
  const seen = new Set<string>();
  return helpers
    .filter((item) => {
      const key = [
        item.path,
        item.line,
        item.name,
        item.kind,
      ].join("\0");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        a.path.localeCompare(b.path) ||
        a.line - b.line ||
        a.name.localeCompare(b.name),
    );
}
