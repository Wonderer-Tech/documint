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

const REVIEW_ACTION = "Review on Marketplace";
const FEEDBACK_ACTION = "Tell us what to improve";
const LATER_ACTION = "Later";
const DISABLE_ACTION = "Don't ask again";
const PROMPT_DELAY_MS = 1400;

export class ReviewPromptService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public async scheduleDuePromptOnActivation(): Promise<void> {
    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    if (!isReviewPromptDue(current)) {
      return;
    }

    const shown = markReviewPromptShown(current);
    await this.context.globalState.update(REVIEW_STATE_KEY, shown);
    this.schedulePrompt(shown);
  }

  public async recordSuccessfulGeneration(): Promise<void> {
    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    const decision = recordSuccessfulGenerationForReview(current);

    await this.context.globalState.update(REVIEW_STATE_KEY, decision.state);
    if (!decision.shouldPrompt) {
      return;
    }

    this.schedulePrompt(decision.state);
  }

  private schedulePrompt(state: ReviewPromptState): void {
    setTimeout(() => {
      void this.showPrompt(state).catch((error) => {
        console.error("[Documint] review prompt error:", error);
      });
    }, PROMPT_DELAY_MS);
  }

  private async showPrompt(state: ReviewPromptState): Promise<void> {
    const selection = await vscode.window.showInformationMessage(
      "If you love DocuMint and it genuinely helps your work, please review us on the Marketplace.",
      REVIEW_ACTION,
      FEEDBACK_ACTION,
      LATER_ACTION,
      DISABLE_ACTION,
    );

    if (selection === REVIEW_ACTION) {
      const latest =
        this.context.globalState.get<ReviewPromptState>(REVIEW_STATE_KEY) ??
        state;
      await this.context.globalState.update(
        REVIEW_STATE_KEY,
        completeReviewPrompt(latest),
      );
      await vscode.env.openExternal(vscode.Uri.parse(MARKETPLACE_REVIEW_URL));
      return;
    }

    if (selection === FEEDBACK_ACTION) {
      const latest =
        this.context.globalState.get<ReviewPromptState>(REVIEW_STATE_KEY) ??
        state;
      await this.context.globalState.update(
        REVIEW_STATE_KEY,
        completeReviewPrompt(latest),
      );

      const issue = new URL(FEEDBACK_ISSUE_URL);
      issue.searchParams.set("title", "DocuMint feedback");
      issue.searchParams.set(
        "body",
        [
          "## What should we improve?",
          "",
          "<!-- Tell us what felt confusing, slow, missing, or could be better. -->",
          "",
          "## What worked well?",
          "",
          "<!-- Optional: tell us what you liked so we do not break it. -->",
        ].join("\n"),
      );
      await vscode.env.openExternal(vscode.Uri.parse(issue.toString()));
      return;
    }

    if (selection === DISABLE_ACTION) {
      const latest =
        this.context.globalState.get<ReviewPromptState>(REVIEW_STATE_KEY) ??
        state;
      await this.context.globalState.update(
        REVIEW_STATE_KEY,
        disableReviewPrompt(latest),
      );
    }
  }
}
