/** Test-only endpoint exposed by {@link e2eTestAuthPlugin}. */
export const E2E_SIGN_IN_PATH = '/api/auth/e2e/sign-in';

/** Sessions are minted from these players; the endpoint provisions their user rows. */
export const E2E_ADMIN_PLAYER_ID = 3616;
export const E2E_NONADMIN_PLAYER_ID = 1068;

/** Preview stacks are only reachable over the tailnet, where osu! OAuth has no callback. */
export function isTailnetPreview() {
  return (
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.ts.net')
  );
}

export async function signInE2eAdmin() {
  const response = await fetch(E2E_SIGN_IN_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: E2E_ADMIN_PLAYER_ID, admin: true }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`e2e sign-in failed (${response.status}): ${body}`);
  }
}
