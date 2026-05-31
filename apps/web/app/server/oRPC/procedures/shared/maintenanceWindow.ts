import { ORPCError } from '@orpc/server';
import {
  MAINTENANCE_WINDOW_LABEL,
  isWithinMaintenanceWindow,
} from '@otr/core/maintenance';

import { isE2eAuthEnabled } from '@/lib/auth/e2e-test-auth-plugin';

/**
 * Test-only request header used by the e2e suite to force the maintenance
 * window on or off deterministically, independent of wall-clock time. It is
 * only honored when {@link isE2eAuthEnabled} is true, so it has no effect in
 * production.
 */
const E2E_OVERRIDE_HEADER = 'x-e2e-maintenance-window';

const isMaintenanceWindowEnabled = () =>
  process.env.MAINTENANCE_WINDOW_ENABLED !== 'false';

/**
 * Resolves whether data mutations should currently be blocked.
 *
 * Precedence:
 *   1. E2E override header (test environments only).
 *   2. The `MAINTENANCE_WINDOW_ENABLED` feature flag (developers disable it
 *      locally so they aren't blocked while working).
 *   3. The daily 11:45–12:15 UTC window.
 */
export const resolveMaintenanceWindowActive = (headers: Headers): boolean => {
  if (isE2eAuthEnabled()) {
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

  return isWithinMaintenanceWindow(new Date());
};

/**
 * Throws a 503 when the maintenance window is active. Used to gate admin
 * mutations on tournament data during the daily processor run.
 */
export const assertOutsideMaintenanceWindow = (headers: Headers): void => {
  if (!resolveMaintenanceWindowActive(headers)) {
    return;
  }

  throw new ORPCError('SERVICE_UNAVAILABLE', {
    status: 503,
    message: `Tournament data changes are temporarily disabled during the daily maintenance window (${MAINTENANCE_WINDOW_LABEL}). Please try again shortly.`,
    data: { code: 'MAINTENANCE_WINDOW' },
  });
};
