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

test("review prompt is due on first DocuMint activation", () => {
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

test("review prompt repeats only after the seven-day cooldown", () => {
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

test("successful generation can request a due prompt without consuming the cooldown", () => {
  const first = recordSuccessfulGenerationForReview(undefined, 5_000);
  assert.equal(first.state.successfulGenerations, 1);
  assert.equal(first.shouldPrompt, true);
  assert.equal(first.state.firstPromptShown, false);
  assert.equal(first.state.lastPromptAt, undefined);

  const second = recordSuccessfulGenerationForReview(first.state, 6_000);
  assert.equal(second.state.successfulGenerations, 2);
  assert.equal(second.shouldPrompt, true);
});

test("legacy prompt timestamps count as an already-shown first prompt", () => {
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

test("review completion and opt-out permanently suppress future prompts", () => {
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

test("review prompt state normalization rejects malformed counters and timestamps", () => {
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

test("extension schedules activation prompt and records Local and AI successes", () => {
  const extensionSource = readFileSync("src/extensionBase.ts", "utf8");
  const serviceSource = readFileSync(
    "src/services/reviewPromptService.ts",
    "utf8",
  );

  assert.equal(
    (
      extensionSource.match(
        /reviewPromptService\.recordSuccessfulGeneration\(\)/g,
      ) ?? []
    ).length,
    2,
  );
  assert.match(
    extensionSource,
    /reviewPromptService\.schedulePromptOnActivation\(\)/,
  );
  assert.match(serviceSource, /vscode\.ExtensionMode\.Development/);
  assert.match(
    serviceSource,
    /globalState\.update\(REVIEW_STATE_KEY, undefined\)/,
  );
  assert.match(serviceSource, /markReviewPromptShown\(latest\)/);
  assert.match(
    serviceSource,
    /If you love DocuMint and it genuinely helps your work, please review us on the Marketplace\./,
  );
  assert.match(serviceSource, /Review on Marketplace/);
  assert.match(serviceSource, /Tell us what to improve/);
  assert.doesNotMatch(serviceSource, /showInputBox/);
  assert.match(serviceSource, /What should we improve\?/);
  assert.match(serviceSource, /Later/);
  assert.match(serviceSource, /Don't ask again/);
  assert.match(
    serviceSource,
    /marketplace\.visualstudio\.com\/items\?itemName=wonderertech\.documint/,
  );
  assert.match(serviceSource, /github\.com\/Wonderer-Tech\/documint\/issues\/new/);
  assert.match(serviceSource, /globalState/);
});
