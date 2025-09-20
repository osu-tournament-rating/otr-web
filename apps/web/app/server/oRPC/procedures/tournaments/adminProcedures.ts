import { ORPCError } from '@orpc/server';
import { and, eq, inArray, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import {
  TournamentAdminMutationResponseSchema,
  TournamentAdminUpdateInputSchema,
  TournamentIdInputSchema,
  TournamentRefetchMatchDataResponseSchema,
  TournamentResetAutomatedChecksInputSchema,
} from '@/lib/orpc/schema/tournament';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';
import { VerificationStatus } from '@otr/core/osu';

const NOW = sql`CURRENT_TIMESTAMP`;

export const updateTournamentAdmin = protectedProcedure
  .input(TournamentAdminUpdateInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: update tournament',
    tags: ['admin'],
    path: '/tournaments/admin/update',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const existing = await context.db.query.tournaments.findFirst({
      columns: { id: true },
      where: eq(schema.tournaments.id, input.id),
    });

    if (!existing) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Tournament not found',
      });
    }

    const shouldAssignReviewer =
      input.verificationStatus === VerificationStatus.Verified ||
      input.verificationStatus === VerificationStatus.Rejected;

    await context.db
      .update(schema.tournaments)
      .set({
        name: input.name,
        abbreviation: input.abbreviation,
        forumUrl: input.forumUrl,
        rankRangeLowerBound: input.rankRangeLowerBound,
        ruleset: input.ruleset,
        lobbySize: input.lobbySize,
        verificationStatus: input.verificationStatus,
        rejectionReason: input.rejectionReason,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        verifiedByUserId: shouldAssignReviewer ? adminUserId : null,
        updated: NOW,
      })
      .where(eq(schema.tournaments.id, input.id));

    return { success: true } as const;
  });

export const resetTournamentAutomatedChecks = protectedProcedure
  .input(TournamentResetAutomatedChecksInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: reset automated checks',
    tags: ['admin'],
    path: '/tournaments/admin/reset-automated-checks',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const statusesToReset = input.overrideVerifiedState
      ? [
          VerificationStatus.PreRejected,
          VerificationStatus.PreVerified,
          VerificationStatus.Rejected,
          VerificationStatus.Verified,
        ]
      : [VerificationStatus.PreRejected, VerificationStatus.PreVerified];

    await context.db.transaction(async (tx) => {
      await tx
        .update(schema.tournaments)
        .set({
          verificationStatus: VerificationStatus.None,
          rejectionReason: 0,
          verifiedByUserId: null,
          updated: NOW,
        })
        .where(
          and(
            eq(schema.tournaments.id, input.id),
            inArray(schema.tournaments.verificationStatus, statusesToReset)
          )
        );

      await tx
        .update(schema.matches)
        .set({
          verificationStatus: VerificationStatus.None,
          rejectionReason: 0,
          warningFlags: 0,
          verifiedByUserId: null,
          updated: NOW,
        })
        .where(
          and(
            eq(schema.matches.tournamentId, input.id),
            inArray(schema.matches.verificationStatus, statusesToReset)
          )
        );

      const matchRows = await tx
        .select({ id: schema.matches.id })
        .from(schema.matches)
        .where(eq(schema.matches.tournamentId, input.id));

      const matchIds = matchRows.map((row) => row.id);

      if (matchIds.length > 0) {
        await tx
          .update(schema.games)
          .set({
            verificationStatus: VerificationStatus.None,
            rejectionReason: 0,
            warningFlags: 0,
            updated: NOW,
          })
          .where(
            and(
              inArray(schema.games.verificationStatus, statusesToReset),
              inArray(schema.games.matchId, matchIds)
            )
          );

        const gameRows = await tx
          .select({ id: schema.games.id })
          .from(schema.games)
          .where(inArray(schema.games.matchId, matchIds));

        const gameIds = gameRows.map((row) => row.id);

        if (gameIds.length > 0) {
          await tx
            .update(schema.gameScores)
            .set({
              verificationStatus: VerificationStatus.None,
              rejectionReason: 0,
              updated: NOW,
            })
            .where(
              and(
                inArray(schema.gameScores.verificationStatus, statusesToReset),
                inArray(schema.gameScores.gameId, gameIds)
              )
            );
        }
      }
    });

    return { success: true } as const;
  });

