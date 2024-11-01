import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateAccessCredentials } from '@/app/actions/login';
import { getSession } from '@/app/actions/session';

export async function middleware(request: NextRequest) {
  // Validate access credentials if possible
  await validateAccessCredentials({ middleware: true });
  const session = await getSession();

  // Redirect users that arent logged in
  if (!session.isLogged) {
    console.log('mw: redirected unauthed user');
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

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
    '/((?!api|auth|logout|refresh|unauthorized|_next|static|favicon.ico).*)'
  ]
};
