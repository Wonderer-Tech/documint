import * as vscode from "vscode";
import { SidebarProvider } from "./views/sidebarProvider";
import { SecretStorageManager } from "./config/secretStorage";
import {
  DocGeneratorService,
  GeneratedOutputPaths,
} from "./services/docGenerator";
import { sanitizeGeneratedOutputs } from "./services/outputSanitizer";
import { ProviderFactory } from "./providers/providerFactory";
import { setWorkspaceScannerRunTargets } from "./scanner/workspaceScanner";
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
  let activeCancellationSource: vscode.CancellationTokenSource | undefined;

  function resolveRunProvider(provider?: string): string {
    return ProviderFactory.resolveProviderName(provider);
  }

  function isLocalEndpoint(endpoint?: string): boolean {
    if (!endpoint) {
      return false;
    }

    try {
      const url = new URL(endpoint);
      const host = url.hostname.toLowerCase();
      return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host.endsWith(".localhost")
      );
    } catch {
      return false;
    }
  }

  function sendsCodeToExternalProvider(provider: string): boolean {
    if (provider === "custom") {
      const endpoint = vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<string>("customApiEndpoint");
      return !isLocalEndpoint(endpoint);
    }

    return true;
  }

  function resolveTargetWorkspace(
    targetPaths: string[] | undefined,
    workspaceFolders: readonly vscode.WorkspaceFolder[],
  ): vscode.WorkspaceFolder | undefined {
    if (!targetPaths || targetPaths.length === 0) {
      return workspaceFolders[0];
    }

    const resolvedFolders = targetPaths.map((targetPath) =>
      vscode.workspace.getWorkspaceFolder(vscode.Uri.file(targetPath)),
    );
    const first = resolvedFolders[0];
    if (!first) {
      return undefined;
    }

    const firstUri = first.uri.toString();
    if (
      resolvedFolders.some(
        (folder) => !folder || folder.uri.toString() !== firstUri,
      )
    ) {
      return undefined;
    }

    return first;
  }

  async function ensureGenerationAllowed(
    provider: string,
    workspaceFolder: vscode.WorkspaceFolder,
  ): Promise<boolean> {
    if (!vscode.workspace.isTrusted) {
      vscode.window.showErrorMessage(
        "DocuMint requires a trusted workspace before reading project files.",
      );
      return false;
    }

    if (!sendsCodeToExternalProvider(provider)) {
      return true;
    }

    const consentKey = `cloud-consent:${provider}:${workspaceFolder.uri.toString()}`;
    if (context.workspaceState.get<boolean>(consentKey)) {
      return true;
    }

    const selection = await vscode.window.showWarningMessage(
      `DocuMint will send selected source code to ${provider} to generate documentation.`,
      { modal: true },
      "Continue",
    );

    if (selection !== "Continue") {
      sidebarProvider.addLogEntry("Generation cancelled before sending code", "info");
      return false;
    }

    await context.workspaceState.update(consentKey, true);
    return true;
  }

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
      customApiEndpoint?: string;
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

    if (
      activeCancellationSource &&
      !activeCancellationSource.token.isCancellationRequested
    ) {
      vscode.window.showWarningMessage(
        "Documentation generation is already running",
      );
      return;
    }

    const workspaceFolder = resolveTargetWorkspace(
      payload.targetPaths,
      workspaceFolders,
    );
    if (!workspaceFolder) {
      const message =
        "Selected files and folders must belong to the same open workspace folder.";
      sidebarProvider.reportError(message);
      sidebarProvider.addLogEntry(message, "error");
      vscode.window.showErrorMessage(message);
      return;
    }

    const providerName = resolveRunProvider(payload.provider);

    if (providerName === "custom") {
      const configuration = vscode.workspace.getConfiguration("aiDocGenerator");
      const endpoint =
        payload.customApiEndpoint?.trim() ||
        configuration.get<string>("customApiEndpoint")?.trim() ||
        "";

      if (!endpoint) {
        const message =
          "Custom provider requires a Custom Endpoint URL.";
        sidebarProvider.reportError(message);
        sidebarProvider.addLogEntry(message, "error");
        vscode.window.showErrorMessage(message);
        return;
      }

      try {
        const parsed = new URL(endpoint);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Unsupported protocol");
        }
      } catch {
        const message =
          "Custom Endpoint URL must be a valid http or https URL.";
        sidebarProvider.reportError(message);
        sidebarProvider.addLogEntry(message, "error");
        vscode.window.showErrorMessage(message);
        return;
      }

      if (payload.customApiEndpoint?.trim()) {
        await configuration.update(
          "customApiEndpoint",
          endpoint,
          vscode.ConfigurationTarget.Workspace,
        );
      }
    }

    if (!(await ensureGenerationAllowed(providerName, workspaceFolder))) {
      return;
    }

    const cancellationSource = new vscode.CancellationTokenSource();
    activeCancellationSource = cancellationSource;
    docGenerator.setCancellationToken(cancellationSource.token);

    docGenerator.setProgressCallback((progress) => {
      sidebarProvider.updateProgress(progress);
      sidebarProvider.addLogEntry(progress.message || "Processing...", "info");
    });

    sidebarProvider.setGeneratingState(true);
    setWorkspaceScannerRunTargets(payload.targetPaths);

    try {
      const outputPaths: GeneratedOutputPaths =
        await docGenerator.generateDocumentation(workspaceFolder, {
          provider: payload.provider,
          model: payload.model,
          depth: payload.depth as
            | "simple"
            | "basic"
            | "standard"
            | "comprehensive",
          outputFormat:
            (payload.outputFormat as "markdown" | "html" | "both") || "both",
          scope:
            (payload.scope as "workspace" | "folder" | "current-file") ??
            "workspace",
          targetPaths: payload.targetPaths,
        });

      await sanitizeGeneratedOutputs(outputPaths);

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
      const wasCancelled = cancellationSource.token.isCancellationRequested;
      const docError = wasCancelled
        ? new DocumentationError("Generation cancelled by user", "api")
        : error instanceof DocumentationError
          ? error
          : new DocumentationError(
              error instanceof Error ? error.message : String(error),
              "api",
            );
      sidebarProvider.setGeneratingState(false);
      sidebarProvider.reportError(docError.message);
      sidebarProvider.addLogEntry(`Error: ${docError.message}`, "error");
      if (wasCancelled) {
        vscode.window.showInformationMessage("Documentation generation cancelled");
      } else {
        vscode.window.showErrorMessage(
          `Documentation generation failed: ${docError.message}`,
        );
      }
    } finally {
      setWorkspaceScannerRunTargets(undefined);
      if (activeCancellationSource === cancellationSource) {
        activeCancellationSource = undefined;
      }
      cancellationSource.dispose();
    }
  }

  async function clearDocumentationCache() {
    if (
      activeCancellationSource &&
      !activeCancellationSource.token.isCancellationRequested
    ) {
      const message = "Cannot clear cache while documentation generation is running.";
      sidebarProvider.addLogEntry(message, "warning");
      vscode.window.showWarningMessage(message);
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const message = "No workspace folder open";
      sidebarProvider.addLogEntry(message, "error");
      vscode.window.showErrorMessage(message);
      return;
    }

    const cacheFiles = [
      ".documint-cache.json",
      ".documint-visual-cache.json",
    ];
    let deletedCount = 0;

    for (const folder of workspaceFolders) {
      const docsFolder = vscode.Uri.joinPath(folder.uri, "docs");
      for (const cacheFile of cacheFiles) {
        const target = vscode.Uri.joinPath(docsFolder, cacheFile);
        try {
          await vscode.workspace.fs.delete(target, {
            recursive: false,
            useTrash: false,
          });
          deletedCount++;
        } catch {
          // Missing cache files are expected for fresh workspaces.
        }
      }
    }

    const message =
      deletedCount > 0
        ? `Cleared ${deletedCount} documentation cache file${deletedCount === 1 ? "" : "s"}.`
        : "No documentation cache files found.";
    sidebarProvider.addLogEntry(message, deletedCount > 0 ? "success" : "info");
    vscode.window.showInformationMessage(message);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocGenerator.generateDocumentation",
      async (payload?: {
        provider?: string;
        model?: string;
        customApiEndpoint?: string;
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
      if (
        activeCancellationSource &&
        !activeCancellationSource.token.isCancellationRequested
      ) {
        activeCancellationSource.cancel();
        sidebarProvider.addLogEntry("Cancelling generation...", "warning");
        return;
      }

      sidebarProvider.addLogEntry("No active generation to cancel", "info");
    }),
  );

  // ── Pick a single file then generate docs for it ───────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("aiDocGenerator.clearCache", async () => {
      await clearDocumentationCache();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiDocGenerator.pickAndGenerateFile",
      async (payload?: {
        provider?: string;
        model?: string;
        customApiEndpoint?: string;
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
        customApiEndpoint?: string;
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
        const trimmedApiKey = apiKey?.trim();
        if (!trimmedApiKey) {
          return;
        }

        const isValid = await secretManager.validateApiKey(
          targetProvider,
          trimmedApiKey,
        );
        if (!isValid) {
          vscode.window.showErrorMessage(
            `Invalid API key format for ${targetProvider}.`,
          );
          return;
        }

        const stored = await secretManager.storeApiKey(
          targetProvider,
          trimmedApiKey,
        );
        if (!stored) {
          vscode.window.showErrorMessage(
            `Failed to store API key for ${targetProvider}.`,
          );
          return;
        }

        sidebarProvider.updateApiKeyStatus(true);
        vscode.window.showInformationMessage(
          `API Key for ${targetProvider} saved successfully!`,
        );
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
