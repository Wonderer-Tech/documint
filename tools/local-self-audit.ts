import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { getLanguageFromPath } from "../src/scanner/scannerPolicy";
import { buildLocalDocumentationDocument } from "../src/services/localDocumentationDocument";
import type { WorkspaceFile } from "../src/types";
import {
  buildLocalSelfAuditReport,
  selfAuditPassed,
} from "./localSelfAuditCore";

const root = resolve(process.cwd());
const srcRoot = join(root, "src");
const auditStartedAt = process.hrtime.bigint();

function collectSourceFiles(directory: string): WorkspaceFile[] {
  const files: WorkspaceFile[] = [];

  for (const entry of readdirSync(directory).sort()) {
    const absolute = join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(absolute));
      continue;
    }

    const language = getLanguageFromPath(absolute);
    if (!language || /\.(?:test|spec)\./i.test(entry) || /\.d\.ts$/i.test(entry)) {
      continue;
    }

    files.push({
      path: relative(root, absolute).replace(/\\/g, "/"),
      language,
      content: readFileSync(absolute, "utf8"),
    });
  }

  return files;
}

const files = collectSourceFiles(srcRoot);
const packageJson = join(root, "package.json");
files.push({
  path: "package.json",
  language: "json",
  content: readFileSync(packageJson, "utf8"),
});

const readOptional = (name: string): string | undefined => {
  const filePath = join(root, name);
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : undefined;
};

const readme = readOptional("README.md");
const makefile = readOptional("Makefile") ?? readOptional("makefile");
const dockerfile = readOptional("Dockerfile") ?? readOptional("dockerfile");
const project = new SourceAnalyzer().analyzeProject(files);
const document = buildLocalDocumentationDocument(
  "DocuMint",
  files,
  project,
  { readme, makefile, dockerfile },
);
const report = buildLocalSelfAuditReport(document);
const durationMs =
  Math.round(Number(process.hrtime.bigint() - auditStartedAt) / 10000) / 100;

const evidencePath = process.env.DOCUMINT_SELF_AUDIT_OUTPUT;
if (evidencePath) {
  const absoluteEvidencePath = resolve(root, evidencePath);
  mkdirSync(dirname(absoluteEvidencePath), { recursive: true });
  writeFileSync(
    absoluteEvidencePath,
    JSON.stringify({ durationMs, report }, null, 2) + "\n",
  );
}

console.log(JSON.stringify(report, null, 2));

if (!selfAuditPassed(report)) {
  const failed = report.assertions
    .filter((assertion) => !assertion.passed)
    .map((assertion) => assertion.name);
  console.error("\nSelf-audit failed:", failed.join("; "));
  process.exitCode = 1;
}
