import { AsyncLocalStorage } from "async_hooks";
import { hasExplicitContextWindow } from "../providers/contextWindowPolicy";

export interface GenerationRunContextValue {
  contextWindow?: number;
}

/**
 * Carries run-scoped generation settings across async layers without mutating
 * provider instances. This is primarily used by batched/raw prompt generation,
 * where DocGenerator already knows the run's explicit context-window override
 * but the lower-level raw prompt API does not receive the full file context.
 */
export class GenerationRunContextScope {
  private readonly storage = new AsyncLocalStorage<GenerationRunContextValue>();

  run<T>(
    contextWindow: number | undefined,
    operation: () => T,
  ): T {
    const normalizedWindow = hasExplicitContextWindow(contextWindow)
      ? Math.floor(contextWindow!)
      : undefined;
    return this.storage.run(
      { contextWindow: normalizedWindow },
      operation,
    );
  }

  getContextWindow(): number | undefined {
    return this.storage.getStore()?.contextWindow;
  }
}

export const generationRunContext = new GenerationRunContextScope();
