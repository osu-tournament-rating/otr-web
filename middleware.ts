import { auth } from './auth';
import { Roles } from '@osu-tournament-rating/otr-api-client';
import { NextResponse, NextRequest } from 'next/server';

export default auth((request) => {
  console.log('middleware: auth');
  return NextResponse.next({ request });

  // if (!req.auth?.user?.scopes?.includes(Roles.Whitelist)) {
  //   return NextResponse.redirect(new URL('/unauthorized', req.nextUrl.origin));
  // }
});

// export default function middleware(req: NextRequest) {
//   const rand = crypto.randomUUID();
//   console.log('setting', rand);
//   req.cookies.set('rand', rand);

//   return NextResponse.next({ request: req });
// }

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
