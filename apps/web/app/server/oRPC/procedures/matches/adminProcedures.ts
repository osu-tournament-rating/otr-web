import { ORPCError } from '@orpc/server';
import { and, eq, inArray, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { syncTournamentDateRange, withAuditUserId } from '@otr/core/db';
import { cascadeMatchRejection } from '@otr/core/db/rejection-cascade';
import { cascadeMatchVerification } from '@otr/core/db/verification-cascade';
import {
  MatchAdminDeleteInputSchema,
  MatchAdminDeletePlayerScoresInputSchema,
  MatchAdminDeletePlayerScoresResponseSchema,
  MatchAdminMergeInputSchema,
  MatchAdminMergeResponseSchema,
  MatchAdminMutationResponseSchema,
  MatchAdminUpdateInputSchema,
  type MatchAdminUpdateInput,
} from '@/lib/orpc/schema/match';
import type { DatabaseClient } from '@/lib/db';
import { MatchWarningFlags, VerificationStatus } from '@otr/core/osu';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';

const NOW = sql`CURRENT_TIMESTAMP`;

interface UpdateMatchAdminContext {
  db: DatabaseClient;
  session: {
    dbUser?: {
      id: number;
      scopes?: string[] | null;
    } | null;
  } | null;
}

export interface UpdateMatchAdminArgs {
  input: MatchAdminUpdateInput;
  context: UpdateMatchAdminContext;
}

export async function updateMatchAdminHandler({
  input,
  context,
}: UpdateMatchAdminArgs) {
  const { adminUserId } = ensureAdminSession(context.session);

  const existing = await context.db.query.matches.findFirst({
    columns: {
      id: true,
      verifiedByUserId: true,
      verificationStatus: true,
    },
    where: eq(schema.matches.id, input.id),
  });

  if (!existing) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Match not found',
    });
  }

  const verificationStatusChanged =
    input.verificationStatus !== existing.verificationStatus;

  const newStatusRequiresReviewer =
    input.verificationStatus === VerificationStatus.Verified ||
    input.verificationStatus === VerificationStatus.Rejected;

  await context.db.transaction((tx) =>
    withAuditUserId(tx, adminUserId, async () => {
      const verifiedByUserId = (() => {
        if (!verificationStatusChanged) {
          return existing.verifiedByUserId;
        }

        if (newStatusRequiresReviewer) {
          return adminUserId;
        }

        return null;
      })();

      const shouldClearWarnings =
        input.verificationStatus === VerificationStatus.Verified ||
        input.verificationStatus === VerificationStatus.Rejected;

      const nextWarningFlags = shouldClearWarnings
        ? MatchWarningFlags.None
        : input.warningFlags;

      await tx
        .update(schema.matches)
        .set({
          name: input.name,
          verificationStatus: input.verificationStatus,
          rejectionReason: input.rejectionReason,
          warningFlags: nextWarningFlags,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          verifiedByUserId,
          updated: NOW,
        })
        .where(eq(schema.matches.id, input.id));

      if (input.verificationStatus === VerificationStatus.Verified) {
        await cascadeMatchVerification(tx, [input.id], { updatedAt: NOW });
      }

      if (input.verificationStatus === VerificationStatus.Rejected) {
        await cascadeMatchRejection(tx, [input.id], {
          updatedAt: NOW,
        });
      }
    })
  );

  return { success: true } as const;
}

export const updateMatchAdmin = protectedProcedure
  .input(MatchAdminUpdateInputSchema)
  .output(MatchAdminMutationResponseSchema)
  .route({
    summary: 'Update match',
    tags: ['admin'],
    method: 'PATCH',
    path: '/matches/{id}',
  })
  .handler(({ input, context }) => updateMatchAdminHandler({ input, context }));

