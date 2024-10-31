'use server';

import { CookieNames, SessionUser } from '@/lib/types';
import { getIronSession } from 'iron-session';
import { ironSessionOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Ruleset, UserDTO } from '@osu-tournament-rating/otr-api-client';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/** Cookie options (omits name, value) */
const cookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  path: '/',
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1209600,
};

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
 * Populates the current session with data from the given user
 * @param user The user data to populate the session with
 */
export async function populateSessionUserData(user: UserDTO) {
  const session = await getSession();

  session.id = user.id;
  session.playerId = user.player?.id;
  session.osuId = user.player?.osuId;
  session.osuCountry = user.player?.country;
  session.osuPlayMode = user.settings?.ruleset ?? Ruleset.Osu;
  session.username = user.player?.username;
  session.scopes = user.scopes;

  cookies().set({
    name: CookieNames.UserSelectedRuleset,
    value: session.osuPlayMode?.toString() ?? Ruleset.Osu.toString(),
    ...cookieOptions
  });

  await session.save();
}

/**
 * Gets the value of a cookie
 * @param cookie The desired cookie
 * @returns The value of the cookie
 */
export async function getCookieValue(cookie: CookieNames) {
  return (cookies().get(cookie))?.value;
}

/**
 * Sets the value of a cookie
 * @param cookie The desired cookie
 * @param value The value to set
 */
export async function setCookieValue(cookie: CookieNames, value: any) {
  cookies().set(cookie, value);
}

/**
 * Clears all cookies
 */
export async function clearCookies() {
  Object.keys(CookieNames).forEach((name) => {
    cookies().delete(name);
  });
}