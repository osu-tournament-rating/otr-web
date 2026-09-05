import { describe, expect, it } from 'bun:test';

import { resolveMaintenanceWindowActive } from '../maintenance-window';
import { isolateMaintenanceWindowEnv } from '../maintenance-window.test-utils';

/** Tuesday inside the window, before the processor has committed. */
const DURING_WINDOW = new Date('2026-01-06T11:50:00Z');
/** Rebuild from the previous week (stale relative to DURING_WINDOW). */
const STALE_REBUILD = new Date('2025-12-30T12:04:00Z');
/** Rebuild after this week's window start (fresh). */
const FRESH_REBUILD = new Date('2026-01-06T12:03:00Z');

const headersWith = (override?: string): Pick<Headers, 'get'> => ({
  get: (name: string) =>
    name === 'x-e2e-maintenance-window' ? (override ?? null) : null,
});

describe('resolveMaintenanceWindowActive with rating timestamps', () => {
  isolateMaintenanceWindowEnv();

  it('is active while a recalculation is pending', () => {
    expect(
      resolveMaintenanceWindowActive(headersWith(), {
        now: DURING_WINDOW,
        latestRatingCreated: STALE_REBUILD,
      })
    ).toBe(true);
  });

  it('is inactive once the processor has committed, even inside the window', () => {
    expect(
      resolveMaintenanceWindowActive(headersWith(), {
        now: DURING_WINDOW,
        latestRatingCreated: FRESH_REBUILD,
      })
    ).toBe(false);
  });

  it('is inactive when the feature flag is disabled', () => {
    process.env.MAINTENANCE_WINDOW_ENABLED = 'false';

    expect(
      resolveMaintenanceWindowActive(headersWith(), {
        now: DURING_WINDOW,
        latestRatingCreated: STALE_REBUILD,
      })
    ).toBe(false);
  });

  it('honors the e2e override header when test auth is enabled', () => {
    process.env.E2E_TEST_AUTH = 'true';

    expect(
      resolveMaintenanceWindowActive(headersWith('active'), {
        now: DURING_WINDOW,
        latestRatingCreated: FRESH_REBUILD,
      })
    ).toBe(true);
    expect(
      resolveMaintenanceWindowActive(headersWith('inactive'), {
        now: DURING_WINDOW,
        latestRatingCreated: STALE_REBUILD,
      })
    ).toBe(false);
  });

  it('ignores the e2e override header outside test environments', () => {
    expect(
      resolveMaintenanceWindowActive(headersWith('active'), {
        now: DURING_WINDOW,
        latestRatingCreated: FRESH_REBUILD,
      })
    ).toBe(false);
  });
});
