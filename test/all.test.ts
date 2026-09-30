import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import "./anthropicResponse.test";
import "./apiKeyValidation.test";
import "./browserWorkflowPolicy.test";
import "./chunkDocumentationMerge.test";
import "./chunkTokenBudget.test";
import "./configurationNamespace.test";
import "./configurationPreference.test";
import "./contextOutputBudget.test";
import "./contextWindowPolicy.test";
import "./customEndpointPolicy.test";
import "./documentationValidatorEvidence.test";
import "./generationCacheIdentity.test";
import "./generationDepth.test";
import "./generationMode.test";
import "./generationRunPipeline.test";
import "./htmlBaseScript.test";
import "./htmlBaseStyles.test";
import "./htmlJellyUi.test";
import "./htmlLocalCodeMap.test";
import "./htmlMarkdownSafety.test";
import "./htmlNavigationRuntime.test";
import "./htmlOfflineHardening.test";
import "./htmlReaderNavigation.test";
import "./htmlTemplatePolicy.test";
import "./localArchitectureDocumentation.test";
import "./localBuildFacts.test";
import "./localDocumentationCache.test";
import "./localDocumentationDocument.test";
import "./localDocumentationModel.test";
import "./localFileDocumentation.test";
import "./localProjectDocumentation.test";
import "./localProviderDiscovery.test";
import "./localProviderPolicy.test";
import "./localProviderRuntime.test";
import "./localReadmeFacts.test";
import "./localSelfAudit.test";
import "./manifestMetadata.test";
import "./markdownEscaping.test";
import "./modelContextCatalog.test";
import "./modelMetadataCacheEpoch.test";
import "./modelMetadataCacheKey.test";
import "./openAICompatibleResponse.test";
import "./openRouterCapabilities.test";
import "./outputSanitizer.test";
import "./outputTokenLimit.test";
import "./projectVisualPolicy.test";
import "./providerDefaults.test";
import "./providerErrorPolicy.test";
import "./providerHttpError.test";
import "./providerNamePolicy.test";
import "./providerRequestPolicy.test";
import "./providerRequestStartScheduler.test";
import "./providerRetry.test";
import "./providerRuntimeNormalization.test";
import "./providerSelectionRuntime.test";
import "./publicFacadeBoundary.test";
import "./regression.test";
import "./releasePackagePolicy.test";
import "./scannerPolicy.test";
import "./scannerRunIsolation.test";
import "./sidebarAssets.test";
import "./sidebarAuthState.test";
import "./sidebarCsp.test";
import "./sourceAnalyzer.test";
import "./sourceAnalyzerDependencySemantics.test";
import "./sourceAnalyzerTypedLanguages.test";
import "./sourceAnalyzerTypeScriptAst.test";
import "./sourceLink.test";

test("aggregate regression entry imports every sibling test module", () => {
  const testDirectory = join(process.cwd(), "test");
  const aggregateSource = readFileSync(
    join(testDirectory, "all.test.ts"),
    "utf8",
  );
  const siblingTests = readdirSync(testDirectory)
    .filter((name) => name.endsWith(".test.ts") && name !== "all.test.ts")
    .sort();

  for (const filename of siblingTests) {
    const modulePath = `./${filename.slice(0, -3)}`;
    assert.ok(
      aggregateSource.includes(`import "${modulePath}";`) ||
        aggregateSource.includes(`import '${modulePath}';`),
      `test/all.test.ts is missing ${modulePath}`,
    );
  }
});

