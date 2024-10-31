'use server';

import { apiWrapperConfiguration } from '@/lib/auth';
import { IAccessCredentialsDTO, MeWrapper, OAuthWrapper } from '@osu-tournament-rating/otr-api-client';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { clearCookies, getSession, populateSessionUserData } from './session';

/**
 * Prepares the login flow and redirects to the osu! oauth portal
 * @returns A client redirect to the osu! oauth portal
 */
export async function prepareLogin() {
  const session = await getSession();
  if (session.isLogged) {
    return redirect('/');
  }

  // Set and save the state variable
  const state = crypto.randomUUID();
  session.osuOauthState = state;
  await session.save();

  const url = new URL('https://osu.ppy.sh/oauth/authorize');
  url.searchParams.set('client_id', process.env.REACT_APP_OSU_CLIENT_ID as string);
  url.searchParams.set('redirect_uri', process.env.REACT_APP_OSU_CALLBACK_URL as string);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'public');
  url.searchParams.set('state', state);

  return redirect(url.toString());
}

/**
 * Completes the login flow by fetching the user and populating the session
 * @param code osu! oauth authorization code
 * @returns A server redirect based on the outcome of logging in
 */
export async function login(code: string) {
  const session = await getSession();

  // Start by deleting the state as its already been validated at this point
  delete session.osuOauthState;
  await session.save();

  // Exchange the osu! auth code for o!TR credentials
  const oauthWrapper = new OAuthWrapper(apiWrapperConfiguration);

  let accessCredentials: IAccessCredentialsDTO;
  try {
    accessCredentials = (await oauthWrapper.authorize(code)).result;
  } catch (err) {
    console.log(err);
    return NextResponse.redirect(new URL('/', process.env.REACT_APP_ORIGIN_URL));
  }

  // This is technically all that's required for login
  session.accessToken = accessCredentials.accessToken;
  session.refreshToken = accessCredentials.refreshToken;
  session.isLogged = true;
  await session.save();

  // Try to get the user and populate the rest of the session
  const meWrapper = new MeWrapper(apiWrapperConfiguration);

  try {
    const { result } = await meWrapper.get();
    await populateSessionUserData(result);
  } catch (err) { 
    console.log(err);
  }

  return NextResponse.redirect(new URL('/', process.env.REACT_APP_ORIGIN_URL));
}

/**
 * Destroys the current session and removes any cookies
 * @returns A redirect to /unauthorized
 */
export async function logout() {
  const session = await getSession();

  try {
    session.destroy();
    await clearCookies();
  } catch (error) {
    console.log(error);
  } finally {
    return redirect(new URL('/', process.env.REACT_APP_ORIGIN_URL).toString());
  }
}

/**
 * Checks the expiration of the current access credentials, and refreshes the access token if needed.
 * If the refresh token has expired, the current session is destroyed / user is logged out
 * @returns A redirect to /unauthorized if the refresh token has expired
 */
export async function validateAccessCredentials() {
  const session = await getSession();

  if (!session.isLogged || !session.accessToken || !session.refreshToken) {
    return;
  }

  // Check expiration of current tokens
  if (!isTokenExpired(session.accessToken)) {
    return;
  }

  // If the refresh token is expired we need to log in again
  if (isTokenExpired(session.refreshToken)) {
    return await logout();
  }

  // Request a new access token and update the session
  const oauthWrapper = new OAuthWrapper(apiWrapperConfiguration);
  const { result } = await oauthWrapper.refresh(session.refreshToken);

  session.accessToken = result.accessToken;
  await session.save();
}

/**
 * Checks the expiration of an access or refresh token
 * @param token The token to check
 * @returns Whether or not the given token has expired
 */
function isTokenExpired(token: string) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return Date.now() >= payload.exp * 1000;
}
