import { ORPCError } from '@orpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v4';

import * as schema from '@otr/core/db/schema';
import { CurrentUserSchema } from '@/lib/orpc/schema/user';

import { protectedProcedure } from './base';
import { db } from '@/lib/db';

export const getUser = protectedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
    })
  )
  .route({
    summary: 'Get user details',
    tags: ['authenticated'],
    method: 'GET',
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
    summary: 'Get current user',
    tags: ['authenticated'],
    method: 'GET',
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

export const deleteMyAccount = protectedProcedure
  .route({
    summary: 'Permanently delete user account data',
    tags: ['authenticated'],
    method: 'DELETE',
    path: '/users/me',
  })
  .handler(async ({ context }) => {
    const { user } = context.session;

    if (!user?.id) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'No authenticated user found',
      });
    }

    const authUserId = user.id;

    const authUser = await context.db.query.auth_users.findFirst({
      where: eq(schema.auth_users.id, authUserId),
      columns: {
        id: true,
        email: true,
        playerId: true,
      },
    });

    if (!authUser) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found',
      });
    }

    await db.transaction(async (tx) => {
      if (authUser.playerId) {
        await tx
          .delete(schema.playerFriends)
          .where(eq(schema.playerFriends.playerId, authUser.playerId));
      }

      if (authUser.email) {
        await tx
          .delete(schema.auth_verifications)
          .where(eq(schema.auth_verifications.identifier, authUser.email));
      }

      await tx
        .delete(schema.users)
        .where(eq(schema.users.playerId, authUser.playerId));

      await tx
        .delete(schema.auth_users)
        .where(eq(schema.auth_users.id, authUserId));
    });

    return { success: true };
  });

export const deleteMyFriends = protectedProcedure
  .route({
    summary: 'Delete all friends for the current user',
    tags: ['authenticated'],
    method: 'DELETE',
    path: '/users/me/friends',
  })
  .handler(async ({ context }) => {
    const { user } = context.session;

    if (!user?.id) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'No authenticated user found',
      });
    }

    const authUser = await context.db.query.auth_users.findFirst({
      where: eq(schema.auth_users.id, user.id),
      columns: {
        playerId: true,
      },
    });

    if (!authUser?.playerId) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found',
      });
    }

    await db
      .delete(schema.playerFriends)
      .where(eq(schema.playerFriends.playerId, authUser.playerId));

    return { success: true };
  });
