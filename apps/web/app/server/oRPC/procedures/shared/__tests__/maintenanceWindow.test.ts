import { afterEach, describe, expect, it, setSystemTime } from 'bun:test';

import { withMaintenanceWindowGuard } from '../../base';
import { assertOutsideMaintenanceWindow } from '../maintenanceWindow';
import { isolateMaintenanceWindowEnv } from '@/lib/maintenance-window.test-utils';

const headersWith = (override?: string) =>
  new Headers(override ? { 'x-e2e-maintenance-window': override } : {});

const expectBlocked = (promise: Promise<unknown>) =>
  expect(promise).rejects.toMatchObject({
    code: 'SERVICE_UNAVAILABLE',
    status: 503,
    data: { code: 'MAINTENANCE_WINDOW' },
  });

const expectAllowed = (promise: Promise<unknown>) =>
  expect(promise).resolves.toBeUndefined();

describe('assertOutsideMaintenanceWindow', () => {
  isolateMaintenanceWindowEnv();

  afterEach(() => {
    setSystemTime();
  });

  it('blocks on Tuesdays from 11:45 UTC through 12:14 UTC', async () => {
    setSystemTime(new Date('2026-06-02T11:45:00.000Z'));
    await expectBlocked(assertOutsideMaintenanceWindow(headersWith()));

    setSystemTime(new Date('2026-06-02T12:14:59.999Z'));
    await expectBlocked(assertOutsideMaintenanceWindow(headersWith()));
  });

  it('allows writes outside the Tuesday window', async () => {
    setSystemTime(new Date('2026-06-02T11:44:59.999Z'));
    await expectAllowed(assertOutsideMaintenanceWindow(headersWith()));

    setSystemTime(new Date('2026-06-02T12:15:00.000Z'));
    await expectAllowed(assertOutsideMaintenanceWindow(headersWith()));

    setSystemTime(new Date('2026-06-03T11:45:00.000Z'));
    await expectAllowed(assertOutsideMaintenanceWindow(headersWith()));
  });

  it('allows writes during the window when the feature flag is disabled', async () => {
    process.env.MAINTENANCE_WINDOW_ENABLED = 'false';
    setSystemTime(new Date('2026-06-02T12:00:00.000Z'));

    await expectAllowed(assertOutsideMaintenanceWindow(headersWith()));
  });

  it('honors the e2e override header only when test auth is enabled', async () => {
    setSystemTime(new Date('2026-06-03T12:00:00.000Z'));
    await expectAllowed(assertOutsideMaintenanceWindow(headersWith('active')));

    process.env.E2E_TEST_AUTH = 'true';
    await expectBlocked(assertOutsideMaintenanceWindow(headersWith('active')));

    setSystemTime(new Date('2026-06-02T12:00:00.000Z'));
    await expectAllowed(
      assertOutsideMaintenanceWindow(headersWith('inactive'))
    );
  });

  it('names the paused work in the message', async () => {
    setSystemTime(new Date('2026-06-02T12:00:00.000Z'));

    await expect(assertOutsideMaintenanceWindow(headersWith())).rejects.toThrow(
      /^Tournament data changes are temporarily disabled/
    );
    await expect(
      assertOutsideMaintenanceWindow(headersWith(), {
        subject: 'Admin changes',
      })
    ).rejects.toThrow(/^Admin changes are temporarily disabled/);
  });
});

describe('withMaintenanceWindowGuard', () => {
  isolateMaintenanceWindowEnv();

  afterEach(() => {
    setSystemTime();
  });

  const runGuard = (next: () => Promise<unknown>) =>
    withMaintenanceWindowGuard(
      { context: { headers: headersWith() }, next } as never,
      undefined,
      (() => {}) as never
    );

  it('rejects admin changes during the window without running the procedure', async () => {
    setSystemTime(new Date('2026-06-02T12:00:00.000Z'));
    let ran = false;

    await expect(
      runGuard(async () => {
        ran = true;
      })
    ).rejects.toThrow(/^Admin changes are temporarily disabled/);
    expect(ran).toBe(false);
  });

  it('runs the procedure outside the window', async () => {
    setSystemTime(new Date('2026-06-03T12:00:00.000Z'));
    let ran = false;

    await runGuard(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });
});
