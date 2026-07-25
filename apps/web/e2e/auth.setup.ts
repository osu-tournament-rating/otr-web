import { test as setup } from '@playwright/test';
import { ROLE_PLAYER_ID, STORAGE_STATE, signInPlayer } from './fixtures/auth';

/**
 * Authentication setup project. Runs before the main test projects (declared as a
 * dependency in playwright.config.ts) and writes a reusable storage state per role
 * by hitting the test-only `/api/auth/e2e/sign-in` endpoint. Authenticated specs
 * opt in with `test.use({ storageState: STORAGE_STATE.admin })`.
 */
setup('authenticate as admin', async ({ request }) => {
  await signInPlayer(request, ROLE_PLAYER_ID.admin);
  await request.storageState({ path: STORAGE_STATE.admin });
});

setup('authenticate as regular user', async ({ request }) => {
  await signInPlayer(request, ROLE_PLAYER_ID.user);
  await request.storageState({ path: STORAGE_STATE.user });
});
