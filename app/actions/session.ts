'use server';

import { SessionUser } from '@/lib/types';
import { getIronSession } from 'iron-session';
import { ironSessionOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export type CookieNames = 'OTR-user-selected-osu-mode';

/**
 * Gets the current session
 * @returns The current session
 */
export async function getSession() {
  return await getIronSession<SessionUser>(cookies(), ironSessionOptions);
}

/**
 * Gets the raw data for the current session
 * @returns A {@link SessionUser} serialized as a plain object
 */
export async function getSessionData() {
  return JSON.parse(JSON.stringify((await getSession() as SessionUser)));
}

/**
 * Gets the value of a cookie
 * @param cookie The desired cookie
 * @returns The value of the cookie
 */
export function getCookie(cookie: CookieNames) {
  return (cookies().get(cookie))?.value;
}

/**
 * Sets the value of a cookie
 * @param cookie The desired cookie
 * @param value The value to set
 */
export function setCookie(cookie: CookieNames, value: any) {
  cookies().set(cookie, value);
}