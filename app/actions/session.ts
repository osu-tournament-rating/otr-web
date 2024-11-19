'use server';

import { CookieNames, GetSessionParams, SessionUser } from '@/lib/types';
import { getIronSession } from 'iron-session';
import { ironSessionOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Ruleset, UserDTO } from '@osu-tournament-rating/otr-api-client';
import { ResponseCookie, ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies';

/**
 * Gets the current session
 * @param params Optionally pass a request and response to use as a cookie store instead of {@link cookies}
 * @returns The current session
 */
export async function getSession(params?: GetSessionParams) {
  if (params) {
    const { req, res } = params;
    return await getIronSession<SessionUser>(req, res, ironSessionOptions);
  }
  return await getIronSession<SessionUser>(cookies(), ironSessionOptions);
}

/**
 * Gets the raw data for the current session
 * @param params Optionally pass a request and response to use as a cookie store instead of {@link cookies}
 * @returns A {@link SessionUser} serialized as a plain object
 */
export async function getSessionData(params?: GetSessionParams) {
  return JSON.parse(JSON.stringify((await getSession(params) as SessionUser)));
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

  await setCookieValue(CookieNames.SelectedRuleset, session.osuPlayMode);
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
  cookies().set(cookie, value, cookieOptions);
}

/**
 * Clears all cookies
 * @param cookieStore Optional cookies to use in place of {@link cookies}
 */
export async function clearCookies(cookieStore?: ResponseCookies) {
  Object.keys(CookieNames).forEach((name) => {
    (cookieStore ?? cookies()).delete(name);
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