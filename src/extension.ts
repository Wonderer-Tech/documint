import * as vscode from "vscode";
import {
  activate as activateBase,
  deactivate as deactivateBase,
} from "./extensionBase";
import {
  resolveGenerationCustomEndpointPolicy,
  runWithTemporaryLocalCustomConsent,
  type GenerationCommandPayloadLike,
} from "./extensionPolicy";

const GENERATION_COMMANDS = new Set([
  "aiDocGenerator.generateDocumentation",
  "aiDocGenerator.pickAndGenerateFile",
  "aiDocGenerator.pickAndGenerateFolder",
]);

/**
 * Public extension entry point.
 *
 * The existing command implementation remains isolated in extensionBase. While
 * it registers generation commands, this boundary wraps those handlers with the
 * canonical custom-endpoint policy so command-palette, sidebar, and programmatic
 * invocations all enforce the same transport/URL rules before generation starts.
 */
export function activate(context: vscode.ExtensionContext): void {
  const commands = vscode.commands as unknown as {
    registerCommand: typeof vscode.commands.registerCommand;
  };
  const originalRegisterCommand = commands.registerCommand;

  commands.registerCommand = ((
    command: string,
    callback: (...args: unknown[]) => unknown,
    thisArg?: unknown,
  ) => {
    if (!GENERATION_COMMANDS.has(command)) {
      return originalRegisterCommand.call(
        vscode.commands,
        command,
        callback,
        thisArg,
      );
    }

    const guardedCallback = async (...args: unknown[]) => {
      const payload = asGenerationPayload(args[0]);
      const policy = resolveGenerationCustomEndpointPolicy(payload);
      if (!policy) {
        return callback.apply(thisArg, args);
      }

      if (!policy.valid) {
        await vscode.window.showErrorMessage(
          policy.reason ?? "Custom Endpoint URL is invalid.",
        );
        return undefined;
      }

      if (!policy.isLocal) {
        return callback.apply(thisArg, args);
      }

      return runWithTemporaryLocalCustomConsent(context, () =>
        callback.apply(thisArg, args),
      );
    };

    return originalRegisterCommand.call(
      vscode.commands,
      command,
      guardedCallback,
    );
  }) as typeof vscode.commands.registerCommand;

  try {
    activateBase(context);
  } finally {
    commands.registerCommand = originalRegisterCommand;
  }
}

export function deactivate(): void {
  deactivateBase();
}

function asGenerationPayload(value: unknown): GenerationCommandPayloadLike | undefined {
  return typeof value === "object" && value !== null
    ? (value as GenerationCommandPayloadLike)
    : undefined;
}
