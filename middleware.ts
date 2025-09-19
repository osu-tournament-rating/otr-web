import { NextRequest, NextResponse } from 'next/server';
import { getCookieCache, getSessionCookie } from 'better-auth/cookies';
import type { AppSession } from '@/lib/auth/auth';
import { ADMIN_ROLES } from '@/lib/auth/roles';

type MiddlewareSession = AppSession & {
  dbUser?: {
    scopes?: string[] | null;
  } | null;
};

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

// Define routes that require specific roles
const SUBMITTER_SCOPES = ['submit', ...ADMIN_ROLES] as const;

const roleRequiredRoutes: Record<string, readonly string[]> = {
  '/tournaments/submit': SUBMITTER_SCOPES,
  // Note: /tools/filter only requires authentication, not specific roles
};

const WHITELIST_SCOPE = 'whitelist';

const matchesRoute = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

const findRequiredScopes = (
  pathname: string
): readonly string[] | undefined => {
  for (const [route, scopes] of Object.entries(roleRequiredRoutes)) {
    if (matchesRoute(pathname, route)) {
      return scopes;
    }
  }

  return undefined;
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isRestrictedEnv = process.env.IS_RESTRICTED_ENV === 'true';
  const sessionCookie = getSessionCookie(req);

  // Clean up legacy otr-user cookies if present
  const response = NextResponse.next();
  if (req.cookies.has(LEGACY_COOKIE_NAME)) {
    response.cookies.delete(LEGACY_COOKIE_NAME);
  }

  // Check route types - check public routes first to handle more specific paths
  const isPublicRoute = publicRoutes.some((route) =>
    matchesRoute(pathname, route)
  );

  // Only check auth required if not already determined to be public
  const isAuthRequired =
    !isPublicRoute &&
    authRequiredRoutes.some((route) => matchesRoute(pathname, route));

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
      const session = (await getCookieCache(req, {
        secret: process.env.BETTER_AUTH_SECRET,
      })) as MiddlewareSession | null;

      if (!session) {
        if (isAuthRequired || isRestrictedEnv) {
          return redirectToUnauthorized(req);
        }

        return response;
      }

      const scopes = session.dbUser?.scopes ?? [];

      // Check whitelist requirement in restricted environment
      if (isRestrictedEnv && !scopes.includes(WHITELIST_SCOPE)) {
        return redirectToUnauthorized(req);
      }

      // Check role requirements for specific routes
      const requiredScopes = findRequiredScopes(pathname);
      if (requiredScopes) {
        const hasRequiredRole = requiredScopes.some((scope) =>
          scopes.includes(scope)
        );

        if (!hasRequiredRole) {
          return redirectToUnauthorized(req);
        }
      }

      return response;
    } catch (error) {
      console.error('Middleware session validation error:', error);
      // Redirect on error if auth required or restricted env
      if (isAuthRequired || isRestrictedEnv) {
        return redirectToUnauthorized(req);
      }
      return response;
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
