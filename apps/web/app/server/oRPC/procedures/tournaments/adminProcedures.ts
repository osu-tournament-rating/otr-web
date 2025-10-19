import { ORPCError } from '@orpc/server';
import { and, eq, inArray, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import {
  cascadeMatchRejection,
  cascadeTournamentRejection,
} from '@otr/core/db/rejection-cascade';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { withAuditUserId } from '@otr/core/db';
import {
  TournamentAdminMutationResponseSchema,
  TournamentAdminUpdateInputSchema,
  TournamentIdInputSchema,
  TournamentRefetchMatchDataResponseSchema,
  TournamentResetAutomatedChecksInputSchema,
  type TournamentAdminUpdateInput,
  type TournamentIdInput,
  type TournamentResetAutomatedChecksInput,
} from '@/lib/orpc/schema/tournament';
import type { DatabaseClient } from '@/lib/db';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';
import {
  GameWarningFlags,
  MatchWarningFlags,
  Ruleset,
  VerificationStatus,
} from '@otr/core/osu';
import {
  publishFetchMatchMessage,
  publishProcessTournamentAutomationCheckMessage,
} from '@/lib/queue/publishers';

const NOW = sql`CURRENT_TIMESTAMP`;
export const REFETCH_QUEUE_WARNING =
  'We could not queue match or beatmap fetches. Please contact the o!TR developers.';

export const AUTOMATION_QUEUE_WARNING =
  'We could not queue automated checks. Please contact the o!TR developers.';

interface RefetchMatchDataContext {
  db: DatabaseClient;
  session: {
    dbUser?: {
      id: number;
      scopes?: string[] | null;
    } | null;
  } | null;
}

export interface RefetchMatchDataArgs {
  input: TournamentIdInput;
  context: RefetchMatchDataContext;
}

export async function refetchTournamentMatchDataHandler({
  input,
  context,
}: RefetchMatchDataArgs) {
  const { adminUserId } = ensureAdminSession(context.session);

  const matches: Array<{ id: number; osuId: number }> =
    await context.db.transaction((tx) =>
      withAuditUserId(tx, adminUserId, () =>
        tx
          .update(schema.matches)
          .set({
            dataFetchStatus: DataFetchStatus.NotFetched,
            updated: NOW,
          })
          .where(eq(schema.matches.tournamentId, input.id))
          .returning({
            id: schema.matches.id,
            osuId: schema.matches.osuId,
          })
      )
    );

  const matchOsuIds = Array.from(
    new Set<number>(
      matches
        .map((match) => Number(match.osuId))
        .filter((osuId) => Number.isFinite(osuId))
    )
  );

  const queueTasks: Array<{
    kind: 'match' | 'beatmap';
    id: number;
    promise: Promise<unknown>;
  }> = [];

  matchOsuIds.forEach((osuMatchId) => {
    queueTasks.push({
      kind: 'match',
      id: osuMatchId,
      promise: publishFetchMatchMessage({ osuMatchId }),
    });
  });

  const warnings: string[] = [];

  if (queueTasks.length > 0) {
    const results = await Promise.allSettled(
      queueTasks.map((task) => task.promise)
    );

    const failures = results
      .map((result, index) => ({ result, task: queueTasks[index] }))
      .filter(
        (
          entry
        ): entry is {
          result: PromiseRejectedResult;
          task: (typeof queueTasks)[number];
        } => entry.result.status === 'rejected'
      );

    if (failures.length > 0) {
      warnings.push(REFETCH_QUEUE_WARNING);

      failures.forEach(({ task, result }) => {
        console.error('Failed to publish refetch message', {
          type: task.kind,
          id: task.id,
          error: result.reason,
        });
      });
    }
  }

  return {
    success: true,
    matchesUpdated: matches.length,
    warnings: warnings.length ? warnings : undefined,
  } as const;
}

interface ResetAutomatedChecksContext {
  db: DatabaseClient;
  session: {
    dbUser?: {
      id: number;
      scopes?: string[] | null;
    } | null;
  } | null;
}

export interface ResetAutomatedChecksArgs {
  input: TournamentResetAutomatedChecksInput;
  context: ResetAutomatedChecksContext;
}

export async function resetTournamentAutomatedChecksHandler({
  input,
  context,
}: ResetAutomatedChecksArgs) {
  ensureAdminSession(context.session);

  const warnings: string[] = [];

  try {
    await publishProcessTournamentAutomationCheckMessage({
      tournamentId: input.id,
      overrideVerifiedState: input.overrideVerifiedState ?? false,
    });
  } catch (error) {
    console.error('Failed to publish automated checks reset message', {
      tournamentId: input.id,
      error,
    });
    warnings.push(AUTOMATION_QUEUE_WARNING);
  }

  return {
    success: true,
    warnings: warnings.length ? warnings : undefined,
  } as const;
}

interface UpdateTournamentAdminContext {
  db: DatabaseClient;
  session: {
    dbUser?: {
      id: number;
      scopes?: string[] | null;
    } | null;
  } | null;
}

export interface UpdateTournamentAdminArgs {
  input: TournamentAdminUpdateInput;
  context: UpdateTournamentAdminContext;
}

export async function updateTournamentAdminHandler({
  input,
  context,
}: UpdateTournamentAdminArgs) {
  const { adminUserId } = ensureAdminSession(context.session);

  const existing = await context.db.query.tournaments.findFirst({
    columns: {
      id: true,
      verifiedByUserId: true,
      verificationStatus: true,
      ruleset: true,
    },
    where: eq(schema.tournaments.id, input.id),
  });

  if (!existing) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Tournament not found',
    });
  }

  const verificationStatusChanged =
    input.verificationStatus !== existing.verificationStatus;

  const newStatusRequiresReviewer =
    input.verificationStatus === VerificationStatus.Verified ||
    input.verificationStatus === VerificationStatus.Rejected;

  const shouldPropagateManiaVariant =
    existing.ruleset === Ruleset.ManiaOther &&
    (input.ruleset === Ruleset.Mania4k || input.ruleset === Ruleset.Mania7k);

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

      await tx
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
          verifiedByUserId,
          updated: NOW,
        })
        .where(eq(schema.tournaments.id, input.id));

      if (shouldPropagateManiaVariant) {
        await alignTournamentChildRulesets(tx, input.id, input.ruleset);
      }

      if (input.verificationStatus === VerificationStatus.Verified) {
        await clearTournamentWarningFlags(tx, input.id);
      }

      if (input.verificationStatus === VerificationStatus.Rejected) {
        await cascadeTournamentRejection(tx, [input.id], {
          updatedAt: NOW,
        });
      }
    })
  );

  return { success: true } as const;
}

