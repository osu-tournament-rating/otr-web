import {
  rateLimiterRequests,
  rateLimiterQueuedTasks,
  rateLimiterWaitDuration,
  rateLimiterRemainingTokens,
} from '../metrics';

export interface RateLimiter {
  schedule<T>(task: () => Promise<T>): Promise<T>;
}

const sleep = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

export interface FixedWindowRateLimiterOptions {
  requests: number;
  windowMs: number;
  now?: () => number;
  sleep?: (durationMs: number) => Promise<void>;
  logger?: RateLimiterLogger;
  label?: string;
}

export class RateLimiterDeadlineError extends Error {
  constructor(readonly retryNotBefore: number) {
    super('Rate limiter admission exceeds its deadline');
    this.name = 'RateLimiterDeadlineError';
  }
}

interface AdmissionOptions {
  deadlineAt?: number;
}

interface RateLimiterLogger {
  info(message: string, extra?: Record<string, unknown>): void;
}

/** Fixed-window rate limiter; queues tasks in order once the budget is spent. */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly requests: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly sleep: (durationMs: number) => Promise<void>;
  private readonly logger?: RateLimiterLogger;
  private readonly label: string;

  private windowStart: number | undefined;
  private deferredUntil = 0;
  private executedInWindow = 0;
  private pendingTasks = 0;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(options: FixedWindowRateLimiterOptions) {
    const { requests, windowMs, now, logger, label } = options;

    if (!Number.isFinite(requests) || requests <= 0) {
      throw new Error('requests must be a positive number');
    }

    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error('windowMs must be a positive number');
    }

    this.requests = Math.floor(requests);
    this.windowMs = Math.floor(windowMs);
    this.now = now ?? Date.now;
    this.sleep = options.sleep ?? sleep;
    this.logger = logger;
    this.label = label ?? 'fixed-window-rate-limiter';
  }

  deferUntil(timestamp: number): void {
    if (!Number.isFinite(timestamp))
      throw new Error('Rate limiter cooldown must be a finite timestamp');
    this.deferredUntil = Math.max(this.deferredUntil, timestamp);
  }

  acquire(options: AdmissionOptions = {}): Promise<void> {
    return this.execute(async () => {}, options, false);
  }

  schedule<T>(task: () => Promise<T>): Promise<T> {
    return this.execute(task, {}, true);
  }

  private async execute<T>(
    task: () => Promise<T>,
    options: AdmissionOptions,
    serializeTask: boolean
  ): Promise<T> {
    this.pendingTasks++;
    rateLimiterQueuedTasks
      .labels({ limiter: this.label })
      .set(this.pendingTasks);

    const run = async () => {
      try {
        const waitStart = this.now();
        await this.ensureAvailability(options);
        const waitDuration = (this.now() - waitStart) / 1000;

        if (waitDuration > 0.001) {
          rateLimiterWaitDuration
            .labels({ limiter: this.label })
            .observe(waitDuration);
        }

        rateLimiterRequests
          .labels({ limiter: this.label, status: 'allowed' })
          .inc();
        return await task();
      } finally {
        this.pendingTasks--;
        rateLimiterQueuedTasks
          .labels({ limiter: this.label })
          .set(this.pendingTasks);
      }
    };

    // Token checks are synchronous; independent admissions must not queue behind
    // another caller's sleep or they can outlive their own deadline.
    const execution = serializeTask ? this.tail.then(run, run) : run();
    if (serializeTask)
      this.tail = execution.then(
        () => undefined,
        () => undefined
      );

    return execution;
  }

  private async ensureAvailability({
    deadlineAt,
  }: AdmissionOptions): Promise<void> {
    while (true) {
      const now = this.now();

      if (
        this.windowStart === undefined ||
        now - this.windowStart >= this.windowMs
      ) {
        this.windowStart = now;
        this.executedInWindow = 0;
        this.log('Rate limiter window reset', {
          windowMs: this.windowMs,
        });
      }

      const availableAt = Math.max(
        now,
        this.deferredUntil,
        this.executedInWindow < this.requests
          ? now
          : this.windowStart + this.windowMs
      );
      if (deadlineAt !== undefined && availableAt >= deadlineAt)
        throw new RateLimiterDeadlineError(availableAt);

      if (availableAt <= now) {
        this.executedInWindow += 1;
        rateLimiterRemainingTokens
          .labels({ limiter: this.label })
          .set(this.requests - this.executedInWindow);
        this.log('Rate limiter token consumed', {
          used: this.executedInWindow,
          remaining: this.requests - this.executedInWindow,
        });
        return;
      }

      const sleepDuration = availableAt - now;
      this.log('Rate limiter sleeping for window refill', {
        waitMs: sleepDuration,
      });
      await this.sleep(sleepDuration);
    }
  }

  private log(message: string, extra?: Record<string, unknown>) {
    if (!this.logger) {
      return;
    }

    const details = Object.entries(extra ?? {})
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(' ');

    const line = details ? `${message} | ${details}` : message;
    this.logger.info(`[${this.label}] ${line}`);
  }
}
