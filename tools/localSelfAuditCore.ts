import type { LocalDocumentationDocument } from "../src/services/localDocumentationDocument";

export interface LocalSelfAuditReport {
  files: number;
  totalLines: number;
  totalSymbols: number;
  totalExports: number;
  internalDependencies: number;
  descriptions: number;
  undocumented: number;
  markdownLines: number;
  htmlBytes: number;
  assertions: Array<{
    name: string;
    passed: boolean;
    detail?: string;
  }>;
}

export function buildLocalSelfAuditReport(
  document: LocalDocumentationDocument,
): LocalSelfAuditReport {
  const model = document.model;
  const aiProvider = model.files.find(
    (file) => file.path === "src/providers/aiProvider.ts",
  );
  const packageFacts = model.gettingStarted;
  const scriptNames = new Set(
    packageFacts?.scripts.map((script) => script.name) ?? [],
  );

  const assertions: LocalSelfAuditReport["assertions"] = [
    {
      name: "BaseAIProvider is exported",
      passed:
        aiProvider?.exportedSymbols.some(
          (symbol) =>
            symbol.name === "BaseAIProvider" && symbol.kind === "class",
        ) ?? false,
    },
    {
      name: "API-key storage file is present",
      passed: model.files.some(
        (file) => file.path === "src/config/secretStorage.ts",
      ),
    },
    {
      name: "provider factory file is present",
      passed: model.files.some(
        (file) => file.path === "src/providers/providerFactory.ts",
      ),
    },
    {
      name: "compile script is documented",
      passed: scriptNames.has("compile"),
    },
    {
      name: "test script is documented",
      passed: scriptNames.has("test"),
    },
    {
      name: "Where is what is present",
      passed: document.markdown.includes("## Where is what"),
    },
    {
      name: "Suggested reading path is present",
      passed: document.markdown.includes("## Suggested reading path"),
    },
    {
      name: "raw architecture blueprint is absent from Markdown",
      passed: !document.markdown.includes("architecture-blueprint"),
    },
    {
      name: "raw Excalidraw payload is absent from Markdown",
      passed: !document.markdown.includes("excalidraw-blueprint"),
    },
    {
      name: "raw dependency graph payload is absent from Markdown",
      passed: !document.markdown.includes("dependency-graph"),
    },
    {
      name: "Local code map is present in HTML",
      passed: document.html.includes("data-documint-local-code-map"),
    },
    {
      name: "Local HTML has no cdnjs dependency",
      passed: !/cdnjs\.cloudflare\.com/i.test(document.html),
    },
  ];

  return {
    files: model.files.length,
    totalLines: model.totalLines,
    totalSymbols: model.totalSymbols,
    totalExports: model.totalExports,
    internalDependencies: model.internalDependencies.length,
    descriptions: model.files.filter((file) => Boolean(file.description)).length,
    undocumented: model.files.filter((file) => !file.description).length,
    markdownLines: document.markdown.split(/\r?\n/).length,
    htmlBytes: Buffer.byteLength(document.html, "utf8"),
    assertions,
  };
}

export function selfAuditPassed(report: LocalSelfAuditReport): boolean {
  return report.assertions.every((assertion) => assertion.passed);
}
