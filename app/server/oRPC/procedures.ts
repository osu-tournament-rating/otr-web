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
    path: '/users/{id}',
  })
  .handler(async ({ input, context }) => {
    const user = await context.db.query.users.findFirst({
      where: eq(schema.users.id, input.id),
      with: {
        userSettings: true,
        player: true,
      },
    });

    if (!user) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found',
      });
    }

    return user;
  });

export const getCurrentUser = protectedProcedure
  .route({
    summary: 'Get the authenticated user',
    tags: ['authenticated'],
    path: '/users/me',
  })
  .handler(async ({ context }) => {
    const { osuId } = context.session.user;

    if (!osuId) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Authenticated user does not have an associated osu! id',
      });
    }

    const player = await context.db.query.players.findFirst({
      where: eq(schema.players.osuId, osuId),
    });

    if (!player) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Player not found for the current session',
      });
    }

    const user = await context.db.query.users.findFirst({
      where: eq(schema.users.playerId, player.id),
    });

    return {
      player: {
        id: player.id,
        username: player.username,
        osuId: player.osuId,
        country: player.country,
      },
      scopes: user?.scopes ?? [],
      userId: user?.id ?? null,
    };
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
