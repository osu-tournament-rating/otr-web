import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateAccessCredentials } from '@/app/actions/login';
import { getSession } from '@/app/actions/session';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Validate access credentials if possible
  await validateAccessCredentials({ req, res });
  const session = await getSession({ req, res });

  // Redirect users that arent logged in
  if (!session.isLogged) {
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
     * - '/_next/*' Next.js internals
     * - '/static/*' Static assets
     * - '/favicon.ico' Static assets
     */
    '/((?!api|auth|logout|refresh|unauthorized|_next|static|favicon.ico).*)'
  ]
};
