'use server';

import { redirect } from 'next/navigation';
import { clearSession } from '../api/server';
import { clearRequestCache } from '../utils/request-cache';

/**
 * Redirects the user to the API's login endpoint.
 * After successful authentication, the API will redirect the user back to the provided `redirectUrl`.
 *
 * It is recommended that `redirectUrl` be an intermediary callback page within this application
 * (e.g., /auth/callback). This callback page can then refresh client-side data and navigate
 * the user to their originally intended page.
 *
 * @param originalPath The originalPath the user was on, e.g. /leaderboard
 */
export async function login(originalPath: string) {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL;
  const callbackUrl = new URL(`${appBaseUrl}/auth/callback`);
  callbackUrl.searchParams.set('redirectTo', originalPath);

  const apiLoginUrl = new URL(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/login`
  );
  apiLoginUrl.searchParams.set('redirectUri', callbackUrl.toString());
  redirect(apiLoginUrl.toString());
}

/**
 * Clears the user's session and redirects to the API's logout endpoint.
 * After logging out, the user will be redirected back to the provided `redirectUrl`.
 *
 * @param redirectUrl The URL within this application where the API should redirect the user
 * after successful logout. This is passed as the `redirectUri` query parameter to the API.
 * Note that the middleware may hijack this redirect if the user is not authorized
 * to view the specified route.
 */
export async function logout(redirectUrl: string) {
  await clearSession();
  clearRequestCache(); // Clear any cached session requests
  const apiLogoutUrl = new URL(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/logout`
  );
  apiLogoutUrl.searchParams.set('redirectUri', redirectUrl);
  redirect(apiLogoutUrl.toString());
}
