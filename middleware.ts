import { NextRequest, NextResponse } from 'next/server';
import { getSession, SESSION_COOKIE_NAME } from './lib/api/server';

// Constants
const UNAUTHORIZED_ROUTE = '/unauthorized';
const LEGACY_COOKIE_NAME = 'otr-user';

// Define route categories
const publicRoutes = [
  '/',
  '/leaderboard',
  '/matches',
  '/not-found',
  '/players',
  '/stats',
  '/tools/filter-reports',
  '/tournaments',
  UNAUTHORIZED_ROUTE,
];

const authRequiredRoutes = ['/tournaments/submit', '/tools/filter'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isRestrictedEnv = process.env.IS_RESTRICTED_ENV === 'true';
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);

  // Clean up legacy otr-user cookies if present
  const response = NextResponse.next();
  if (req.cookies.has(LEGACY_COOKIE_NAME)) {
    response.cookies.delete(LEGACY_COOKIE_NAME);
  }

  // Check route types - check public routes first to handle more specific paths
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Only check auth required if not already determined to be public
  const isAuthRequired =
    !isPublicRoute &&
    authRequiredRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    );

  // Determine if session validation is needed
  // In restricted environments, always validate except for the unauthorized page
  const needsSessionValidation =
    isAuthRequired ||
    (isRestrictedEnv && pathname !== UNAUTHORIZED_ROUTE) ||
    sessionCookie;

  // Skip validation for public routes in non-restricted environments without a session
  if (!needsSessionValidation && isPublicRoute) {
    return response;
  }

  // Validate session when needed
  if (needsSessionValidation) {
    try {
      const session = await getSession();

      if (session) {
        // Pass session data through headers to avoid duplicate API calls
        response.headers.set('x-session-data', JSON.stringify(session));
        response.headers.set('x-session-validated', 'true');

        // Check whitelist requirement in restricted environment
        if (isRestrictedEnv && !session.scopes?.includes('whitelist')) {
          return redirectToUnauthorized(req);
        }

        return response;
      }

      // No valid session - redirect if auth required or restricted env
      if (isAuthRequired || isRestrictedEnv) {
        return redirectToUnauthorized(req);
      }
    } catch (error) {
      console.error('Middleware session validation error:', error);
      // Redirect on error if auth required or restricted env
      if (isAuthRequired || isRestrictedEnv) {
        return redirectToUnauthorized(req);
      }
    }
  }

  // Default: allow access
  return response;
}

function redirectToUnauthorized(req: NextRequest) {
  const redirectResponse = NextResponse.redirect(
    new URL(UNAUTHORIZED_ROUTE, req.url)
  );
  if (req.cookies.has(LEGACY_COOKIE_NAME)) {
    redirectResponse.cookies.delete(LEGACY_COOKIE_NAME);
  }
  return redirectResponse;
}

export const config = {
  matcher: [
    /*
     * Middleware runs on all paths except:
     * - '/api/*' API routes
     * - '/auth/*' Authorization routes
     * - '/_next/*' Next.js internals
     * - '/[static, decorations, icons, images, logos, favicon]/*' Static assets / public dir
     */
    '/((?!api|auth|_next|static|decorations|icons|images|logos|favicon.ico).*)',
  ],
};
