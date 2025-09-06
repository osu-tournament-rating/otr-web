import { ORPCError, os } from '@orpc/server';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/drizzle/schema';
import { auth } from '@/lib/auth';
import { z } from 'zod';

// Base procedure with context
const base = os.$context<{
  headers: Headers;
}>();

// Database middleware - manages DB connection lifecycle
const withDatabase = base.middleware(async ({ next }) => {
  return next({
    context: { db },
  });
});

// Auth middleware using better-auth
const withAuth = base.middleware(async ({ context, next }) => {
  // Get session from better-auth
  const sessionToken = context.headers
    .get('authorization')
    ?.replace('Bearer ', '');

  if (!sessionToken) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'No session token provided',
    });
  }

  // Validate session with better-auth
  const session = await auth.api.getSession({ headers: context.headers });

  if (!session) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Invalid or expired session',
    });
  }

  return next({
    context: {
      session,
      userId: session.user.id,
    },
  });
});

// Reusable procedure bases
export const publicProcedure = base.use(withDatabase);
export const protectedProcedure = base.use(withDatabase).use(withAuth);

// Example procedure
export const getPlayer = publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
    })
  )
  .handler(async ({ input, context }) => {
    const player = await context.db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, input.id))
      .limit(1);

    if (!player[0]) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Player not found',
      });
    }

    return player[0];
  });
