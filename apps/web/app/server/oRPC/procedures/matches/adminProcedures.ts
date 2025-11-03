import { ORPCError } from '@orpc/server';
import { and, eq, inArray, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { syncTournamentDateRange, withAuditUserId } from '@otr/core/db';
import { cascadeMatchRejection } from '@otr/core/db/rejection-cascade';
import {
  MatchAdminDeleteInputSchema,
  MatchAdminDeletePlayerScoresInputSchema,
  MatchAdminDeletePlayerScoresResponseSchema,
  MatchAdminMergeInputSchema,
  MatchAdminMergeResponseSchema,
  MatchAdminMutationResponseSchema,
  MatchAdminRefreshAllInputSchema,
  MatchAdminRefreshAllResponseSchema,
  MatchAdminUpdateInputSchema,
} from '@/lib/orpc/schema/match';
import {
  GameWarningFlags,
  MatchWarningFlags,
  VerificationStatus,
} from '@otr/core/osu';
import type { DatabaseClient } from '@/lib/db';
import { publishFetchMatchMessage } from '@/lib/queue/publishers';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';

const NOW = sql`CURRENT_TIMESTAMP`;

export const updateMatchAdmin = protectedProcedure
  .input(MatchAdminUpdateInputSchema)
  .output(MatchAdminMutationResponseSchema)
  .route({
    summary: 'Update match',
    tags: ['admin'],
    method: 'PATCH',
    path: '/matches/{id}',
  })
  .handler(async ({ input, context }) => {
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
          await cascadeClearWarningFlags(tx, input.id);
        }

        if (input.verificationStatus === VerificationStatus.Rejected) {
          await cascadeMatchRejection(tx, [input.id], {
            updatedAt: NOW,
          });
        }
      })
    );

    return { success: true } as const;
  });

async function cascadeClearWarningFlags(
  tx: Pick<DatabaseClient, 'update'>,
  matchId: number
) {
  await tx
    .update(schema.games)
    .set({
      warningFlags: GameWarningFlags.None,
      updated: NOW,
    })
    .where(
      and(
        eq(schema.games.matchId, matchId),
        eq(schema.games.verificationStatus, VerificationStatus.Verified)
      )
    );
}

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

export const refetchAllMatchData = protectedProcedure
  .input(MatchAdminRefreshAllInputSchema)
  .output(MatchAdminRefreshAllResponseSchema)
  .route({
    summary: 'Refresh all match data',
    tags: ['admin'],
    method: 'POST',
    path: '/matches:refetchAll',
  })
  .handler(async ({ context }) => {
    ensureAdminSession(context.session);

    const matches: Array<{ id: number; osuId: number }> = await context.db
      .select({
        id: schema.matches.id,
        osuId: schema.matches.osuId,
      })
      .from(schema.matches);

    const matchOsuIds = Array.from(
      new Set<number>(
        matches
          .map((match) => Number(match.osuId))
          .filter((osuId) => Number.isFinite(osuId))
      )
    );

    const publishInBackground = async () => {
      const BATCH_SIZE = 100;
      const BATCH_DELAY_MS = 10;
      let totalPublished = 0;
      let totalFailures = 0;

      console.log(
        `[admin] Starting background publish of ${matchOsuIds.length} match refetch messages`
      );

      for (let i = 0; i < matchOsuIds.length; i += BATCH_SIZE) {
        const batch = matchOsuIds.slice(i, i + BATCH_SIZE);

        for (const osuMatchId of batch) {
          try {
            await publishFetchMatchMessage({ osuMatchId });
            totalPublished++;
          } catch (error) {
            totalFailures++;
            console.error('Failed to publish refetch message', {
              type: 'match',
              id: osuMatchId,
              error,
            });
          }
        }

        if (i + BATCH_SIZE < matchOsuIds.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }

        if ((i + BATCH_SIZE) % 1000 === 0) {
          console.log(
            `[admin] Published ${totalPublished}/${matchOsuIds.length} match refetch messages (${totalFailures} failures)`
          );
        }
      }

      console.log(
        `[admin] Completed publishing ${totalPublished} match refetch messages (${totalFailures} failures)`
      );
    };

    publishInBackground().catch((error) => {
      console.error('[admin] Background publish failed:', error);
    });

    return {
      success: true,
      matchesUpdated: matches.length,
      warnings: [
        `Queuing ${matchOsuIds.length} matches for refetch. This will continue in the background and may take several minutes to complete. Check server logs for progress.`,
      ],
    } as const;
  });
