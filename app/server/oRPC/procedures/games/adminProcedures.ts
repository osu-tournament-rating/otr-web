import { ORPCError } from '@orpc/server';
import { eq, sql } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import {
  GameAdminDeleteInputSchema,
  GameAdminMutationResponseSchema,
  GameAdminUpdateInputSchema,
} from '@/lib/orpc/schema/match';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';

const NOW = sql`CURRENT_TIMESTAMP`;
const FALLBACK_DATETIME = '2007-09-17 00:00:00';

export const updateGameAdmin = protectedProcedure
  .input(GameAdminUpdateInputSchema)
  .output(GameAdminMutationResponseSchema)
  .route({
    summary: 'Admin: update game',
    tags: ['admin'],
    path: '/games/admin/update',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const existing = await context.db.query.games.findFirst({
      columns: {
        id: true,
        startTime: true,
        endTime: true,
      },
      where: eq(schema.games.id, input.id),
    });

    if (!existing) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Game not found',
      });
    }

    const startTime =
      input.startTime ?? existing.startTime ?? FALLBACK_DATETIME;
    const endTime = input.endTime ?? existing.endTime ?? FALLBACK_DATETIME;

    await context.db
      .update(schema.games)
      .set({
        ruleset: input.ruleset,
        scoringType: input.scoringType,
        teamType: input.teamType,
        mods: input.mods,
        verificationStatus: input.verificationStatus,
        rejectionReason: input.rejectionReason,
        warningFlags: input.warningFlags,
        startTime,
        endTime,
        updated: NOW,
      })
      .where(eq(schema.games.id, input.id));

    return { success: true } as const;
  });

export const deleteGameAdmin = protectedProcedure
  .input(GameAdminDeleteInputSchema)
  .output(GameAdminMutationResponseSchema)
  .route({
    // TODO: Remove 'Admin:' prefix for all admin route summaries
    summary: 'Admin: delete game',
    tags: ['admin'],
    path: '/games/admin/delete',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const deleted = await context.db
      .delete(schema.games)
      .where(eq(schema.games.id, input.id))
      .returning({ id: schema.games.id });

    if (deleted.length === 0) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Game not found',
      });
    }

    return { success: true } as const;
  });
