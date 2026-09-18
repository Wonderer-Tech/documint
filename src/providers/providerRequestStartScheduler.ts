export type RequestStartDelay = (milliseconds: number) => Promise<void>;

/**
 * Serializes provider request-start reservations without reserving time for a
 * request that is cancelled before it actually starts.
 */
export class ProviderRequestStartScheduler {
  private queue: Promise<void> = Promise.resolve();
  private lastRequestStart = 0;

  constructor(private readonly now: () => number = Date.now) {}

  waitForSlot(
    delayMs: number,
    wait: RequestStartDelay,
    isCancelled: () => boolean = () => false,
  ): Promise<void> {
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
      return Promise.resolve();
    }

    const normalizedDelay = Math.floor(delayMs);
    const task = this.queue.then(async () => {
      this.throwIfCancelled(isCancelled);

      const waitMs = Math.max(
        0,
        this.lastRequestStart + normalizedDelay - this.now(),
      );
      if (waitMs > 0) {
        await wait(waitMs);
      }

      this.throwIfCancelled(isCancelled);
      this.lastRequestStart = this.now();
    });

    // A cancelled/failed waiter must not poison the queue for later requests.
    this.queue = task.catch(() => undefined);
    return task;
  }

  private throwIfCancelled(isCancelled: () => boolean): void {
    if (isCancelled()) {
      throw new Error("Generation cancelled");
    }
  }
}
