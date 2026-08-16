import { test as setup } from '@playwright/test';
import { ROLE_PLAYER_ID, STORAGE_STATE, signInPlayer } from './fixtures/auth';

/** Setup project: writes a reusable storage state per role before the specs run. */
setup('authenticate as admin', async ({ request }) => {
  await signInPlayer(request, ROLE_PLAYER_ID.admin, { admin: true });
  await request.storageState({ path: STORAGE_STATE.admin });
});

setup('authenticate as regular user', async ({ request }) => {
  await signInPlayer(request, ROLE_PLAYER_ID.user);
  await request.storageState({ path: STORAGE_STATE.user });
});
