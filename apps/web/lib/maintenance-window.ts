import { isWithinMaintenanceWindow } from '@otr/core/maintenance';

/**
 * Test-only request header used by the e2e suite to force the maintenance
 * window on or off deterministically, independent of wall-clock time. It is
 * only honored when E2E_TEST_AUTH=true, so it has no effect in production.
 */
const E2E_OVERRIDE_HEADER = 'x-e2e-maintenance-window';

type HeadersLike = Pick<Headers, 'get'>;

const isE2eMaintenanceOverrideEnabled = () =>
  process.env.E2E_TEST_AUTH === 'true';

const isMaintenanceWindowEnabled = () =>
  process.env.MAINTENANCE_WINDOW_ENABLED !== 'false';

/**
 * Resolves whether the site should treat the maintenance window as active.
 *
 * Precedence:
 *   1. E2E override header (test environments only).
 *   2. The `MAINTENANCE_WINDOW_ENABLED` feature flag (developers disable it
 *      locally so they aren't blocked while working).
 *   3. The weekly Tuesday 11:45-12:15 UTC window.
 */
export const resolveMaintenanceWindowActive = (
  headers: HeadersLike
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

  return isWithinMaintenanceWindow(new Date());
};
