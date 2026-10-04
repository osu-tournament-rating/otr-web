import {
  isRatingRecalculationPending,
  type RatingRecalculationTracker,
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
 * The window state forced by the e2e override header or
 * `MAINTENANCE_WINDOW_ENABLED=false`, or null when the ratings decide.
 */
const resolveMaintenanceWindowOverride = (
  headers: HeadersLike
): boolean | null => {
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

  return null;
};

/**
 * Whether the maintenance window is active for rating timestamps read in the
 * caller's own query or transaction, after the overrides.
 */
export const resolveMaintenanceWindowActive = (
  headers: HeadersLike,
  ratingTimestamps: RatingTimestamps
): boolean =>
  resolveMaintenanceWindowOverride(headers) ??
  isRatingRecalculationPending(
    ratingTimestamps.now,
    ratingTimestamps.latestRatingCreated
  );

/**
 * Whether the maintenance window is active, after the overrides. Asks the
 * tracker only when no override applies, so a disabled window reads nothing.
 */
export const isMaintenanceWindowActive = async (
  headers: HeadersLike,
  tracker: Pick<RatingRecalculationTracker, 'isPending'>
): Promise<boolean> =>
  resolveMaintenanceWindowOverride(headers) ?? (await tracker.isPending());
