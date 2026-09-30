import test from "node:test";
import assert from "node:assert/strict";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationDocument } from "../src/services/localDocumentationDocument";
import {
  buildLocalSelfAuditReport,
  selfAuditPassed,
} from "../tools/localSelfAuditCore";
import type { WorkspaceFile } from "../src/types";

const files: WorkspaceFile[] = [
  {
    path: "src/providers/aiProvider.ts",
    language: "typescript",
    content: "export abstract class BaseAIProvider {}\n",
  },
  {
    path: "src/providers/providerFactory.ts",
    language: "typescript",
    content: "export class ProviderFactory {}\n",
  },
  {
    path: "src/config/secretStorage.ts",
    language: "typescript",
    content: "export class SecretStorage {}\n",
  },
  {
    path: "src/extension.ts",
    language: "typescript",
    content: 'import { ProviderFactory } from "./providers/providerFactory";\n',
  },
  {
    path: "package.json",
    language: "json",
    content: JSON.stringify({
      scripts: {
        compile: "tsc --noEmit",
        test: "node --test",
      },
    }),
  },
];

test("Local self-audit report checks the release-critical documentation invariants", () => {
  const project = new SourceAnalyzer().analyzeProject(files);
  const document = buildLocalDocumentationDocument(
    "DocuMint",
    files,
    project,
  );
  const report = buildLocalSelfAuditReport(document);

  assert.equal(report.files, 5);
  assert.ok(report.totalSymbols >= 3);
  assert.ok(report.totalExports >= 3);
  assert.ok(report.markdownLines > 0);
  assert.ok(report.htmlBytes > 0);
  assert.deepEqual(report.landmarks, {
    apiKeyStorage: "src/config/secretStorage.ts",
    providerFactory: "src/providers/providerFactory.ts",
    buildCommand: "npm run compile",
    testCommand: "npm run test",
  });
  assert.equal(selfAuditPassed(report), true);
  assert.deepEqual(
    report.assertions.filter((assertion) => !assertion.passed),
    [],
  );
});

test("Local self-audit fails when a critical source landmark disappears", () => {
  const reduced = files.filter(
    (file) => file.path !== "src/config/secretStorage.ts",
  );
  const project = new SourceAnalyzer().analyzeProject(reduced);
  const document = buildLocalDocumentationDocument(
    "DocuMint",
    reduced,
    project,
  );
  const report = buildLocalSelfAuditReport(document);

  assert.equal(selfAuditPassed(report), false);
  assert.equal(
    report.assertions.find(
      (assertion) => assertion.name === "API-key storage file is present",
    )?.passed,
    false,
  );
});
