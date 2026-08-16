import {
  isRatingRecalculationPending,
  isWithinMaintenanceWindow,
} from '@otr/core/maintenance';

/** Forces the window on or off for the e2e suite; honored only when E2E_TEST_AUTH=true. */
const E2E_OVERRIDE_HEADER = 'x-e2e-maintenance-window';

type HeadersLike = Pick<Headers, 'get'>;

const isE2eMaintenanceOverrideEnabled = () =>
  process.env.E2E_TEST_AUTH === 'true';

const isMaintenanceWindowEnabled = () =>
  process.env.MAINTENANCE_WINDOW_ENABLED !== 'false';

export type RatingTimestamps = {
  /** Database clock (inside a transaction: the transaction start time). */
  now: Date;
  /** Most recent `player_ratings.created`, or null when no ratings exist. */
  latestRatingCreated: Date | null;
};

/**
 * Whether the maintenance window is active, after the e2e override header and
 * `MAINTENANCE_WINDOW_ENABLED`. Tracks the recalculation when given rating
 * timestamps, the wall clock without them.
 */
export const resolveMaintenanceWindowActive = (
  headers: HeadersLike,
  ratingTimestamps?: RatingTimestamps
): boolean => {
  if (isE2eMaintenanceOverrideEnabled()) {
    const override = headers.get(E2E_OVERRIDE_HEADER);
    if (override === 'active') {
      return true;
    }
    if (override === 'inactive') {
      return false;
    }
  }

  if (!isMaintenanceWindowEnabled()) {
    return false;
  }

  if (ratingTimestamps) {
    return isRatingRecalculationPending(
      ratingTimestamps.now,
      ratingTimestamps.latestRatingCreated
    );
  }

  return isWithinMaintenanceWindow(new Date());
};
