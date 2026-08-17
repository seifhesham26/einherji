// Serialises requests to a host with a jittered delay between them.
//
// Fixed intervals are themselves a fingerprint, so the delay is randomised inside
// a band rather than held constant. Concurrency is 1 by design: for scraping,
// being slow and unremarkable beats being fast and blocked.

export interface RateLimiterOptions {
  minDelayMs: number;
  maxDelayMs: number;
}

export class RateLimiter {
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  // Every scheduled task chains onto this, which is what serialises them.
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(options: RateLimiterOptions) {
    this.minDelayMs = options.minDelayMs;
    this.maxDelayMs = options.maxDelayMs;
  }

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const scheduled = this.queue.then(async () => {
      await this.waitForSlot();
      this.lastRequestAt = Date.now();
      return task();
    });

    // Keep the chain alive even when a task rejects, so one failure doesn't
    // wedge every request queued behind it.
    this.queue = scheduled.catch(() => undefined);

    return scheduled;
  }

  private async waitForSlot(): Promise<void> {
    const targetDelay =
      this.minDelayMs + Math.random() * (this.maxDelayMs - this.minDelayMs);
    const elapsed = Date.now() - this.lastRequestAt;
    const remaining = targetDelay - elapsed;
    if (remaining > 0) await sleep(remaining);
  }
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// ATS boards are ordinary public JSON APIs — no need to crawl them slowly.
export const atsRateLimiter = new RateLimiter({ minDelayMs: 200, maxDelayMs: 600 });

// LinkedIn rate-limits by IP and the threshold is undocumented. Start conservative.
export const linkedInRateLimiter = new RateLimiter({ minDelayMs: 2_000, maxDelayMs: 5_000 });
