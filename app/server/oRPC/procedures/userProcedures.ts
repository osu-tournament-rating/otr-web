import { ORPCError } from '@orpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import * as schema from '@/lib/db/schema';
import { CurrentUserSchema } from '@/lib/orpc/schema/user';

import { protectedProcedure } from './base';

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
  .output(CurrentUserSchema)
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

    return CurrentUserSchema.parse({
      player: {
        id: player.id,
        username: player.username,
        osuId: player.osuId,
        country: player.country,
      },
      scopes: user?.scopes ?? [],
      userId: user?.id ?? null,
    });
  });
