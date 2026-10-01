import type { WorkspaceFile } from "../types";
import { normalizeProjectPath } from "./structuralModule";

export type LocalSecurityEvidenceKind =
  | "secret-storage"
  | "credential-environment"
  | "security-policy"
  | "auth-dependency";

export interface LocalSecurityEvidence {
  kind: LocalSecurityEvidenceKind;
  label: string;
  path?: string;
  line?: number;
  detail: string;
}

export interface LocalSecurityFacts {
  evidence: LocalSecurityEvidence[];
}

export interface LocalSecurityEnvironmentFile {
  path: string;
  referencedEnvironmentVariables: string[];
}

export interface ExtractLocalSecurityFactsOptions {
  environmentFiles?: LocalSecurityEnvironmentFile[];
  externalDependencies?: string[];
}

const CREDENTIAL_ENVIRONMENT_PATTERN =
  /(?:^|_)(?:API_?KEY|TOKEN|SECRET|PASSWORD|PASS(?:WORD)?|CREDENTIALS?|PRIVATE_?KEY|ACCESS_?KEY)(?:_|$)/i;

const SECURITY_POLICY_PATTERNS: Array<{
  label: string;
  pattern: RegExp;
}> = [
  { label: "Content Security Policy", pattern: /Content-Security-Policy/i },
  { label: "Strict Transport Security", pattern: /Strict-Transport-Security/i },
  { label: "Frame embedding policy", pattern: /X-Frame-Options/i },
  { label: "Content type sniffing policy", pattern: /X-Content-Type-Options/i },
  { label: "Referrer policy", pattern: /Referrer-Policy/i },
  { label: "Permissions policy", pattern: /Permissions-Policy/i },
];

const AUTH_DEPENDENCIES = new Set([
  "@auth/core",
  "argon2",
  "bcrypt",
  "bcryptjs",
  "jose",
  "jsonwebtoken",
  "lucia",
  "next-auth",
  "oauth",
  "openid-client",
  "passport",
  "supertokens-node",
]);

export function extractLocalSecurityFacts(
  files: WorkspaceFile[],
  options: ExtractLocalSecurityFactsOptions = {},
): LocalSecurityFacts | undefined {
  const evidence: LocalSecurityEvidence[] = [];

  for (const file of files) {
    const path = normalizeProjectPath(file.path);
    const lines = file.content.split(/\r?\n/);

    const secretLine = findLine(
      lines,
      (line) =>
        !isCommentOnlyLine(line) &&
        (
          /\b(?:SecretStorage|SecretStorageManager|keytar|keyring|SecretsManager|SecretClient)\b/.test(
            line,
          ) ||
          /\b(?:context|extensionContext)\.secrets\b/.test(line)
        ),
    );
    if (secretLine) {
      evidence.push({
        kind: "secret-storage",
        label: "Secret storage",
        path,
        line: secretLine.line,
        detail: "Direct secret-storage API or wrapper reference detected in source.",
      });
    }

    for (const policy of SECURITY_POLICY_PATTERNS) {
      const match = findLine(
        lines,
        (line) => !isCommentOnlyLine(line) && policy.pattern.test(line),
      );
      if (!match) continue;
      evidence.push({
        kind: "security-policy",
        label: policy.label,
        path,
        line: match.line,
        detail: "Security policy/header name appears directly in source.",
      });
    }
  }

  for (const file of options.environmentFiles ?? []) {
    for (const name of file.referencedEnvironmentVariables) {
      if (!CREDENTIAL_ENVIRONMENT_PATTERN.test(name)) continue;
      evidence.push({
        kind: "credential-environment",
        label: name,
        path: normalizeProjectPath(file.path),
        detail:
          "Credential-like environment variable name is referenced in source; no value is included.",
      });
    }
  }

  for (const dependency of options.externalDependencies ?? []) {
    const normalized = dependency.trim().toLowerCase();
    if (!AUTH_DEPENDENCIES.has(normalized)) continue;
    evidence.push({
      kind: "auth-dependency",
      label: dependency,
      detail: "Authentication/security library is imported by project source.",
    });
  }

  const unique = dedupeEvidence(evidence);
  return unique.length ? { evidence: unique } : undefined;
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

function findLine(
  lines: string[],
  predicate: (line: string) => boolean,
): { line: number } | undefined {
  for (let index = 0; index < lines.length; index++) {
    if (predicate(lines[index])) {
      return { line: index + 1 };
    }
  }
  return undefined;
}

function dedupeEvidence(
  evidence: LocalSecurityEvidence[],
): LocalSecurityEvidence[] {
  const seen = new Set<string>();
  return evidence
    .filter((item) => {
      const key = [
        item.kind,
        item.label,
        item.path ?? "",
        item.line ?? "",
      ].join("\0");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        a.kind.localeCompare(b.kind) ||
        (a.path ?? "").localeCompare(b.path ?? "") ||
        (a.line ?? 0) - (b.line ?? 0) ||
        a.label.localeCompare(b.label),
    );
}
