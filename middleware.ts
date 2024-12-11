import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateAccessCredentials } from '@/app/actions/login';
import { getSession } from '@/app/actions/session';
import { Roles } from '@osu-tournament-rating/otr-api-client';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Validate access credentials if possible
  await validateAccessCredentials({ req, res });
  const session = await getSession({ req, res });

  // Redirect users that aren't logged in
  if (!session.isLogged || !session.user?.scopes?.includes(Roles.Whitelist)) {
    // Pass through the existing response headers in case cookies are set
    return NextResponse.redirect(new URL('/unauthorized', req.url), { headers: res.headers });
  }

  return res;
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
    '/((?!api|auth|unauthorized|_next|static|favicon.ico).*)'
  ]
};
