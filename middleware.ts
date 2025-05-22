import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './lib/api/server';
import { Roles } from '@osu-tournament-rating/otr-api-client';

const publicRoutes = ['/unauthorized', '/not-found'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip middleware for public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  const session = await getSession();

  if (!session || !session.scopes?.includes(Roles.Whitelist)) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
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
