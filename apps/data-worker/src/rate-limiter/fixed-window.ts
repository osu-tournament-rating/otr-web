export interface RateLimiter {
  schedule<T>(task: () => Promise<T>): Promise<T>;
}

const sleep = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

export interface FixedWindowRateLimiterOptions {
  requests: number;
  windowMs: number;
  now?: () => number;
}

/**
 * Fixed-window rate limiter that allows up to N requests within a window.
 * Tasks are queued to preserve ordering and ensure backpressure when the
 * configured budget is exhausted.
 */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly requests: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  private windowStart = 0;
  private executedInWindow = 0;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(options: FixedWindowRateLimiterOptions) {
    const { requests, windowMs, now } = options;

    if (!Number.isFinite(requests) || requests <= 0) {
      throw new Error('requests must be a positive number');
    }

    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error('windowMs must be a positive number');
    }

    this.requests = Math.floor(requests);
    this.windowMs = Math.floor(windowMs);
    this.now = now ?? Date.now;
  }

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      await this.ensureAvailability();
      try {
        return await task();
      } finally {
        // no-op; accounting handled in ensureAvailability
      }
    };

    const execution = this.tail.then(run, run);
    this.tail = execution.then(
      () => undefined,
      () => undefined
    );

    return execution;
  }

  private async ensureAvailability(): Promise<void> {
    while (true) {
      const now = this.now();

      if (this.windowStart === 0 || now - this.windowStart >= this.windowMs) {
        this.windowStart = now;
        this.executedInWindow = 0;
      }

      if (this.executedInWindow < this.requests) {
        this.executedInWindow += 1;
        return;
      }

      const waitMs = this.windowMs - (now - this.windowStart);
      await sleep(waitMs > 0 ? waitMs : 0);
    }
  }
}
