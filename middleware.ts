import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from './app/actions';
import { validateAccessCredentials } from './app/actions/login';

export async function middleware(request: NextRequest) {
  const session = await getSession();

  // Redirect users that arent logged in
  if (!session.isLogged) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  await validateAccessCredentials();
  return NextResponse.next();
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
    '/((?!api|auth|unauthorized|_next|static|favicon.ico).*)'
  ]
};
