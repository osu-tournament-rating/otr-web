import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { ORPCError } from '@orpc/server';

import {
  MAINTENANCE_WINDOW_MESSAGE,
  assertAdminDataMutationsAllowed,
} from '../maintenanceWindow';

const env = process.env as Record<string, string | undefined>;
const originalEnv = {
  E2E_TEST_AUTH: env.E2E_TEST_AUTH,
  MAINTENANCE_WINDOW_ENABLED: env.MAINTENANCE_WINDOW_ENABLED,
};

const trackerReporting = (pending: boolean) => ({
  isPending: mock(async () => pending),
});

const captureError = async (call: Promise<unknown>) => {
  try {
    await call;
  } catch (error) {
    return error;
  }

  throw new Error('expected the guard to throw');
};

describe('assertAdminDataMutationsAllowed', () => {
  beforeEach(() => {
    delete env.E2E_TEST_AUTH;
    delete env.MAINTENANCE_WINDOW_ENABLED;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }
  });

  it('rejects admin edits with a 503 while new ratings are pending', async () => {
    const error = await captureError(
      assertAdminDataMutationsAllowed(new Headers(), trackerReporting(true))
    );

    expect(error).toBeInstanceOf(ORPCError);
    expect(error).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
      message: MAINTENANCE_WINDOW_MESSAGE,
      data: { code: 'MAINTENANCE_WINDOW' },
    });
  });

  it('allows admin edits once new ratings are published', async () => {
    await assertAdminDataMutationsAllowed(
      new Headers(),
      trackerReporting(false)
    );
  });

  it('allows admin edits when the window is disabled', async () => {
    process.env.MAINTENANCE_WINDOW_ENABLED = 'false';

    await assertAdminDataMutationsAllowed(
      new Headers(),
      trackerReporting(true)
    );
  });

  it('does not promise a fixed end time', () => {
    expect(MAINTENANCE_WINDOW_MESSAGE).toContain(
      'until new ratings are published'
    );
    expect(MAINTENANCE_WINDOW_MESSAGE).not.toContain('12:15');
  });
});
