// Weekly freeze on data mutations and external fetches around the 12:00 UTC
// rating processor run. It opens on the clock and ends when the processor
// publishes new `player_ratings`, with no fixed end.
// https://github.com/osu-tournament-rating/otr-web/issues/763

/** Start of the window, in minutes past midnight UTC (11:45 UTC). */
export const MAINTENANCE_WINDOW_START_UTC_MINUTES = 11 * 60 + 45;

/** Maintenance window day of week in UTC (Tuesday). */
export const MAINTENANCE_WINDOW_UTC_DAY = 2;

/** Human-readable description of the window for messages and logs. */
export const MAINTENANCE_WINDOW_LABEL =
  'from 11:45 UTC on Tuesdays until new ratings are published';

/** Start of the most recent window at or before `now`, when the replica is snapshotted. */
export function latestMaintenanceWindowStart(now: Date): Date {
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() -
        ((now.getUTCDay() - MAINTENANCE_WINDOW_UTC_DAY + 7) % 7),
      Math.floor(MAINTENANCE_WINDOW_START_UTC_MINUTES / 60),
      MAINTENANCE_WINDOW_START_UTC_MINUTES % 60
    )
  );

  if (start.getTime() > now.getTime()) {
    start.setUTCDate(start.getUTCDate() - 7);
  }

  return start;
}

/**
 * Whether the processor has not rebuilt `player_ratings` since the last window
 * start. This is the maintenance window: it has no fixed end, so a failed run
 * keeps it open until a run succeeds. No ratings at all means inactive.
 */
export function isRatingRecalculationPending(
  now: Date,
  latestRatingCreated: Date | null
): boolean {
  if (!latestRatingCreated) {
    return false;
  }

  return (
    latestRatingCreated.getTime() < latestMaintenanceWindowStart(now).getTime()
  );
}

/** Reads the most recent `player_ratings.created`, or null when there are none. */
export type LatestRatingCreatedReader = () => Promise<Date | null>;

/** How long a pending result is trusted before the database is read again. */
export const RATING_RECHECK_INTERVAL_MS = 15_000;

/** How long a caller waits on a re-read before it falls back to the pending result. */
export const RATING_RECHECK_WAIT_MS = 1_000;

export interface RatingRecalculationTrackerOptions {
  readLatestRatingCreated: LatestRatingCreatedReader;
  recheckIntervalMs?: number;
  recheckWaitMs?: number;
  /** Reports a failed re-read; the last result stays in use. */
  onRecheckError?: (error: unknown) => void;
  clock?: () => Date;
}

export interface RatingRecalculationTracker {
  /** Whether the window is active, per `isRatingRecalculationPending`. */
  isPending(): Promise<boolean>;
}

/**
 * Tracks `isRatingRecalculationPending` for callers that check often (the
 * banner, admin edits, the data worker) without reading the database each time.
 *
 * `player_ratings.created` only moves forward, so a read that shows ratings
 * from after the latest window start stays valid until the next window start:
 * outside the window the tracker answers from memory. While pending, it reads
 * again at most every `recheckIntervalMs`. A read blocks while the processor
 * holds its lock on `player_ratings`, so a caller waits at most
 * `recheckWaitMs` for it and otherwise gets the last result, which is pending.
 * Only the first call in a process waits for its read in full.
 */
export function createRatingRecalculationTracker({
  readLatestRatingCreated,
  recheckIntervalMs = RATING_RECHECK_INTERVAL_MS,
  recheckWaitMs = RATING_RECHECK_WAIT_MS,
  onRecheckError,
  clock = () => new Date(),
}: RatingRecalculationTrackerOptions): RatingRecalculationTracker {
  type Observation = { latestRatingCreated: Date | null; readAt: number };

  let observed: Observation | null = null;
  let inflight: Promise<Observation> | null = null;

  const read = (): Promise<Observation> => {
    inflight ??= (async () => {
      try {
        const readAt = clock().getTime();
        const latestRatingCreated = await readLatestRatingCreated();
        observed = { latestRatingCreated, readAt };
        return observed;
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  };

  /** The re-read result if it lands within `ms`, else null. */
  const readWithin = async (ms: number): Promise<Observation | null> => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        read().catch((error: unknown) => {
          onRecheckError?.(error);
          return null;
        }),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), ms);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    async isPending() {
      const last = observed ?? (await read());
      const now = clock();

      if (!isRatingRecalculationPending(now, last.latestRatingCreated)) {
        return false;
      }

      if (now.getTime() - last.readAt < recheckIntervalMs) {
        return true;
      }

      const reread = await readWithin(recheckWaitMs);

      return reread
        ? isRatingRecalculationPending(clock(), reread.latestRatingCreated)
        : true;
    },
  };
}
