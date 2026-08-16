// Weekly freeze on data mutations and external fetches around the 12:00 UTC
// rating processor run. https://github.com/osu-tournament-rating/otr-web/issues/763

/** Start of the window, in minutes past midnight UTC (11:45 UTC). */
export const MAINTENANCE_WINDOW_START_UTC_MINUTES = 11 * 60 + 45;

/** End of the window, in minutes past midnight UTC (12:15 UTC). */
export const MAINTENANCE_WINDOW_END_UTC_MINUTES = 12 * 60 + 15;

/** Maintenance window day of week in UTC (Tuesday). */
export const MAINTENANCE_WINDOW_UTC_DAY = 2;

/** Human-readable label for messages and logs. */
export const MAINTENANCE_WINDOW_LABEL = 'Tuesdays 11:45-12:15 UTC';

/** Whether `now` is inside the window; start inclusive, end exclusive, all UTC. */
export function isWithinMaintenanceWindow(now: Date): boolean {
  if (now.getUTCDay() !== MAINTENANCE_WINDOW_UTC_DAY) {
    return false;
  }

  const minutesUtc = now.getUTCHours() * 60 + now.getUTCMinutes();

  return (
    minutesUtc >= MAINTENANCE_WINDOW_START_UTC_MINUTES &&
    minutesUtc < MAINTENANCE_WINDOW_END_UTC_MINUTES
  );
}

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

/** Whether the processor has not rebuilt `player_ratings` since the last window start. */
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
