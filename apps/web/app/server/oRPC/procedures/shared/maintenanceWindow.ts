import { ORPCError } from '@orpc/server';
import { MAINTENANCE_WINDOW_LABEL } from '@otr/core/maintenance';

import { resolveMaintenanceWindowActive } from '@/lib/maintenance-window';

/**
 * Throws a 503 when the maintenance window is active. Used to gate admin
 * mutations on tournament data during the weekly processor run.
 */
export const assertOutsideMaintenanceWindow = (headers: Headers): void => {
  if (!resolveMaintenanceWindowActive(headers)) {
    return;
  }

  throw new ORPCError('SERVICE_UNAVAILABLE', {
    status: 503,
    message: `Tournament data changes are temporarily disabled during the maintenance window (${MAINTENANCE_WINDOW_LABEL}). Please try again shortly.`,
    data: { code: 'MAINTENANCE_WINDOW' },
  });
};
