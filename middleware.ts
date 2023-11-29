import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUserData } from './app/actions';

export async function middleware(request: NextRequest) {
  const user = await getUserData();

  /* RESTRICT ACCESS OF THESE ROUTES TO ONLY AUTHORIZED USERS */
  if (
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/submit')) &&
    user?.error
  ) {
    return NextResponse.rewrite(new URL('/', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/submit'],
};
