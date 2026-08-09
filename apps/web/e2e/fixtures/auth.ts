import path from 'node:path';
import { type APIRequestContext, type Page } from '@playwright/test';

/**
 * Players used for e2e sessions. The sign-in endpoint provisions their
 * `users`/`auth_users` rows on first use, so only the `players` rows need to exist:
 *   - 3616 ("Cytusine") -> admin session
 *   - 1068 ("D I O")    -> regular signed-in session
 */
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

/**
 * Mints a signed session for the given player on an {@link APIRequestContext}'s
 * cookie jar. Used by the setup project to produce reusable storage states.
 */
export async function signInPlayer(
  request: APIRequestContext,
  playerId: number,
  options: { admin?: boolean } = {}
): Promise<void> {
  const response = await request.post(E2E_SIGN_IN_PATH, {
    data: { playerId, admin: options.admin ?? false },
  });

  // Only read the body / build the message on failure — passing them to
  // expect() eagerly would run an extra request and surface a misleading
  // "sign-in failed" line in the trace even on success.
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `e2e sign-in failed for player ${playerId} (${response.status()}): ${body}`
    );
  }
}

/**
 * Logs the given page's browser context in as a role mid-test (for cases where a
 * pre-baked storage state is not used). Navigates to the app first so the cookie
 * is scoped to the right origin, then reloads to pick up the session.
 */
export async function loginAs(page: Page, role: TestRole): Promise<void> {
  await signInPlayer(page.request, ROLE_PLAYER_ID[role], {
    admin: role === 'admin',
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}
