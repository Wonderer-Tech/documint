import * as vscode from "vscode";
import {
  completeReviewPrompt,
  disableReviewPrompt,
  isReviewPromptDue,
  markReviewPromptShown,
  recordSuccessfulGenerationForReview,
  type ReviewPromptState,
} from "./reviewPromptPolicy";

const REVIEW_STATE_KEY = "documint.reviewPrompt.v1";
const MARKETPLACE_REVIEW_URL =
  "https://marketplace.visualstudio.com/items?itemName=wonderertech.documint&ssr=false#review-details";
const FEEDBACK_ISSUE_URL =
  "https://github.com/Wonderer-Tech/documint/issues/new";

export class ReviewPromptService {
  private developmentStatePrepared = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async shouldShowOnActivation(): Promise<boolean> {
    if (
      this.context.extensionMode === vscode.ExtensionMode.Development &&
      !this.developmentStatePrepared
    ) {
      this.developmentStatePrepared = true;
      await this.context.globalState.update(REVIEW_STATE_KEY, undefined);
      console.log(
        "[Documint] review card: reset state for Extension Development Host",
      );
    }

    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    return isReviewPromptDue(current);
  }

  public async recordSuccessfulGeneration(): Promise<boolean> {
    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    const decision = recordSuccessfulGenerationForReview(current);

    await this.context.globalState.update(REVIEW_STATE_KEY, decision.state);
    return decision.shouldPrompt;
  }

  public async markPresented(): Promise<void> {
    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    if (!isReviewPromptDue(current)) {
      return;
    }

    await this.context.globalState.update(
      REVIEW_STATE_KEY,
      markReviewPromptShown(current),
    );
  }

  public async reviewOnMarketplace(_rating?: number): Promise<void> {
    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    await this.context.globalState.update(
      REVIEW_STATE_KEY,
      completeReviewPrompt(current),
    );

    await vscode.env.openExternal(vscode.Uri.parse(MARKETPLACE_REVIEW_URL));
  }

  public async sendFeedback(
    feedback: string,
    rating?: number,
  ): Promise<boolean> {
    const normalizedFeedback = feedback.trim();
    if (!normalizedFeedback) {
      return false;
    }

    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    await this.context.globalState.update(
      REVIEW_STATE_KEY,
      completeReviewPrompt(current),
    );

    const issue = new URL(FEEDBACK_ISSUE_URL);
    issue.searchParams.set("title", "DocuMint feedback");
    issue.searchParams.set(
      "body",
      [
        "## What should we improve?",
        "",
        normalizedFeedback,
        "",
        "## Rating",
        "",
        normalizeRating(rating)
          ? String(normalizeRating(rating)) + " / 5"
          : "Not provided",
        "",
        "---",
        "Submitted from the DocuMint sidebar feedback card.",
      ].join("\n"),
    );

    await vscode.env.openExternal(vscode.Uri.parse(issue.toString()));
    return true;
  }

  public async postpone(): Promise<void> {
    // The cooldown begins when the card is presented, so Later only hides it.
  }

  public async disable(): Promise<void> {
    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    await this.context.globalState.update(
      REVIEW_STATE_KEY,
      disableReviewPrompt(current),
    );
  }
}

function normalizeRating(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  const rating = Math.floor(value as number);
  if (rating < 1 || rating > 5) {
    return undefined;
  }
  return rating;
}
