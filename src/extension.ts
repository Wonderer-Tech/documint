import * as vscode from "vscode";
import { SidebarProvider } from "./views/sidebarProvider";
import { SecretStorageManager } from "./config/secretStorage";
import {
  DocGeneratorService,
  GeneratedOutputPaths,
} from "./services/docGenerator";
import { DocumentationError } from "./types";

export function activate(context: vscode.ExtensionContext) {
  const secretManager = SecretStorageManager.getInstance(context);

  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    secretManager,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "aiDocGenerator.sidebar",
      sidebarProvider,
    ),
  );

  const docGenerator = new DocGeneratorService(context, secretManager);

  // Check API key status on startup for the configured provider
  const configuredProvider =
    vscode.workspace
      .getConfiguration("aiDocGenerator")
      .get<string>("aiProvider") || "openai";
  secretManager.getApiKey(configuredProvider).then((apiKey) => {
    sidebarProvider.updateApiKeyStatus(!!apiKey);
  });

  // ── Commands ───────────────────────────────────────────────────────────────

  // ── Shared generation runner ───────────────────────────────────────────────
  async function runGeneration(
    payload: {
      provider?: string;
      model?: string;
      depth?: string;
      outputFormat?: string;
      targetPaths?: string[];
      scope?: string;
    } = {},
  ) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }
    const workspaceFolder = workspaceFolders[0];

    docGenerator.setProgressCallback((progress) => {
      sidebarProvider.updateProgress(progress);
      sidebarProvider.addLogEntry(progress.message || "Processing...", "info");
    });

    sidebarProvider.setGeneratingState(true);

    try {
      const outputPaths: GeneratedOutputPaths =
        await docGenerator.generateDocumentation(workspaceFolder, {
          provider: payload.provider,
          model: payload.model,
          depth: payload.depth as "basic" | "standard" | "comprehensive",
          outputFormat:
            (payload.outputFormat as "markdown" | "html" | "both") || "both",
          scope:
            (payload.scope as "workspace" | "folder" | "current-file") ??
            "workspace",
          targetPaths: payload.targetPaths,
        });

      sidebarProvider.setGeneratingState(false);
      sidebarProvider.completeGeneration();
      sidebarProvider.addLogEntry(
        "Documentation generation completed!",
        "success",
      );

      const actions: string[] = [];
      if (outputPaths.html) actions.push("Open HTML");
      if (outputPaths.markdown) actions.push("Open Markdown");

      const fileCount =
        (outputPaths.html ? 1 : 0) + (outputPaths.markdown ? 1 : 0);
      vscode.window
        .showInformationMessage(
          `Documentation generated successfully (${fileCount} file${fileCount > 1 ? "s" : ""})`,
          ...actions,
        )
        .then((selection) => {
          if (selection === "Open HTML" && outputPaths.html) {
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.file(outputPaths.html),
            );
          } else if (selection === "Open Markdown" && outputPaths.markdown) {
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.file(outputPaths.markdown),
            );
          }
        })
        .then(undefined, (err) =>
          console.error("[Documint] showInformationMessage error:", err),
        );
    } catch (error) {
      const docError =
        error instanceof DocumentationError
          ? error
          : new DocumentationError(
              error instanceof Error ? error.message : String(error),
              "api",
            );
      sidebarProvider.setGeneratingState(false);
      sidebarProvider.reportError(docError.message);
      sidebarProvider.addLogEntry(`Error: ${docError.message}`, "error");
      vscode.window.showErrorMessage(
        `Documentation generation failed: ${docError.message}`,
      );
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocGenerator.generateDocumentation",
      async (payload?: {
        provider?: string;
        model?: string;
        depth?: string;
        outputFormat?: string;
        scope?: string;
        targetPaths?: string[];
      }) => {
        await runGeneration(payload ?? {});
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aiDocGenerator.cancelGeneration", () => {
      sidebarProvider.reportError("Generation cancelled by user");
      sidebarProvider.addLogEntry("Generation cancelled by user", "info");
    }),
  );

  // ── Pick a single file then generate docs for it ───────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocGenerator.pickAndGenerateFile",
      async (payload?: {
        provider?: string;
        model?: string;
        depth?: string;
        outputFormat?: string;
      }) => {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          openLabel: "Generate Docs for This File",
          filters: {
            "Source Files": [
              "ts",
              "tsx",
              "js",
              "jsx",
              "py",
              "java",
              "go",
              "rs",
              "rb",
              "cs",
              "cpp",
              "c",
              "kt",
              "swift",
              "php",
            ],
          },
        });
        if (!uris || uris.length === 0) {
          sidebarProvider.setGeneratingState(false);
          return;
        }
        await runGeneration({
          ...payload,
          scope: "current-file",
          targetPaths: [uris[0].fsPath],
        });
      },
    ),
  );

  // ── Pick a folder then generate docs for all files inside it ──────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocGenerator.pickAndGenerateFolder",
      async (payload?: {
        provider?: string;
        model?: string;
        depth?: string;
        outputFormat?: string;
      }) => {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: "Generate Docs for This Folder",
        });
        if (!uris || uris.length === 0) {
          sidebarProvider.setGeneratingState(false);
          return;
        }
        await runGeneration({
          ...payload,
          scope: "folder",
          targetPaths: [uris[0].fsPath],
        });
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocGenerator.configureApiKey",
      async (provider?: string) => {
        const targetProvider = provider || "openai";
        const apiKey = await vscode.window.showInputBox({
          prompt: `Enter your ${targetProvider} API Key`,
          placeHolder: targetProvider === "anthropic" ? "sk-ant-..." : "sk-...",
          password: true,
          ignoreFocusOut: true,
        });

        if (apiKey) {
          await secretManager.storeApiKey(targetProvider, apiKey);
          sidebarProvider.updateApiKeyStatus(true);
          vscode.window.showInformationMessage(
            `API Key for ${targetProvider} saved successfully!`,
          );
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocGenerator.updateSettings",
      (_settings) => {
        // Settings are persisted via the sidebar state; no-op here
      },
    ),
  );
}

export function deactivate() {}
