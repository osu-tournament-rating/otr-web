/**
 * Daily maintenance window during which tournament data must not change.
 *
 * The osu! rating processor runs at 12:00 UTC. We freeze data mutations and
 * external fetches for fifteen minutes either side of that run so the public
 * data archives stay consistent with the data the processor operates on.
 *
 * See https://github.com/osu-tournament-rating/otr-web/issues/763.
 */

/** Start of the window, in minutes past midnight UTC (11:45 UTC). */
export const MAINTENANCE_WINDOW_START_UTC_MINUTES = 11 * 60 + 45;

/** End of the window, in minutes past midnight UTC (12:15 UTC). */
export const MAINTENANCE_WINDOW_END_UTC_MINUTES = 12 * 60 + 15;

/** Human-readable label for messages and logs. */
export const MAINTENANCE_WINDOW_LABEL = '11:45–12:15 UTC';

/**
 * Returns whether the supplied instant falls within the daily maintenance
 * window. The start boundary is inclusive and the end boundary is exclusive.
 *
 * @param now Instant to evaluate.
 */
export function isWithinMaintenanceWindow(now: Date): boolean {
  const minutesUtc = now.getUTCHours() * 60 + now.getUTCMinutes();

  return (
    minutesUtc >= MAINTENANCE_WINDOW_START_UTC_MINUTES &&
    minutesUtc < MAINTENANCE_WINDOW_END_UTC_MINUTES
  );
}
