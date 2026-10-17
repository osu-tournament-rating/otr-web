import { afterEach, beforeEach } from 'bun:test';

/**
 * Unsets the env flags that short-circuit the maintenance window around each
 * test, then restores them. `bun test` loads the repository `.env`, where
 * `MAINTENANCE_WINDOW_ENABLED=false` is the normal local value, so without this
 * the window can never open and its assertions pass only in a bare
 * environment such as CI. A test that exercises a flag sets it explicitly.
 */
export const isolateMaintenanceWindowEnv = () => {
  // Widened view: the app's env typings declare these vars as required, but
  // the tests must be able to unset them.
  const env = process.env as Record<string, string | undefined>;
  const originalEnv = {
    E2E_TEST_AUTH: env.E2E_TEST_AUTH,
    MAINTENANCE_WINDOW_ENABLED: env.MAINTENANCE_WINDOW_ENABLED,
  };

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
};
