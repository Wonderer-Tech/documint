import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  REVIEW_PROMPT_COOLDOWN_MS,
  completeReviewPrompt,
  disableReviewPrompt,
  isReviewPromptDue,
  normalizeReviewPromptState,
  recordSuccessfulGenerationForReview,
} from "../src/services/reviewPromptPolicy";

test("review card is due on first DocuMint activation", () => {
  assert.equal(isReviewPromptDue(undefined, 1_000), true);
  assert.equal(
    isReviewPromptDue(
      {
        successfulGenerations: 0,
        firstPromptShown: true,
        lastPromptAt: 1_000,
      },
      1_001,
    ),
    false,
  );
});

test("review card repeats only after the seven-day cooldown", () => {
  const state = {
    successfulGenerations: 0,
    firstPromptShown: true,
    lastPromptAt: 10_000,
  };

  assert.equal(
    isReviewPromptDue(state, 10_000 + REVIEW_PROMPT_COOLDOWN_MS - 1),
    false,
  );
  assert.equal(
    isReviewPromptDue(state, 10_000 + REVIEW_PROMPT_COOLDOWN_MS),
    true,
  );
});

test("successful generation can request a due review card without consuming cooldown", () => {
  const first = recordSuccessfulGenerationForReview(undefined, 5_000);
  assert.equal(first.state.successfulGenerations, 1);
  assert.equal(first.shouldPrompt, true);
  assert.equal(first.state.firstPromptShown, false);
  assert.equal(first.state.lastPromptAt, undefined);

  const second = recordSuccessfulGenerationForReview(first.state, 6_000);
  assert.equal(second.state.successfulGenerations, 2);
  assert.equal(second.shouldPrompt, true);
});

test("legacy prompt timestamps count as an already-shown first review card", () => {
  const normalized = normalizeReviewPromptState({
    successfulGenerations: 3,
    lastPromptAt: 20_000,
  });

  assert.equal(normalized.firstPromptShown, true);
  assert.equal(isReviewPromptDue(normalized, 20_001), false);
  assert.equal(
    isReviewPromptDue(
      normalized,
      20_000 + REVIEW_PROMPT_COOLDOWN_MS,
    ),
    true,
  );
});

test("review completion and opt-out permanently suppress future cards", () => {
  const completed = isReviewPromptDue(
    completeReviewPrompt({ successfulGenerations: 0 }),
    50_000,
  );
  assert.equal(completed, false);

  const disabled = isReviewPromptDue(
    disableReviewPrompt({ successfulGenerations: 0 }),
    50_000,
  );
  assert.equal(disabled, false);
});

test("review state normalization rejects malformed counters and timestamps", () => {
  assert.deepEqual(
    normalizeReviewPromptState({
      successfulGenerations: -8.7,
      lastPromptAt: -50,
      firstPromptShown: "yes",
      completed: "yes",
      disabled: 1,
    }),
    {
      successfulGenerations: 0,
      firstPromptShown: false,
      lastPromptAt: undefined,
      completed: false,
      disabled: false,
    },
  );
});

test("review experience is rendered inside the DocuMint sidebar", () => {
  const extensionSource = readFileSync("src/extensionBase.ts", "utf8");
  const serviceSource = readFileSync(
    "src/services/reviewPromptService.ts",
    "utf8",
  );
  const providerSource = readFileSync(
    "src/views/sidebarProvider.ts",
    "utf8",
  );
  const templateSource = readFileSync(
    "src/views/sidebarTemplate.ts",
    "utf8",
  );
  const clientSource = readFileSync(
    "src/views/sidebarClientScript.ts",
    "utf8",
  );

  assert.equal(
    (
      extensionSource.match(
        /reviewPromptService\s*\.\s*recordSuccessfulGeneration\(\)/g,
      ) ?? []
    ).length,
    2,
  );
  assert.match(
    extensionSource,
    /reviewPromptService\s*\.\s*shouldShowOnActivation\(\)/,
  );
  assert.match(extensionSource, /setReviewPromptVisible\(visible\)/);
  assert.match(extensionSource, /aiDocGenerator\.reviewPromptPresented/);
  assert.match(extensionSource, /aiDocGenerator\.reviewMarketplace/);
  assert.match(extensionSource, /aiDocGenerator\.reviewFeedback/);
  assert.match(extensionSource, /aiDocGenerator\.reviewLater/);
  assert.match(extensionSource, /aiDocGenerator\.reviewNever/);

  assert.match(serviceSource, /vscode\.ExtensionMode\.Development/);
  assert.match(
    serviceSource,
    /globalState\.update\(REVIEW_STATE_KEY, undefined\)/,
  );
  assert.match(serviceSource, /markReviewPromptShown\(current\)/);
  assert.match(
    serviceSource,
    /marketplace\.visualstudio\.com\/items\?itemName=wonderertech\.documint/,
  );
  assert.match(serviceSource, /github\.com\/Wonderer-Tech\/documint\/issues\/new/);
  assert.doesNotMatch(serviceSource, /showInformationMessage/);

  assert.match(providerSource, /reviewPromptVisible: false/);
  assert.match(providerSource, /review-prompt-presented/);
  assert.match(providerSource, /review-marketplace/);
  assert.match(providerSource, /review-feedback/);
  assert.match(providerSource, /review-later/);
  assert.match(providerSource, /review-never/);

  assert.match(templateSource, /id="reviewCard"/);
  assert.match(templateSource, /id="reviewStars"/);
  assert.equal((templateSource.match(/class="review-star"/g) ?? []).length, 5);
  assert.match(templateSource, /id="reviewFeedback"/);
  assert.match(templateSource, /What should we improve\?/);
  assert.match(templateSource, /Open GitHub feedback issue/);
  assert.match(templateSource, /Review on Marketplace/);
  assert.match(templateSource, /Don't ask again/);

  assert.match(clientSource, /function setReviewRating/);
  assert.match(clientSource, /function setReviewPromptVisible/);
  assert.match(clientSource, /type: 'review-prompt-presented'/);
  assert.match(clientSource, /type: 'review-marketplace'/);
  assert.match(clientSource, /type: 'review-feedback'/);
  assert.match(clientSource, /type: 'review-later'/);
  assert.match(clientSource, /type: 'review-never'/);
});
