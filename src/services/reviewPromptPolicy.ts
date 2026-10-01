export const REVIEW_PROMPT_FIRST_SUCCESS_COUNT = 3;
export const REVIEW_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReviewPromptState {
  successfulGenerations: number;
  lastPromptAt?: number;
  completed?: boolean;
  disabled?: boolean;
}

export interface ReviewPromptDecision {
  state: ReviewPromptState;
  shouldPrompt: boolean;
}

export function normalizeReviewPromptState(
  value: unknown,
): ReviewPromptState {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  const successfulGenerations =
    typeof record.successfulGenerations === "number" &&
    Number.isFinite(record.successfulGenerations)
      ? Math.max(0, Math.floor(record.successfulGenerations))
      : 0;

  const lastPromptAt =
    typeof record.lastPromptAt === "number" &&
    Number.isFinite(record.lastPromptAt) &&
    record.lastPromptAt >= 0
      ? Math.floor(record.lastPromptAt)
      : undefined;

  return {
    successfulGenerations,
    lastPromptAt,
    completed: record.completed === true,
    disabled: record.disabled === true,
  };
}

export function recordSuccessfulGenerationForReview(
  value: unknown,
  now = Date.now(),
): ReviewPromptDecision {
  const current = normalizeReviewPromptState(value);
  const state: ReviewPromptState = {
    ...current,
    successfulGenerations: current.successfulGenerations + 1,
  };

  if (state.completed || state.disabled) {
    return { state, shouldPrompt: false };
  }

  if (state.successfulGenerations < REVIEW_PROMPT_FIRST_SUCCESS_COUNT) {
    return { state, shouldPrompt: false };
  }

  const safeNow =
    Number.isFinite(now) && now >= 0 ? Math.floor(now) : Date.now();
  const lastPromptAt = state.lastPromptAt;
  const due =
    lastPromptAt === undefined ||
    safeNow - lastPromptAt >= REVIEW_PROMPT_COOLDOWN_MS;

  if (!due) {
    return { state, shouldPrompt: false };
  }

  return {
    state: {
      ...state,
      lastPromptAt: safeNow,
    },
    shouldPrompt: true,
  };
}

export function completeReviewPrompt(
  value: unknown,
): ReviewPromptState {
  return {
    ...normalizeReviewPromptState(value),
    completed: true,
  };
}

export function disableReviewPrompt(
  value: unknown,
): ReviewPromptState {
  return {
    ...normalizeReviewPromptState(value),
    disabled: true,
  };
}
