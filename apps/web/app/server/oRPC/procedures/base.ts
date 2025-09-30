import { ORPCError, os } from '@orpc/server';

import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';

const base = os.$context<{
  headers: Headers;
}>();

const withDatabase = base.middleware(async ({ context, next }) => {
  return next({
    context: {
      ...context,
      db,
    },
  });
});

const withAuth = base.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });

  if (!session) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Invalid or expired session',
    });
  }

  return next({
    context: {
      ...context,
      session,
    },
  });
});

export const publicProcedure = base.use(withDatabase);
export const protectedProcedure = base.use(withDatabase).use(withAuth);
