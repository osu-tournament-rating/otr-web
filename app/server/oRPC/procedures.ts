import { ORPCError, os } from '@orpc/server';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { auth } from '@/lib/auth/auth';
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

export const getUser = protectedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
    })
  )
  .route({
    summary: 'Get a user',
    tags: ['authenticated'],
  })
  .handler(async ({ input, context }) => {
    const user = await context.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, input.id))
      .limit(1);

    if (!user[0]) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found',
      });
    }

    return user[0];
  });

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
