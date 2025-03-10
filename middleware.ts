import { NextRequest, NextResponse } from 'next/server';
import { auth, OTR_HEADERS, OtrHeaderKey, type SessionError } from '@/auth';
import { Session } from 'next-auth';
import { getToken } from '@auth/core/jwt';
import { Roles } from '@osu-tournament-rating/otr-api-client';

const SESSION_TOKEN_COOKIE_NAME = 'authjs.session-token';

export default async function middleware(req: NextRequest) {
  // Sanitize headers
  for (const header of Object.keys(OTR_HEADERS)) {
    req.headers.delete(header);
  }

  // Try to read raw session data from the incoming request cookies
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  // If there is no session data (not logged in), always redirect early
  if (!token) {
    return NextResponse.redirect(new URL('/unauthorized', req.nextUrl.origin));
  }

  /**
   * Problem:
   * Simply using the `auth()` function to get the session server side as
   * described in the next-auth documentation works, but it does not account
   * for any changes that may be made to the session cookie. The server
   * environment is stateless. If we use an expired session cookie to get the
   * session, and it is refreshed, we have no way of updating the original
   * expired session cookie. This will cause every auth request on the server
   * for that request lifetime to refresh the token, which is bad!
   *
   * Basic idea:
   * If changes are made to the session when we retrieve it, we need to
   * overwrite the incoming request to reflect those changes.
   *
   * - Get session via the next-auth pipeline, which will handle token
   * rotation, jwt encoding, and session formatting for us. (The pipeline will
   * hit the `jwt()` callback that we define in '@/auth.ts' which contains
   * our token rotation logic)
   *
   * - If changes are made to the session, they will be set in the `Set-Cookie`
   * header of the response with the new values already encoded. This value
   * needs to be extracted and the request's session cookie should be
   * set to this updated value. This will cause the remainder of the request's
   * lifetime in the server to use the updated session cookie.
   */

  // session = Completely up-to-date session data
  let session: Session | null = null;

  /**
   * authResponse = The response next-auth _would have_ returned if we were
   * using it 'correctly' i.e.
   *
   * export default auth((req) => {
   *   ...middleware
   * });
   *
   * By calling the function handle returned from `auth(() => {})` in this
   * manner, we can 'trick' next-auth into providing us the response it would
   * be giving to middleware in a normal configuration
   */
  const authResponse = await auth((authReq) => {
    // Extract session data to the outer scope to consume later
    session = authReq.auth;
  }).call({}, req, {});

  // TS expecting this to always be null, probably not honoring the assignment
  // from within the above nested function scope. This workaround gives us
  // type support
  if (session) {
    session = session as Session;
  }

  // Try to extract the updated session cookie from the auth response
  let updatedSessionCookie;
  if (authResponse) {
    // For some reason the authResponse properties are all hidden behind
    // unique symbols. Creating a new response using it as an init works
    // around this
    updatedSessionCookie = new NextResponse(
      authResponse.body,
      authResponse
    ).cookies.get(SESSION_TOKEN_COOKIE_NAME);
  }

  if (updatedSessionCookie) {
    // Overwrite incoming session cookie
    req.cookies.set(updatedSessionCookie);
  }

  let res: NextResponse;

  /**
   * Redirects are a completely new request from the client, so when we return
   * a redirect we only need to set the outgoing cookie. Redirects do not
   * hit the middleware again, so by the time they hit the rest of the server
   * pipeline, the cookie will have already been set by the client.
   *
   * However, when continuing routing we _do_ need the incoming request to be
   * overwritten to reflect further down in the server.
   */

  // Session has error
  if (session?.error) {
    // Setup redirect
    res = NextResponse.redirect(new URL(`/unauthorized`, req.nextUrl.origin));

    // Set error
    res.headers.set(
      'x-otr-session-error' satisfies OtrHeaderKey,
      session.error
    );

    // Destroy session
    res.cookies.set(SESSION_TOKEN_COOKIE_NAME, '');

    return res;
  }

  // Permission check
  if (!session?.user?.scopes?.includes(Roles.Whitelist)) {
    // Setup redirect
    res = NextResponse.redirect(new URL('/unauthorized', req.nextUrl.origin));

    // Set error
    res.headers.set(
      'x-otr-session-error' satisfies OtrHeaderKey,
      'permission' satisfies SessionError
    );

    // Update session
    if (updatedSessionCookie) {
      res.cookies.set(updatedSessionCookie);
    }

    return res;
  }

  // Anything else: forward with overwritten request
  res = NextResponse.next({ request: req });
  if (updatedSessionCookie) {
    res.cookies.set(updatedSessionCookie);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Middleware runs on all paths except:
     * - '/api/*' API routes
     * - '/auth/*' Auth.js handlers
     * - '/unauthorized/*' Access control redirect
     * - '/_next/*' Next.js internals
     * - '/[static, decorations, icons, images, logos, favicon]/*' Static assets / public dir
     */
    '/((?!api|auth|unauthorized|_next|static|decorations|icons|images|logos|favicon.ico).*)',
  ],
};