export const mergeMatchAdmin = protectedProcedure
  .input(MatchAdminMergeInputSchema)
  .output(MatchAdminMergeResponseSchema)
  .route({
    summary: 'Merge matches',
    tags: ['admin'],
    method: 'POST',
    path: '/matches:merge',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const childIds = Array.from(new Set(input.childMatchIds));

    if (childIds.includes(input.id)) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Cannot merge a match into itself',
      });
    }

    if (childIds.length === 0) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'At least one child match is required',
      });
    }

    return context.db.transaction((tx) =>
      withAuditUserId(tx, adminUserId, async () => {
        const parentMatch = await tx.query.matches.findFirst({
          columns: {
            id: true,
            tournamentId: true,
          },
          where: eq(schema.matches.id, input.id),
        });

        if (!parentMatch) {
          throw new ORPCError('NOT_FOUND', {
            message: 'Parent match not found',
          });
        }

        const childMatches = await tx.query.matches.findMany({
          columns: {
            id: true,
            tournamentId: true,
          },
          where: inArray(schema.matches.id, childIds),
        });

        if (childMatches.length !== childIds.length) {
          const foundIds = new Set(childMatches.map((match) => match.id));
          const missingIds = childIds.filter((id) => !foundIds.has(id));

          throw new ORPCError('NOT_FOUND', {
            message: `Matches not found: ${missingIds.join(', ')}`,
          });
        }

        const mismatchedTournament = childMatches.find(
          (match) => match.tournamentId !== parentMatch.tournamentId
        );

        if (mismatchedTournament) {
          throw new ORPCError('BAD_REQUEST', {
            message:
              'All child matches must belong to the same tournament as the parent match to merge',
          });
        }

        const reassignedGames = await tx
          .update(schema.games)
          .set({ matchId: parentMatch.id })
          .where(inArray(schema.games.matchId, childIds))
          .returning({ id: schema.games.id });

        await tx
          .delete(schema.matches)
          .where(inArray(schema.matches.id, childIds));

        if (parentMatch.tournamentId != null) {
          await syncTournamentDateRange(tx, parentMatch.tournamentId);
        }

        return {
          success: true,
          mergedMatchCount: childIds.length,
          rehomedGameCount: reassignedGames.length,
        } as const;
      })
    );
  });

export const deleteMatchAdmin = protectedProcedure
  .input(MatchAdminDeleteInputSchema)
  .output(MatchAdminMutationResponseSchema)
  .route({
    summary: 'Delete match',
    tags: ['admin'],
    method: 'DELETE',
    path: '/matches/{id}',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    return context.db.transaction((tx) =>
      withAuditUserId(tx, adminUserId, async () => {
        const match = await tx.query.matches.findFirst({
          columns: {
            id: true,
            tournamentId: true,
          },
          where: eq(schema.matches.id, input.id),
        });

        if (!match) {
          throw new ORPCError('NOT_FOUND', {
            message: 'Match not found',
          });
        }

        await tx.delete(schema.matches).where(eq(schema.matches.id, input.id));

        if (match.tournamentId != null) {
          await syncTournamentDateRange(tx, match.tournamentId);
        }

        return { success: true } as const;
      })
    );
  });

export const deleteMatchPlayerScoresAdmin = protectedProcedure
  .input(MatchAdminDeletePlayerScoresInputSchema)
  .output(MatchAdminDeletePlayerScoresResponseSchema)
  .route({
    summary: 'Delete player scores from match',
    tags: ['admin'],
    method: 'DELETE',
    path: '/matches/{matchId}/players/{playerId}/scores',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    return context.db.transaction((tx) =>
      withAuditUserId(tx, adminUserId, async () => {
        const gameRows = await tx
          .select({ id: schema.games.id })
          .from(schema.games)
          .where(eq(schema.games.matchId, input.matchId));

        const gameIds = gameRows.map((row) => row.id);

        if (gameIds.length === 0) {
          return { success: true, deletedCount: 0 } as const;
        }

        const deleted = await tx
          .delete(schema.gameScores)
          .where(
            and(
              eq(schema.gameScores.playerId, input.playerId),
              inArray(schema.gameScores.gameId, gameIds)
            )
          )
          .returning({ id: schema.gameScores.id });

        return { success: true, deletedCount: deleted.length } as const;
      })
    );
  });
