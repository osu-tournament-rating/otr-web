import { NextRequest, NextResponse } from 'next/server';

const LEGACY_COOKIE_NAME = 'otr-user';

export function middleware(req: NextRequest) {
  const response = NextResponse.next();

  if (req.cookies.has(LEGACY_COOKIE_NAME)) {
    response.cookies.delete(LEGACY_COOKIE_NAME);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|auth|_next|static|decorations|icons|images|logos|favicon.ico).*)',
  ],
};
