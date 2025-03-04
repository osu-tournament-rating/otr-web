import { auth } from '@/auth';
import { Roles } from '@osu-tournament-rating/otr-api-client';
import { NextResponse } from 'next/server';

export default auth((req) => {
  if (!req.auth?.user?.scopes?.includes(Roles.Whitelist)) {
    return NextResponse.redirect(new URL('/unauthorized', req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - '/api/*' API routes
     * - '/auth' Auth.js handlers
     * - '/unauthorized'
     * - '/_next/*' Next.js internals
     * - '/static/*' Static assets
     * - '/favicon.ico' Static assets
     */
    '/((?!api|auth|unauthorized|_next|static|favicon.ico).*)',
  ],
};
