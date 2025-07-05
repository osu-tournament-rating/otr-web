import { NextRequest, NextResponse } from 'next/server';
import { getSession, SESSION_COOKIE_NAME } from './lib/api/server';

// Define route categories
const publicRoutes = [
  '/',
  '/leaderboard',
  '/tournaments',
  '/stats',
  '/matches',
  '/players',
  '/unauthorized',
  '/not-found',
];

const authRequiredRoutes = ['/tournaments/submit', '/tools/filter'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isRestrictedEnv = process.env.IS_RESTRICTED_ENV === 'true';
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);

  // Clean up legacy otr-user cookies if present
  const response = NextResponse.next();
  if (req.cookies.has('otr-user')) {
    response.cookies.delete('otr-user');
  }

  // Check route type
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRequired = authRequiredRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // For public routes in non-restricted environments without a session cookie, skip validation
  if (!isRestrictedEnv && isPublicRoute && !sessionCookie) {
    return response;
  }

  // For auth-required routes, restricted environments, or when we have a session cookie, validate
  if (isAuthRequired || isRestrictedEnv || sessionCookie) {
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
      // Session cookie exists but is invalid - fall through to redirect logic
    } catch (error) {
      console.error('Middleware session validation error:', error);
      // Fall through to redirect logic
    }
  }

  // Handle no session cases
  if (isAuthRequired || isRestrictedEnv) {
    return redirectToUnauthorized(req);
  }

  // Default: allow access
  return response;
}

function redirectToUnauthorized(req: NextRequest) {
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
     * - '/_next/*' Next.js internals
     * - '/[static, decorations, icons, images, logos, favicon]/*' Static assets / public dir
     */
    '/((?!api|auth|_next|static|decorations|icons|images|logos|favicon.ico).*)',
  ],
};
