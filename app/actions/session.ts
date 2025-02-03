'use server';

import { CookieNames, GetSessionParams, SessionData } from '@/lib/types';
import { getIronSession } from 'iron-session';
import { ironSessionOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import {
  ResponseCookie,
  ResponseCookies,
} from 'next/dist/compiled/@edge-runtime/cookies';

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

/**
 * Gets the value of a cookie
 * @param cookie The desired cookie
 * @returns The value of the cookie
 */
export async function getCookieValue<T>(cookie: CookieNames) {
  return (await cookies()).get(cookie)?.value as T | undefined;
}

/**
 * Sets the value of a cookie
 * @param cookie The desired cookie
 * @param value The value to set
 */
export async function setCookieValue(cookie: CookieNames, value: unknown) {
  (await cookies()).set(cookie, value as string, cookieOptions);
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

/** Cookie options (omits name, value) */
const cookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  path: '/',
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1209600,
};
