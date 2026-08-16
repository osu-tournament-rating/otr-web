import path from 'node:path';
import { type APIRequestContext, type Page } from '@playwright/test';

/** Sessions are minted from these players; the endpoint provisions their user rows. */
export const TEST_ADMIN_PLAYER_ID = 3616;
export const TEST_NONADMIN_PLAYER_ID = 1068;

/** Where the Playwright setup project writes each role's storage state. */
const AUTH_DIR = path.join(__dirname, '..', '.auth');
export const STORAGE_STATE = {
  admin: path.join(AUTH_DIR, 'admin.json'),
  user: path.join(AUTH_DIR, 'user.json'),
} as const;

export type TestRole = keyof typeof STORAGE_STATE;

export const ROLE_PLAYER_ID: Record<TestRole, number> = {
  admin: TEST_ADMIN_PLAYER_ID,
  user: TEST_NONADMIN_PLAYER_ID,
};

/** Test-only endpoint exposed by {@link e2eTestAuthPlugin}. */
export const E2E_SIGN_IN_PATH = '/api/auth/e2e/sign-in';

/** Mints a signed session for the player on the request context's cookie jar. */
export async function signInPlayer(
  request: APIRequestContext,
  playerId: number,
  options: { admin?: boolean } = {}
): Promise<void> {
  const response = await request.post(E2E_SIGN_IN_PATH, {
    data: { playerId, admin: options.admin ?? false },
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `e2e sign-in failed for player ${playerId} (${response.status()}): ${body}`
    );
  }
}

/** Signs the page's context in as a role mid-test, without a baked storage state. */
export async function loginAs(page: Page, role: TestRole): Promise<void> {
  await signInPlayer(page.request, ROLE_PLAYER_ID[role], {
    admin: role === 'admin',
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}
