import { describe, expect, test } from 'bun:test';
import { FixedWindowRateLimiter } from './fixed-window';

describe('fixed-window admission', () => {
  test('supports an injected clock starting at zero and waits for the sixty-first admission', async () => {
    let now = 0;
    const waits: number[] = [];
    const limiter = new FixedWindowRateLimiter({
      requests: 60,
      windowMs: 60_000,
      now: () => now,
      sleep: async (delay) => {
        waits.push(delay);
        now += delay;
      },
    });
    for (let i = 0; i < 60; i++) await limiter.acquire();
    expect(waits).toEqual([]);
    await limiter.acquire();
    expect(waits).toEqual([60_000]);
  });

  test('shares sixty tokens atomically across concurrent admissions', async () => {
    let now = 0;
    const waits: Array<() => void> = [];
    const admitted: number[] = [];
    const limiter = new FixedWindowRateLimiter({
      requests: 60,
      windowMs: 60_000,
      now: () => now,
      sleep: () => new Promise<void>((resolve) => waits.push(resolve)),
    });
    const acquisitions = Array.from({ length: 61 }, async () => {
      await limiter.acquire();
      admitted.push(now);
    });
    await Bun.sleep(0);
    expect(admitted).toEqual(Array(60).fill(0));
    expect(waits).toHaveLength(1);
    now = 60_000;
    for (const resolve of waits.splice(0)) resolve();
    await Promise.all(acquisitions);
    expect(admitted[60]).toBe(60_000);
    expect(waits).toEqual([]);
  });

  test('shares the longest cooldown and returns not-before when it exceeds an admission deadline', async () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({
      requests: 60,
      windowMs: 60_000,
      now: () => now,
      sleep: async (delay) => {
        now += delay;
      },
    });
    limiter.deferUntil(20_000);
    limiter.deferUntil(8_000);
    await expect(limiter.acquire({ deadlineAt: 10_000 })).rejects.toMatchObject(
      { retryNotBefore: 20_000 }
    );
    expect(now).toBe(0);
    await limiter.acquire({ deadlineAt: 30_000 });
    expect(now).toBe(20_000);
  });

  test('checks each admission deadline independently of another long admission wait', async () => {
    let now = 170_000;
    const waits: Array<() => void> = [];
    const limiter = new FixedWindowRateLimiter({
      requests: 60,
      windowMs: 60_000,
      now: () => now,
      sleep: () => new Promise<void>((resolve) => waits.push(resolve)),
    });
    limiter.deferUntil(320_000);
    const later = limiter.acquire({ deadlineAt: 350_000 });
    await Bun.sleep(0);
    let earlierError: unknown;
    const earlier = limiter.acquire({ deadlineAt: 180_000 }).catch((error) => {
      earlierError = error;
    });
    await Bun.sleep(0);
    now = 181_000;
    try {
      expect(earlierError).toMatchObject({ retryNotBefore: 320_000 });
    } finally {
      now = 320_000;
      for (const resolve of waits.splice(0)) resolve();
      await Promise.all([earlier, later]);
    }
    expect(waits).toEqual([]);
  });

  test('retains serial task scheduling for existing API consumers', async () => {
    const limiter = new FixedWindowRateLimiter({
      requests: 60,
      windowMs: 60_000,
    });
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started: number[] = [];
    const first = limiter.schedule(async () => {
      started.push(1);
      await blocked;
    });
    const second = limiter.schedule(async () => {
      started.push(2);
    });
    await Bun.sleep(0);
    expect(started).toEqual([1]);
    release();
    await Promise.all([first, second]);
    expect(started).toEqual([1, 2]);
  });
});
