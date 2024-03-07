import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession, refreshAccessToken } from './app/actions';

export async function middleware(request: NextRequest) {
  const session = await getSession();

  const { pathname } = request.nextUrl;

  const PUBLIC_FILE = /.(.*)$/;

  if (
    !session.isLogged ||
    (request.nextUrl.pathname.startsWith('/unauthorized') && !session.isLogged)
  ) {
    if (cookies().get('OTR-Refresh-Token')?.value) {
      const refresh = await refreshAccessToken();
      if (refresh.accessToken) {
        return NextResponse.redirect(
          new URL(
            `/auth?accessToken=${refresh.accessToken}&refreshToken=${refresh.refreshToken}`,
            request.url
          )
        );
      }
    }

    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  if (
    request.nextUrl.pathname.startsWith('/unauthorized') &&
    session.isLogged
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (
    pathname.startsWith('/_next') || // exclude Next.js internals
    pathname.startsWith('/api') || // exclude all API routes
    pathname.startsWith('/static') || // exclude static files
    pathname.startsWith('/favicon.ico') || // exclude static files
    PUBLIC_FILE.test(pathname) // exclude all files in the public folder
  )
    return NextResponse.next();

  /* RESTRICT ACCESS OF THESE ROUTES TO ONLY AUTHORIZED USERS */
  /* if (
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/submit')) &&
    !user?.osuId
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  } */
}

export const config = {
  matcher: ['/', '/dashboard', '/leaderboards', '/submit', '/users/:id*'],
};
