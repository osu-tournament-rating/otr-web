import { afterEach, beforeEach } from 'bun:test';

/**
 * Variables that short-circuit the maintenance-window checks before any date
 * logic runs. `.env.example` sets `MAINTENANCE_WINDOW_ENABLED=false`, so a unit
 * test that reads them from the ambient environment passes in CI and fails on a
 * developer checkout.
 */
const MAINTENANCE_WINDOW_ENV_KEYS = [
  'E2E_TEST_AUTH',
  'MAINTENANCE_WINDOW_ENABLED',
] as const;

/**
 * Unsets the maintenance-window overrides around every test in the calling
 * suite, so window behavior is decided by the date under test alone. Call once
 * at the top of a `describe` body.
 */
export const useDefaultMaintenanceWindowEnv = () => {
  // Widened view: the app's env typings declare these vars as required, but
  // the tests must be able to unset them.
  const env = process.env as Record<string, string | undefined>;
  const original = new Map(
    MAINTENANCE_WINDOW_ENV_KEYS.map((key) => [key, env[key]] as const)
  );

  beforeEach(() => {
    for (const key of MAINTENANCE_WINDOW_ENV_KEYS) {
      delete env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of original) {
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }
  });
};