export const acceptTournamentPreVerificationStatuses = protectedProcedure
  .input(TournamentIdInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: accept pre-verification statuses',
    tags: ['admin'],
    path: '/tournaments/admin/accept-pre-verification-statuses',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    await context.db.transaction(async (tx) => {
      await tx
        .update(schema.tournaments)
        .set({
          verificationStatus: VerificationStatus.Verified,
          rejectionReason: 0,
          verifiedByUserId: adminUserId,
          updated: NOW,
        })
        .where(
          and(
            eq(schema.tournaments.id, input.id),
            eq(
              schema.tournaments.verificationStatus,
              VerificationStatus.PreVerified
            )
          )
        );

      await tx
        .update(schema.tournaments)
        .set({
          verificationStatus: VerificationStatus.Rejected,
          verifiedByUserId: adminUserId,
          updated: NOW,
        })
        .where(
          and(
            eq(schema.tournaments.id, input.id),
            eq(
              schema.tournaments.verificationStatus,
              VerificationStatus.PreRejected
            )
          )
        );

      await tx
        .update(schema.matches)
        .set({
          verificationStatus: VerificationStatus.Verified,
          verifiedByUserId: adminUserId,
          updated: NOW,
        })
        .where(
          and(
            eq(schema.matches.tournamentId, input.id),
            eq(
              schema.matches.verificationStatus,
              VerificationStatus.PreVerified
            )
          )
        );

      await tx
        .update(schema.matches)
        .set({
          verificationStatus: VerificationStatus.Rejected,
          verifiedByUserId: adminUserId,
          updated: NOW,
        })
        .where(
          and(
            eq(schema.matches.tournamentId, input.id),
            eq(
              schema.matches.verificationStatus,
              VerificationStatus.PreRejected
            )
          )
        );

      const matchRows = await tx
        .select({ id: schema.matches.id })
        .from(schema.matches)
        .where(eq(schema.matches.tournamentId, input.id));

      const matchIds = matchRows.map((row) => row.id);

      if (matchIds.length > 0) {
        await tx
          .update(schema.games)
          .set({
            verificationStatus: VerificationStatus.Verified,
            updated: NOW,
          })
          .where(
            and(
              inArray(schema.games.matchId, matchIds),
              eq(
                schema.games.verificationStatus,
                VerificationStatus.PreVerified
              )
            )
          );

        await tx
          .update(schema.games)
          .set({
            verificationStatus: VerificationStatus.Rejected,
            updated: NOW,
          })
          .where(
            and(
              inArray(schema.games.matchId, matchIds),
              eq(
                schema.games.verificationStatus,
                VerificationStatus.PreRejected
              )
            )
          );

        const gameRows = await tx
          .select({ id: schema.games.id })
          .from(schema.games)
          .where(inArray(schema.games.matchId, matchIds));

        const gameIds = gameRows.map((row) => row.id);

        if (gameIds.length > 0) {
          await tx
            .update(schema.gameScores)
            .set({
              verificationStatus: VerificationStatus.Verified,
              updated: NOW,
            })
            .where(
              and(
                inArray(schema.gameScores.gameId, gameIds),
                eq(
                  schema.gameScores.verificationStatus,
                  VerificationStatus.PreVerified
                )
              )
            );

          await tx
            .update(schema.gameScores)
            .set({
              verificationStatus: VerificationStatus.Rejected,
              updated: NOW,
            })
            .where(
              and(
                inArray(schema.gameScores.gameId, gameIds),
                eq(
                  schema.gameScores.verificationStatus,
                  VerificationStatus.PreRejected
                )
              )
            );
        }
      }
    });

    return { success: true } as const;
  });

export const deleteTournamentAdmin = protectedProcedure
  .input(TournamentIdInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: delete tournament',
    tags: ['admin'],
    path: '/tournaments/admin/delete',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const deleted = await context.db
      .delete(schema.tournaments)
      .where(eq(schema.tournaments.id, input.id))
      .returning({ id: schema.tournaments.id });

    if (deleted.length === 0) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Tournament not found',
      });
    }

    return { success: true } as const;
  });

export const deleteTournamentBeatmapsAdmin = protectedProcedure
  .input(TournamentIdInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: delete pooled beatmaps',
    tags: ['admin'],
    path: '/tournaments/admin/delete-beatmaps',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    await context.db
      .delete(schema.joinPooledBeatmaps)
      .where(eq(schema.joinPooledBeatmaps.tournamentsPooledInId, input.id));

    return { success: true } as const;
  });

export const refetchTournamentMatchData = protectedProcedure
  .input(TournamentIdInputSchema)
  .output(TournamentRefetchMatchDataResponseSchema)
  .route({
    summary: 'Admin: refetch tournament match data',
    tags: ['admin'],
    path: '/tournaments/admin/refetch-match-data',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);
    // TODO: RabbitMQ queue message?
    const matches = await context.db
      .update(schema.matches)
      .set({
        dataFetchStatus: 0,
        updated: NOW,
      })
      .where(eq(schema.matches.tournamentId, input.id))
      .returning({ id: schema.matches.id });

    return {
      success: true,
      matchesUpdated: matches.length,
    } as const;
  });
