import * as vscode from "vscode";
import {
  completeReviewPrompt,
  disableReviewPrompt,
  recordSuccessfulGenerationForReview,
  type ReviewPromptState,
} from "./reviewPromptPolicy";

const REVIEW_STATE_KEY = "documint.reviewPrompt.v1";
const MARKETPLACE_REVIEW_URL =
  "https://marketplace.visualstudio.com/items?itemName=wonderertech.documint&ssr=false#review-details";
const FEEDBACK_ISSUE_URL =
  "https://github.com/Wonderer-Tech/documint/issues/new";

const REVIEW_ACTION = "Rate & Review";
const FEEDBACK_ACTION = "Tell us what to improve";
const LATER_ACTION = "Later";
const DISABLE_ACTION = "Don't ask again";

export class ReviewPromptService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public async recordSuccessfulGeneration(): Promise<void> {
    const current = this.context.globalState.get<ReviewPromptState>(
      REVIEW_STATE_KEY,
    );
    const decision = recordSuccessfulGenerationForReview(current);

    await this.context.globalState.update(REVIEW_STATE_KEY, decision.state);
    if (!decision.shouldPrompt) {
      return;
    }

    const selection = await vscode.window.showInformationMessage(
      "Enjoying DocuMint? Please review us — what should we improve?",
      REVIEW_ACTION,
      FEEDBACK_ACTION,
      LATER_ACTION,
      DISABLE_ACTION,
    );

    if (selection === REVIEW_ACTION) {
      await this.context.globalState.update(
        REVIEW_STATE_KEY,
        completeReviewPrompt(decision.state),
      );
      await vscode.env.openExternal(vscode.Uri.parse(MARKETPLACE_REVIEW_URL));
      return;
    }

    if (selection === FEEDBACK_ACTION) {
      const feedback = await vscode.window.showInputBox({
        prompt: "What should we improve in DocuMint?",
        placeHolder:
          "Tell us what felt confusing, slow, missing, or could be better…",
        ignoreFocusOut: true,
      });
      const normalized = feedback?.trim();
      if (!normalized) {
        return;
      }

      await this.context.globalState.update(
        REVIEW_STATE_KEY,
        completeReviewPrompt(decision.state),
      );

      const issue = new URL(FEEDBACK_ISSUE_URL);
      issue.searchParams.set("title", "DocuMint feedback");
      issue.searchParams.set(
        "body",
        [
          "## What should we improve?",
          "",
          normalized,
          "",
          "---",
          "Submitted from the DocuMint review prompt.",
        ].join("\n"),
      );
      await vscode.env.openExternal(vscode.Uri.parse(issue.toString()));
      return;
    }

    if (selection === DISABLE_ACTION) {
      await this.context.globalState.update(
        REVIEW_STATE_KEY,
        disableReviewPrompt(decision.state),
      );
    }
  }
}
