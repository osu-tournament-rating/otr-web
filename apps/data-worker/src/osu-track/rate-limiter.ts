export interface RateLimiter {
  schedule<T>(task: () => Promise<T>): Promise<T>;
}

const sleep = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

/**
 * Simple fixed-interval rate limiter that enforces a minimum gap between
 * scheduled tasks. Suitable for low-volume API throttling.
 */
export class FixedIntervalRateLimiter implements RateLimiter {
  private readonly intervalMs: number;
  private nextAvailable = 0;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(requestsPerMinute: number) {
    if (!Number.isFinite(requestsPerMinute) || requestsPerMinute <= 0) {
      throw new Error('requestsPerMinute must be a positive number');
    }

    this.intervalMs = Math.floor(60_000 / requestsPerMinute);
  }

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      const now = Date.now();
      const waitFor = Math.max(0, this.nextAvailable - now);

      if (waitFor > 0) {
        await sleep(waitFor);
      }

      const start = Date.now();
      const result = await task();
      this.nextAvailable = Math.max(start + this.intervalMs, Date.now());
      return result;
    };

    const execution = this.tail.then(run, run);
    this.tail = execution.then(
      () => undefined,
      () => undefined
    );

    return execution;
  }
}
