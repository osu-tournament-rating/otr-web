import { describe, expect, it, mock } from 'bun:test';

import { createRatingRecalculationTracker } from '../window';

/** Last week's run, stale once this week's window opens. */
const LAST_WEEK_RUN = new Date('2025-12-30T12:04:00Z');
/** This week's run, committed before the old 12:15 end. */
const THIS_WEEK_RUN = new Date('2026-01-06T12:05:00Z');

const createClock = (start: string) => {
  let current = new Date(start);

  return {
    now: () => current,
    set: (value: string) => {
      current = new Date(value);
    },
  };
};

/** A fake `player_ratings` reader whose latest `created` the test controls. */
const createRatings = (latest: Date | null) => {
  const ratings = {
    latest,
    read: mock(async () => ratings.latest),
  };

  return ratings;
};

const createTracker = (
  clock: ReturnType<typeof createClock>,
  readLatestRatingCreated: () => Promise<Date | null>,
  onRecheckError?: (error: unknown) => void
) =>
  createRatingRecalculationTracker({
    readLatestRatingCreated,
    clock: clock.now,
    recheckIntervalMs: 15_000,
    recheckWaitMs: 5,
    onRecheckError,
  });

describe('createRatingRecalculationTracker', () => {
  it('is pending inside the window before the processor writes', async () => {
    const clock = createClock('2026-01-06T11:50:00Z');
    const ratings = createRatings(LAST_WEEK_RUN);
    const tracker = createTracker(clock, ratings.read);

    expect(await tracker.isPending()).toBe(true);
  });

  it('ends right after the processor writes, before 12:15', async () => {
    const clock = createClock('2026-01-06T11:50:00Z');
    const ratings = createRatings(LAST_WEEK_RUN);
    const tracker = createTracker(clock, ratings.read);

    expect(await tracker.isPending()).toBe(true);

    ratings.latest = THIS_WEEK_RUN;
    clock.set('2026-01-06T12:05:30Z');

    expect(await tracker.isPending()).toBe(false);
  });

  it('stays pending after 12:15 when the processor has not written', async () => {
    const clock = createClock('2026-01-06T11:50:00Z');
    const ratings = createRatings(LAST_WEEK_RUN);
    const tracker = createTracker(clock, ratings.read);

    expect(await tracker.isPending()).toBe(true);

    clock.set('2026-01-06T12:30:00Z');
    expect(await tracker.isPending()).toBe(true);

    clock.set('2026-01-08T09:00:00Z');
    expect(await tracker.isPending()).toBe(true);
    expect(ratings.read).toHaveBeenCalledTimes(3);
  });

  it('is inactive outside the window and reads nothing until the next start', async () => {
    const clock = createClock('2026-01-08T09:00:00Z');
    const ratings = createRatings(THIS_WEEK_RUN);
    const tracker = createTracker(clock, ratings.read);

    expect(await tracker.isPending()).toBe(false);

    clock.set('2026-01-13T11:44:59Z');
    expect(await tracker.isPending()).toBe(false);
    expect(ratings.read).toHaveBeenCalledTimes(1);

    clock.set('2026-01-13T11:45:00Z');
    expect(await tracker.isPending()).toBe(true);
    expect(ratings.read).toHaveBeenCalledTimes(2);
  });

  it('is inactive when there are no ratings', async () => {
    const clock = createClock('2026-01-06T12:00:00Z');
    const ratings = createRatings(null);
    const tracker = createTracker(clock, ratings.read);

    expect(await tracker.isPending()).toBe(false);

    clock.set('2026-01-13T11:50:00Z');
    expect(await tracker.isPending()).toBe(false);
  });

  it('reads at most once per interval while pending', async () => {
    const clock = createClock('2026-01-06T11:50:00Z');
    const ratings = createRatings(LAST_WEEK_RUN);
    const tracker = createTracker(clock, ratings.read);

    await Promise.all([tracker.isPending(), tracker.isPending()]);
    clock.set('2026-01-06T11:50:14Z');
    expect(await tracker.isPending()).toBe(true);
    expect(ratings.read).toHaveBeenCalledTimes(1);

    clock.set('2026-01-06T11:50:15Z');
    expect(await tracker.isPending()).toBe(true);
    expect(ratings.read).toHaveBeenCalledTimes(2);
  });

  it('stays pending without waiting while a read is blocked on the processor', async () => {
    const clock = createClock('2026-01-06T11:50:00Z');
    let latest: Date | null = LAST_WEEK_RUN;
    let commit: (() => void) | undefined;
    let blocked = false;
    const read = mock(async () => {
      if (blocked) {
        await new Promise<void>((resolve) => {
          commit = resolve;
        });
      }

      return latest;
    });
    const tracker = createTracker(clock, read);

    expect(await tracker.isPending()).toBe(true);

    blocked = true;
    clock.set('2026-01-06T12:04:00Z');
    expect(await tracker.isPending()).toBe(true);
    expect(await tracker.isPending()).toBe(true);
    expect(read).toHaveBeenCalledTimes(2);

    latest = THIS_WEEK_RUN;
    commit?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await tracker.isPending()).toBe(false);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('keeps the pending result when a re-read fails', async () => {
    const clock = createClock('2026-01-06T11:50:00Z');
    const failure = new Error('connection refused');
    let fail = false;
    const read = async () => {
      if (fail) {
        throw failure;
      }

      return LAST_WEEK_RUN;
    };
    const onRecheckError = mock(() => {});
    const tracker = createTracker(clock, read, onRecheckError);

    expect(await tracker.isPending()).toBe(true);

    fail = true;
    clock.set('2026-01-06T12:00:00Z');
    expect(await tracker.isPending()).toBe(true);
    expect(onRecheckError).toHaveBeenCalledWith(failure);
  });

  it('rejects when the first read fails', async () => {
    const clock = createClock('2026-01-06T11:50:00Z');
    const tracker = createTracker(clock, async () => {
      throw new Error('connection refused');
    });

    await expect(tracker.isPending()).rejects.toThrow('connection refused');
  });
});
