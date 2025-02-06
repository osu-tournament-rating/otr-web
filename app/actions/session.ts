'use server';

import { CookieNames, GetSessionParams, SessionData } from '@/lib/types';
import { getIronSession } from 'iron-session';
import { defaultCookieOptions, ironSessionOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import {
  ResponseCookie,
  ResponseCookies,
} from 'next/dist/compiled/@edge-runtime/cookies';
import { redirect, RedirectType } from 'next/navigation';
import env from '@/lib/env';

// region Iron Session

/**
 * Gets the current session
 * @param params Optionally pass a request and response to use as a cookie store instead of {@link cookies}
 * @returns The current session
 */
export async function getSession(params?: GetSessionParams) {
  if (params) {
    const { req, res } = params;
    return await getIronSession<SessionData>(req, res, ironSessionOptions);
  }
  return await getIronSession<SessionData>(await cookies(), ironSessionOptions);
}

/**
 * Gets the raw data for the current session
 * @param params Optionally pass a request and response to use as a cookie store instead of {@link cookies}
 * @returns A {@link SessionData} serialized as a plain object
 */
export async function getSessionData(params?: GetSessionParams) {
  return JSON.parse(JSON.stringify((await getSession(params)) as SessionData));
}

// endregion

// region Login / Logout

/**
 * Prepares the login flow and redirects to the osu! oauth portal
 * @returns A server redirect to the osu! oauth portal
 */
export async function login() {
  // Set and save the state variable
  const token = crypto.randomUUID();
  await setCookieValue(CookieNames.AuthXSRFToken, token);

  const query = new URLSearchParams([
    ['client_id', env.REACT_APP_OSU_CLIENT_ID],
    ['redirect_uri', env.REACT_APP_OSU_CALLBACK_URL],
    ['response_type', 'code'],
    ['scope', 'public friends.read'],
    ['state', token],
  ]).toString();

  return redirect(
    'https://osu.ppy.sh/oauth/authorize?' + query,
    RedirectType.replace
  );
}

/**
 * Logs out of the current session
 */
export async function logout() {
  const session = await getSession();
  session.destroy();

  return redirect('/');
}

// endregion

// region Cookie Helpers

/**
 * Gets the value of a cookie
 * @param cookie Target cookie
 * @returns Cookie value, if available
 * @template T Expected type of the cookie value
 */
export async function getCookieValue<T = string>(cookie: CookieNames) {
  return (await cookies()).get(cookie)?.value as T | undefined;
}

/**
 * Sets the value of a cookie
 * @param cookie Target cookie
 * @param value Value to set
 * @param options Options to encode
 */
export async function setCookieValue(
  cookie: CookieNames,
  value: unknown,
  options: Omit<ResponseCookie, 'name' | 'value'> = defaultCookieOptions
) {
  (await cookies()).set(cookie, value as string, options);
}

/**
 * Deletes a cookie
 * @param cookie Target cookie
 */
export async function clearCookie(cookie: CookieNames) {
  (await cookies()).delete(cookie);
}

/**
 * Clears all cookies
 * @param cookieStore Optional cookies to use in place of {@link cookies}
 */
export async function clearCookies(cookieStore?: ResponseCookies) {
  cookieStore ??= await cookies();

  Object.keys(CookieNames).forEach((name) => {
    cookieStore.delete(name);
  });
}

// endregion
