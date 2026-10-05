export const REVIEW_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReviewPromptState {
  successfulGenerations: number;
  firstPromptShown?: boolean;
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
    firstPromptShown:
      record.firstPromptShown === true || lastPromptAt !== undefined,
    lastPromptAt,
    completed: record.completed === true,
    disabled: record.disabled === true,
  };
}

export function isReviewPromptDue(
  value: unknown,
  now = Date.now(),
): boolean {
  const state = normalizeReviewPromptState(value);
  if (state.completed || state.disabled) {
    return false;
  }

  // Fresh DocuMint state: show once on the first activation.
  if (!state.firstPromptShown) {
    return true;
  }

  const safeNow =
    Number.isFinite(now) && now >= 0 ? Math.floor(now) : Date.now();
  return (
    state.lastPromptAt === undefined ||
    safeNow - state.lastPromptAt >= REVIEW_PROMPT_COOLDOWN_MS
  );
}

export function markReviewPromptShown(
  value: unknown,
  now = Date.now(),
): ReviewPromptState {
  const state = normalizeReviewPromptState(value);
  const safeNow =
    Number.isFinite(now) && now >= 0 ? Math.floor(now) : Date.now();
  return {
    ...state,
    firstPromptShown: true,
    lastPromptAt: safeNow,
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

  if (!isReviewPromptDue(state, now)) {
    return { state, shouldPrompt: false };
  }

  return {
    state,
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
