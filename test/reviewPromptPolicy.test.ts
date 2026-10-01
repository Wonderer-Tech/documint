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

test("review prompt waits for three successful generations", () => {
  const first = recordSuccessfulGenerationForReview(undefined, 1_000);
  assert.equal(first.state.successfulGenerations, 1);
  assert.equal(first.shouldPrompt, false);

  const second = recordSuccessfulGenerationForReview(first.state, 2_000);
  assert.equal(second.state.successfulGenerations, 2);
  assert.equal(second.shouldPrompt, false);

  const third = recordSuccessfulGenerationForReview(second.state, 3_000);
  assert.equal(third.state.successfulGenerations, 3);
  assert.equal(third.shouldPrompt, true);
  assert.equal(third.state.lastPromptAt, 3_000);
});

test("review prompt repeats only after the seven-day cooldown", () => {
  const initial = recordSuccessfulGenerationForReview(
    { successfulGenerations: 2 },
    10_000,
  );
  assert.equal(initial.shouldPrompt, true);

  const tooSoon = recordSuccessfulGenerationForReview(
    initial.state,
    10_000 + REVIEW_PROMPT_COOLDOWN_MS - 1,
  );
  assert.equal(tooSoon.shouldPrompt, false);

  const dueAgain = recordSuccessfulGenerationForReview(
    tooSoon.state,
    10_000 + REVIEW_PROMPT_COOLDOWN_MS,
  );
  assert.equal(dueAgain.shouldPrompt, true);
});

test("review prompt becomes due on activation after seven days", () => {
  const lastPromptAt = 20_000;
  const state = {
    successfulGenerations: 3,
    lastPromptAt,
  };

  assert.equal(
    isReviewPromptDue(state, lastPromptAt + REVIEW_PROMPT_COOLDOWN_MS - 1),
    false,
  );
  assert.equal(
    isReviewPromptDue(state, lastPromptAt + REVIEW_PROMPT_COOLDOWN_MS),
    true,
  );
});


test("review completion and opt-out permanently suppress future prompts", () => {
  const due = recordSuccessfulGenerationForReview(
    { successfulGenerations: 2 },
    5_000,
  );

  const completed = recordSuccessfulGenerationForReview(
    completeReviewPrompt(due.state),
    5_000 + REVIEW_PROMPT_COOLDOWN_MS * 2,
  );
  assert.equal(completed.shouldPrompt, false);
  assert.equal(completed.state.completed, true);

  const disabled = recordSuccessfulGenerationForReview(
    disableReviewPrompt(due.state),
    5_000 + REVIEW_PROMPT_COOLDOWN_MS * 2,
  );
  assert.equal(disabled.shouldPrompt, false);
  assert.equal(disabled.state.disabled, true);
});

test("review prompt state normalization rejects malformed counters and timestamps", () => {
  assert.deepEqual(
    normalizeReviewPromptState({
      successfulGenerations: -8.7,
      lastPromptAt: -50,
      completed: "yes",
      disabled: 1,
    }),
    {
      successfulGenerations: 0,
      lastPromptAt: undefined,
      completed: false,
      disabled: false,
    },
  );
});

test("extension records Local and AI successes and review UI stays explicit", () => {
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
    /reviewPromptService\.scheduleDuePromptOnActivation\(\)/,
  );
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
