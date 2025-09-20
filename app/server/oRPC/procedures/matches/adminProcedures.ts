import { ORPCError } from '@orpc/server';
import { and, eq, inArray, sql } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import {
  MatchAdminDeleteInputSchema,
  MatchAdminDeletePlayerScoresInputSchema,
  MatchAdminDeletePlayerScoresResponseSchema,
  MatchAdminMutationResponseSchema,
  MatchAdminUpdateInputSchema,
} from '@/lib/orpc/schema/match';
import { VerificationStatus } from '@/lib/osu/enums';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';

const NOW = sql`CURRENT_TIMESTAMP`;

export const updateMatchAdmin = protectedProcedure
  .input(MatchAdminUpdateInputSchema)
  .output(MatchAdminMutationResponseSchema)
  .route({
    summary: 'Admin: update match',
    tags: ['admin'],
    path: '/matches/admin/update',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const existing = await context.db.query.matches.findFirst({
      columns: { id: true },
      where: eq(schema.matches.id, input.id),
    });

    if (!existing) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Match not found',
      });
    }

    const shouldAssignReviewer =
      input.verificationStatus === VerificationStatus.Verified ||
      input.verificationStatus === VerificationStatus.Rejected;

    await context.db
      .update(schema.matches)
      .set({
        name: input.name,
        verificationStatus: input.verificationStatus,
        rejectionReason: input.rejectionReason,
        warningFlags: input.warningFlags,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        verifiedByUserId: shouldAssignReviewer ? adminUserId : null,
        updated: NOW,
      })
      .where(eq(schema.matches.id, input.id));

    return { success: true } as const;
  });

export const deleteMatchAdmin = protectedProcedure
  .input(MatchAdminDeleteInputSchema)
  .output(MatchAdminMutationResponseSchema)
  .route({
    summary: 'Admin: delete match',
    tags: ['admin'],
    path: '/matches/admin/delete',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const deleted = await context.db
      .delete(schema.matches)
      .where(eq(schema.matches.id, input.id))
      .returning({ id: schema.matches.id });

    if (deleted.length === 0) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Match not found',
      });
    }

    return { success: true } as const;
  });

export const deleteMatchPlayerScoresAdmin = protectedProcedure
  .input(MatchAdminDeletePlayerScoresInputSchema)
  .output(MatchAdminDeletePlayerScoresResponseSchema)
  .route({
    summary: 'Admin: delete player scores from match',
    tags: ['admin'],
    path: '/matches/admin/delete-player-scores',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const gameRows = await context.db
      .select({ id: schema.games.id })
      .from(schema.games)
      .where(eq(schema.games.matchId, input.matchId));

    const gameIds = gameRows.map((row) => row.id);

    if (gameIds.length === 0) {
      return { success: true, deletedCount: 0 } as const;
    }

    const deleted = await context.db
      .delete(schema.gameScores)
      .where(
        and(
          eq(schema.gameScores.playerId, input.playerId),
          inArray(schema.gameScores.gameId, gameIds)
        )
      )
      .returning({ id: schema.gameScores.id });

    return { success: true, deletedCount: deleted.length } as const;
  });