export const updateTournamentAdmin = protectedProcedure
  .input(TournamentAdminUpdateInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Update tournament',
    tags: ['admin'],
    method: 'PATCH',
    path: '/tournaments/{id}',
  })
  .handler(({ input, context }) =>
    updateTournamentAdminHandler({ input, context })
  );

async function alignTournamentChildRulesets(
  tx: Pick<DatabaseClient, 'select' | 'update'>,
  tournamentId: number,
  nextRuleset: Ruleset
) {
  const matchRows = await tx
    .select({ id: schema.matches.id })
    .from(schema.matches)
    .where(eq(schema.matches.tournamentId, tournamentId));

  if (matchRows.length === 0) {
    return;
  }

  const matchIds = matchRows.map((row) => row.id);

  const gameRows = await tx
    .select({ id: schema.games.id })
    .from(schema.games)
    .where(inArray(schema.games.matchId, matchIds));

  if (gameRows.length === 0) {
    return;
  }

  const gameIds = gameRows.map((row) => row.id);

  // Propogate variants to games/scores
  await tx
    .update(schema.games)
    .set({
      ruleset: nextRuleset,
      updated: NOW,
    })
    .where(inArray(schema.games.id, gameIds));

  await tx
    .update(schema.gameScores)
    .set({
      ruleset: nextRuleset,
      updated: NOW,
    })
    .where(inArray(schema.gameScores.gameId, gameIds));
}

async function clearTournamentWarningFlags(
  tx: Pick<DatabaseClient, 'select' | 'update'>,
  tournamentId: number
) {
  await tx
    .update(schema.matches)
    .set({
      warningFlags: MatchWarningFlags.None,
      updated: NOW,
    })
    .where(
      and(
        eq(schema.matches.tournamentId, tournamentId),
        eq(schema.matches.verificationStatus, VerificationStatus.Verified)
      )
    );

  const verifiedMatches = await tx
    .select({ id: schema.matches.id })
    .from(schema.matches)
    .where(
      and(
        eq(schema.matches.tournamentId, tournamentId),
        eq(schema.matches.verificationStatus, VerificationStatus.Verified)
      )
    );

  const matchIds = verifiedMatches.map((match) => match.id);

  if (matchIds.length === 0) {
    return;
  }

  await tx
    .update(schema.games)
    .set({
      warningFlags: GameWarningFlags.None,
      updated: NOW,
    })
    .where(
      and(
        inArray(schema.games.matchId, matchIds),
        eq(schema.games.verificationStatus, VerificationStatus.Verified)
      )
    );
}

