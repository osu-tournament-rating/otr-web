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

  // Skip middleware for public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const userInfoCookie = req.cookies.get(USER_INFO_COOKIE_NAME);

  // If we have both cookies, try to get session
  if (sessionCookie && userInfoCookie) {
    try {
      const session = await getSession();
      if (session) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Middleware session check error:', error);
    }
  }

  // Session is being established, proceed
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
