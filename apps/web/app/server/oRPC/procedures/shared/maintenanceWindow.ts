import { ORPCError } from '@orpc/server';
import {
  MAINTENANCE_WINDOW_LABEL,
  type RatingRecalculationTracker,
} from '@otr/core/maintenance';

import { readRatingTimestamps, type DbReader } from '@/lib/db/rating-utils';
import {
  isMaintenanceWindowActive,
  resolveMaintenanceWindowActive,
} from '@/lib/maintenance-window';

export const MAINTENANCE_WINDOW_MESSAGE = `Tournament data changes are paused during the weekly maintenance window, ${MAINTENANCE_WINDOW_LABEL}. Please try again later.`;

const maintenanceWindowError = () =>
  new ORPCError('SERVICE_UNAVAILABLE', {
    status: 503,
    message: MAINTENANCE_WINDOW_MESSAGE,
    data: { code: 'MAINTENANCE_WINDOW' },
  });

/**
 * Throws 503 during the maintenance window, reading the ratings through `db`
 * so a transaction sees them as of its own snapshot.
 */
export const assertOutsideMaintenanceWindow = async (
  headers: Headers,
  db: DbReader
): Promise<void> => {
  if (resolveMaintenanceWindowActive(headers, await readRatingTimestamps(db))) {
    throw maintenanceWindowError();
  }
};

/** Throws 503 during the maintenance window; guards every admin data edit. */
export const assertAdminDataMutationsAllowed = async (
  headers: Pick<Headers, 'get'>,
  tracker: Pick<RatingRecalculationTracker, 'isPending'>
): Promise<void> => {
  if (await isMaintenanceWindowActive(headers, tracker)) {
    throw maintenanceWindowError();
  }
};
