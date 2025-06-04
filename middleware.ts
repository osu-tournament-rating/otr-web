import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  SESSION_COOKIE_NAME,
  USER_INFO_COOKIE_NAME,
} from './lib/api/server';

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
  const userInfoCookie = req.cookies.get(USER_INFO_COOKIE_NAME);

  // If we have both cookies, try to get session
  if (sessionCookie && userInfoCookie) {
    try {
      const session = await getSession();
      if (session) {
        // Check whitelist requirement in restricted environment
        if (isRestrictedEnv && !session.scopes?.includes('whitelist')) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Middleware session check error:', error);
    }
  }

  // In restricted environment, reject users without session or during session establishment
  if (isRestrictedEnv) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  // Skip middleware for public routes in non-restricted environments
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Session is being established, proceed (only in non-restricted environment)
  if (sessionCookie && !userInfoCookie) {
    return NextResponse.next();
  }

  // No valid session found, redirect to unauthorized
  return NextResponse.redirect(new URL('/unauthorized', req.url));
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
