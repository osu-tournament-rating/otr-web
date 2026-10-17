import { ORPCError } from '@orpc/server';
import { MAINTENANCE_WINDOW_LABEL } from '@otr/core/maintenance';

import { readRatingTimestamps, type DbReader } from '@/lib/db/rating-utils';
import { resolveMaintenanceWindowActive } from '@/lib/maintenance-window';

type MaintenanceWindowOptions = {
  /** Also checks rating timestamps, so the window tracks the recalculation. */
  db?: DbReader;
  /** What the window pauses, named at the start of the 503 message. */
  subject?: string;
};

/** Throws 503 during the maintenance window. */
export const assertOutsideMaintenanceWindow = async (
  headers: Headers,
  { db, subject = 'Tournament data changes' }: MaintenanceWindowOptions = {}
): Promise<void> => {
  const ratingTimestamps = db ? await readRatingTimestamps(db) : undefined;

  if (!resolveMaintenanceWindowActive(headers, ratingTimestamps)) {
    return;
  }

  throw new ORPCError('SERVICE_UNAVAILABLE', {
    status: 503,
    message: `${subject} are temporarily disabled during the maintenance window (${MAINTENANCE_WINDOW_LABEL}). Please try again shortly.`,
    data: { code: 'MAINTENANCE_WINDOW' },
  });
};
