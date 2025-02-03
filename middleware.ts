import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { defaultSessionData, ironSessionOptions, isTokenExpired } from '@/lib/auth';
import { sealData, unsealData } from 'iron-session';
import { SessionData } from '@/lib/types';
import { refreshAccessToken } from '@/app/actions/login';
import { Roles } from '@osu-tournament-rating/otr-api-client';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await middlewareGetSession(req, res);

  if (!session.isLogged) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  // Redirect users that aren't logged in
  if (!session.isLogged || !session.user?.scopes?.includes(Roles.Whitelist)) {
    // Pass through the existing response headers in case cookies are set
    return NextResponse.redirect(new URL('/unauthorized', req.url), {
      headers: res.headers,
    });
  }

  return res;
}

async function middlewareGetSession(req: NextRequest, res: NextResponse) {
  // Decode session from cookie
  const sessionCookieValue = req.cookies.get(ironSessionOptions.cookieName)?.value;
  const session = sessionCookieValue
    ? await unsealData<SessionData>(sessionCookieValue, ironSessionOptions)
    : defaultSessionData;

  // Access token is valid
  if (!session.accessToken || (session.accessToken && !isTokenExpired(session.accessToken))) {
    return session;
  }

  // Refresh token is expired
  if (!session.refreshToken || (session.refreshToken && isTokenExpired(session.refreshToken))) {
    middlewareLogout(res);
    return session;
  }

  // Refresh access token
  try {
    const newAccessToken = await refreshAccessToken(session.refreshToken);

    // Didn't receive a new access token, logout
    if (!newAccessToken) {
      session.isLogged = false;
      middlewareLogout(res);
      return session;
    }

    // Save new access token
    session.accessToken = newAccessToken;
    await middlewareSaveSession(session, res);
  } catch {
    session.isLogged = false;
    middlewareLogout(res);
  }

  return session;
}

async function middlewareSaveSession(sessionData: SessionData, res: NextResponse) {
  const encodedSessionData = await sealData(sessionData, ironSessionOptions);
  res.cookies.set(
    ironSessionOptions.cookieName,
    encodedSessionData,
    ironSessionOptions.cookieOptions
  );
}

function middlewareLogout(res: NextResponse) {
  if (res.cookies.has(ironSessionOptions.cookieName)) {
    res.cookies.delete(ironSessionOptions.cookieName);
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - '/api/*' API routes
     * - '/auth'
     * - '/unauthorized' Has its own access control
     * - '/_next/*' Next.js internals
     * - '/static/*' Static assets
     * - '/favicon.ico' Static assets
     */
    '/((?!api|auth|unauthorized|_next|static|favicon.ico).*)',
  ],
};
