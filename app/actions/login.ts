'use server';

import { apiWrapperConfiguration } from '@/lib/auth';
import { IAccessCredentialsDTO, MeWrapper, OAuthWrapper } from '@osu-tournament-rating/otr-api-client';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { clearCookies, getSession, populateSessionUserData } from './session';
import { GetSessionParams } from '@/lib/types';

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
 * @param getSessionParams Optional parameters used to fetch the session
 * @returns If {@link getSessionParams} are not present, returns a client redirect to root
 */
export async function logout(getSessionParams?: GetSessionParams) {
  const session = await getSession(getSessionParams);

  session.destroy();
  await clearCookies(getSessionParams?.res?.cookies);

  if (!getSessionParams) {
    return redirect(new URL('/', process.env.REACT_APP_ORIGIN_URL).toString());
  }
}

/**
 * Checks the expiration of the current access credentials, and refreshes the access token if needed.
 * If the refresh token has expired, the current session is destroyed / user is logged out.
 * @returns A redirect based on the validity of the access credentials
 */
export async function validateAccessCredentials(getSessionParams?: GetSessionParams) {
  const session = await getSession(getSessionParams);
  if (!session.isLogged || !session.accessToken || !session.refreshToken) {
    return;
  }

  const { accessTokenExpired, refreshTokenExpired } = await checkAccessCredentialsValidity(session);

  // If the access token is still valid no action is needed
  if (!accessTokenExpired) {
    return;
  }

  // If the refresh token is expired we need to log in again
  if (refreshTokenExpired) {
    return await logout(getSessionParams);
  }

  // Refresh the access token
  const oauthWrapper = new OAuthWrapper(apiWrapperConfiguration);
  const { result } = await oauthWrapper.refresh(session.refreshToken);
  session.accessToken = result.accessToken;

  await session.save();
}

/**
 * Checks the expiration of access credentials
 * @param accessCredentials Access credentials to check. If not given, they will be retrieved from the session
 * @returns Whether each token has expired
 */
async function checkAccessCredentialsValidity(accessCredentials?: { accessToken?: string, refreshToken?: string }) {
  const { accessToken, refreshToken } = (accessCredentials ?? await getSession());

  return {
    accessTokenExpired: accessToken ? isTokenExpired(accessToken) : true, 
    refreshTokenExpired: refreshToken ? isTokenExpired(refreshToken) : true
  };
}

/**
 * Checks the expiration of a JWT (JSON Web Token)
 * @param token The token to check
 * @returns Whether or not the given token has expired
 */
function isTokenExpired(token: string) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return Date.now() >= payload.exp * 1000;
}
