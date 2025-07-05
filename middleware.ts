import { NextRequest, NextResponse } from 'next/server';
import { getSession, SESSION_COOKIE_NAME } from './lib/api/server';

const publicRoutes = [
  '/',
  '/unauthorized',
  '/not-found',
  '/leaderboard',
  '/tournaments',
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isRestrictedEnv = process.env.IS_RESTRICTED_ENV === 'true';
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);

  // Clean up legacy otr-user cookies if present
  const response = NextResponse.next();
  if (req.cookies.has('otr-user')) {
    response.cookies.delete('otr-user');
  }

  // If we have a session cookie, validate it by fetching user data
  if (sessionCookie) {
    try {
      const session = await getSession();
      if (session) {
        // Check whitelist requirement in restricted environment
        if (isRestrictedEnv && !session.scopes?.includes('whitelist')) {
          const redirectResponse = NextResponse.redirect(
            new URL('/unauthorized', req.url)
          );
          if (req.cookies.has('otr-user')) {
            redirectResponse.cookies.delete('otr-user');
          }
          return redirectResponse;
        }
        return response;
      }
      // Session cookie exists but is invalid - fall through to redirect logic
    } catch (error) {
      console.error('Middleware session validation error:', error);
      // Fall through to redirect logic
    }
  }

  // In restricted environments, reject users without valid sessions
  if (isRestrictedEnv) {
    const redirectResponse = NextResponse.redirect(
      new URL('/unauthorized', req.url)
    );
    if (req.cookies.has('otr-user')) {
      redirectResponse.cookies.delete('otr-user');
    }
    return redirectResponse;
  }

  // Skip middleware for public routes in non-restricted environments
  if (publicRoutes.includes(pathname)) {
    return response;
  }

  // No valid session found, redirect to unauthorized
  const redirectResponse = NextResponse.redirect(
    new URL('/unauthorized', req.url)
  );
  if (req.cookies.has('otr-user')) {
    redirectResponse.cookies.delete('otr-user');
  }
  return redirectResponse;
}

export const config = {
  matcher: [
    /*
     * Middleware runs on all paths except:
     * - '/api/*' API routes
     * - '/auth/*' Authorization routes
     * - '/unauthorized/*' Access control redirect
     * - '/_next/*' Next.js internals
     * - '/[static, decorations, icons, images, logos, favicon]/*' Static assets / public dir
     */
    '/((?!api|auth|unauthorized|_next|static|decorations|icons|images|logos|favicon.ico).*)',
  ],
};
