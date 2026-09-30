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
  landmarks: {
    apiKeyStorage?: string;
    providerFactory?: string;
    buildCommand?: string;
    testCommand?: string;
  };
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
  const apiKeyStorage = model.files.find(
    (file) => file.path === "src/config/secretStorage.ts",
  )?.path;
  const providerFactory = model.files.find(
    (file) => file.path === "src/providers/providerFactory.ts",
  )?.path;
  const buildCommand = packageFacts?.scripts.find(
    (script) => script.name === "compile" || script.name === "build",
  )?.run;
  const testCommand = packageFacts?.scripts.find(
    (script) => script.name === "test",
  )?.run;

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
      passed: Boolean(apiKeyStorage),
    },
    {
      name: "provider factory file is present",
      passed: Boolean(providerFactory),
    },
    {
      name: "compile script is documented",
      passed: Boolean(buildCommand),
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
      name: "Local HTML onboarding is code-map owned",
      passed:
        document.html.includes('<h3 id="localMapRunTitle">How to run</h3>') &&
        !/<h2[^>]*>How to run<\/h2>/i.test(document.html),
    },
    {
      name: "Local HTML exposes compile and test commands",
      passed:
        Boolean(buildCommand) &&
        Boolean(testCommand) &&
        document.html.includes(buildCommand!) &&
        document.html.includes(testCommand!),
    },
    {
      name: "Local HTML search indexes complete file evidence",
      passed:
        document.html.includes("Internal symbol: ") &&
        document.html.includes("Source note: "),
    },
    {
      name: "Local HTML retains module start/provenance facts",
      passed:
        document.html.includes("Suggested start:") &&
        document.html.includes("primaryFilePaths"),
    },
    {
      name: "Local HTML keeps full dependency relations accessible",
      passed:
        document.html.includes("local-map-relation-more") &&
        document.html.includes("paths.slice(12)"),
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
    landmarks: {
      apiKeyStorage,
      providerFactory,
      buildCommand,
      testCommand,
    },
    assertions,
  };
}

export function selfAuditPassed(report: LocalSelfAuditReport): boolean {
  return report.assertions.every((assertion) => assertion.passed);
}
