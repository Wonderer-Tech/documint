import { AsyncLocalStorage } from "async_hooks";

export type ContextWindowMetadataSource = "api" | "estimated";

export function resolveRequestContextWindow(
  explicitContextWindow: number | undefined,
  providerContextWindow: number,
): number {
  if (
    Number.isFinite(explicitContextWindow) &&
    (explicitContextWindow ?? 0) > 0
  ) {
    return Math.floor(explicitContextWindow!);
  }

  if (Number.isFinite(providerContextWindow) && providerContextWindow > 0) {
    return Math.floor(providerContextWindow);
  }

  return 8192;
}

export function resolveMetadataContextWindow(
  metadataContextWindow: number | undefined,
  metadataSource: ContextWindowMetadataSource,
  providerContextWindow: number,
): number {
  const providerWindow = resolveRequestContextWindow(
    undefined,
    providerContextWindow,
  );

  if (
    !Number.isFinite(metadataContextWindow) ||
    (metadataContextWindow ?? 0) <= 0
  ) {
    return providerWindow;
  }

  const metadataWindow = Math.floor(metadataContextWindow!);
  return metadataSource === "api"
    ? metadataWindow
    : Math.max(metadataWindow, providerWindow);
}

export function hasExplicitContextWindow(
  contextWindow: number | undefined,
): boolean {
  return Number.isFinite(contextWindow) && (contextWindow ?? 0) > 0;
}

export class RequestContextWindowScope {
  private storage = new AsyncLocalStorage<number>();

  current(): number | undefined {
    return this.storage.getStore();
  }

  run<T>(contextWindow: number, operation: () => T): T {
    const normalized = resolveRequestContextWindow(contextWindow, 8192);
    return this.storage.run(normalized, operation);
  }
}
