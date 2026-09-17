import { AsyncLocalStorage } from "async_hooks";

function normalizeTargetPaths(targetPaths?: string[]): string[] | undefined {
  const normalized = targetPaths
    ?.map((value) => value.trim())
    .filter(Boolean);
  return normalized && normalized.length > 0 ? [...normalized] : undefined;
}

/**
 * Keeps picker-selected scan targets scoped to the current async command run.
 * Unlike a mutable module variable, overlapping async work cannot overwrite
 * another run's target list.
 */
export class ScannerRunTargetScope {
  private readonly storage = new AsyncLocalStorage<string[] | undefined>();

  enter(targetPaths?: string[]): void {
    this.storage.enterWith(normalizeTargetPaths(targetPaths));
  }

  current(): string[] | undefined {
    const value = this.storage.getStore();
    return value ? [...value] : undefined;
  }

  run<T>(targetPaths: string[] | undefined, callback: () => T): T {
    return this.storage.run(normalizeTargetPaths(targetPaths), callback);
  }
}

export const scannerRunTargetScope = new ScannerRunTargetScope();
