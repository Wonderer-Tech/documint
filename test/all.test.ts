import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import "./regression.test";
import "./outputTokenLimit.test";
import "./apiKeyValidation.test";
import "./modelContextCatalog.test";
import "./providerDefaults.test";
import "./generationCacheIdentity.test";
import "./outputSanitizer.test";
import "./scannerPolicy.test";
import "./openAICompatibleResponse.test";
import "./documentationValidatorEvidence.test";
import "./modelMetadataCacheKey.test";
import "./customEndpointPolicy.test";
import "./providerErrorPolicy.test";
import "./providerRetry.test";
import "./providerRequestPolicy.test";
import "./anthropicResponse.test";
import "./providerHttpError.test";
import "./openRouterCapabilities.test";
import "./providerNamePolicy.test";
import "./manifestMetadata.test";
import "./generationMode.test";
import "./sourceAnalyzer.test";
import "./sourceAnalyzerTypedLanguages.test";
import "./sourceAnalyzerDependencySemantics.test";
import "./contextWindowPolicy.test";
import "./modelMetadataCacheEpoch.test";
import "./generationRunPipeline.test";
import "./chunkDocumentationMerge.test";
import "./providerSelectionRuntime.test";
import "./projectVisualPolicy.test";
import "./scannerRunIsolation.test";
import "./htmlOfflineHardening.test";
import "./releasePackagePolicy.test";
import "./providerRuntimeNormalization.test";
import "./publicFacadeBoundary.test";

test("aggregate regression entry imports every sibling test module", () => {
  const testDirectory = join(process.cwd(), "test");
  const aggregateSource = readFileSync(join(testDirectory, "all.test.ts"), "utf8");
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