export const resetTournamentAutomatedChecks = protectedProcedure
  .input(TournamentResetAutomatedChecksInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Reset tournament automated checks',
    tags: ['admin'],
    method: 'POST',
    path: '/tournaments/{id}:reset-automated-checks',
  })
  .handler(async ({ input, context }) =>
    resetTournamentAutomatedChecksHandler({ input, context })
  );

export const acceptTournamentPreVerificationStatuses = protectedProcedure
  .input(TournamentIdInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Accept tournament pre-verification statuses',
    tags: ['admin'],
    method: 'POST',
    path: '/tournaments/{id}:accept-pre-verification-statuses',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    await context.db.transaction((tx) =>
      withAuditUserId(tx, adminUserId, async () => {
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
            warningFlags: MatchWarningFlags.None,
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

        const rejectedMatches = await tx
          .update(schema.matches)
          .set({
            verificationStatus: VerificationStatus.Rejected,
            warningFlags: MatchWarningFlags.None,
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
          )
          .returning({ id: schema.matches.id });

        if (rejectedMatches.length > 0) {
          await cascadeMatchRejection(
            tx,
            rejectedMatches.map((match) => match.id),
            {
              updatedAt: NOW,
            }
          );
        }

        const matchRows = await tx
          .select({
            id: schema.matches.id,
            verificationStatus: schema.matches.verificationStatus,
          })
          .from(schema.matches)
          .where(eq(schema.matches.tournamentId, input.id));

        const matchIds = matchRows.map((row) => row.id);
        const verifiedMatchIds = matchRows
          .filter(
            (row) => row.verificationStatus === VerificationStatus.Verified
          )
          .map((row) => row.id);

        if (matchIds.length > 0) {
          if (verifiedMatchIds.length > 0) {
            await tx
              .update(schema.games)
              .set({
                verificationStatus: VerificationStatus.Verified,
                warningFlags: GameWarningFlags.None,
                updated: NOW,
              })
              .where(
                and(
                  inArray(schema.games.matchId, verifiedMatchIds),
                  eq(
                    schema.games.verificationStatus,
                    VerificationStatus.PreVerified
                  )
                )
              );
          }

          await tx
            .update(schema.games)
            .set({
              verificationStatus: VerificationStatus.Rejected,
              warningFlags: GameWarningFlags.None,
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
            .select({
              id: schema.games.id,
              verificationStatus: schema.games.verificationStatus,
            })
            .from(schema.games)
            .where(inArray(schema.games.matchId, matchIds));

          const gameIds = gameRows.map((row) => row.id);
          const verifiedGameIds = gameRows
            .filter(
              (row) => row.verificationStatus === VerificationStatus.Verified
            )
            .map((row) => row.id);
          const rejectedGameIds = gameRows
            .filter(
              (row) => row.verificationStatus === VerificationStatus.Rejected
            )
            .map((row) => row.id);

          if (verifiedGameIds.length > 0) {
            await tx
              .update(schema.gameScores)
              .set({
                verificationStatus: VerificationStatus.Verified,
                updated: NOW,
              })
              .where(
                and(
                  inArray(schema.gameScores.gameId, verifiedGameIds),
                  eq(
                    schema.gameScores.verificationStatus,
                    VerificationStatus.PreVerified
                  )
                )
              );
          }

          if (rejectedGameIds.length > 0) {
            await tx
              .update(schema.gameScores)
              .set({
                verificationStatus: VerificationStatus.Rejected,
                updated: NOW,
              })
              .where(inArray(schema.gameScores.gameId, rejectedGameIds));
          }

          if (gameIds.length > 0) {
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
      })
    );

    return { success: true } as const;
  });

export const deleteTournamentAdmin = protectedProcedure
  .input(TournamentIdInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Delete tournament',
    tags: ['admin'],
    method: 'DELETE',
    path: '/tournaments/{id}',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const deleted = await context.db.transaction((tx) =>
      withAuditUserId(tx, adminUserId, () =>
        tx
          .delete(schema.tournaments)
          .where(eq(schema.tournaments.id, input.id))
          .returning({ id: schema.tournaments.id })
      )
    );

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
    summary: 'Delete tournament beatmaps',
    tags: ['admin'],
    method: 'DELETE',
    path: '/tournaments/{id}/beatmaps',
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
    summary: 'Refetch tournament match data',
    tags: ['admin'],
    method: 'POST',
    path: '/tournaments/{id}:refetch-match-data',
  })
  .handler(async ({ input, context }) =>
    refetchTournamentMatchDataHandler({ input, context })
  );
