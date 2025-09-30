import { ORPCError } from '@orpc/server';
import { eq, inArray, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { cascadeGameRejection } from '@otr/core/db/rejection-cascade';
import {
  GameAdminDeleteInputSchema,
  GameAdminLookupInputSchema,
  GameAdminMergeInputSchema,
  GameAdminMergeResponseSchema,
  GameAdminMutationResponseSchema,
  GameAdminPreviewSchema,
  GameAdminUpdateInputSchema,
} from '@/lib/orpc/schema/match';
import { VerificationStatus } from '@otr/core/osu';

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

    await context.db.transaction(async (tx) => {
      await tx
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

      if (input.verificationStatus === VerificationStatus.Rejected) {
        await cascadeGameRejection(tx, [input.id], {
          updatedAt: NOW,
        });
      }
    });

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

export const mergeGameAdmin = protectedProcedure
  .input(GameAdminMergeInputSchema)
  .output(GameAdminMergeResponseSchema)
  .route({
    summary: 'Admin: merge games',
    tags: ['admin'],
    path: '/games/admin/merge',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const childIds = Array.from(new Set(input.childGameIds));

    if (childIds.includes(input.id)) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Cannot merge a game into itself',
      });
    }

    if (childIds.length === 0) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'At least one child game is required',
      });
    }

    return context.db.transaction(async (tx) => {
      const [parentGame] = await tx
        .select({
          id: schema.games.id,
          matchId: schema.games.matchId,
          beatmapId: schema.games.beatmapId,
        })
        .from(schema.games)
        .where(eq(schema.games.id, input.id))
        .limit(1);

      if (!parentGame) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Parent game not found',
        });
      }

      const childGames = await tx
        .select({
          id: schema.games.id,
          matchId: schema.games.matchId,
          beatmapId: schema.games.beatmapId,
        })
        .from(schema.games)
        .where(inArray(schema.games.id, childIds));

      if (childGames.length !== childIds.length) {
        const foundIds = new Set(childGames.map((game) => game.id));
        const missingIds = childIds.filter((id) => !foundIds.has(id));

        throw new ORPCError('NOT_FOUND', {
          message: `Games not found: ${missingIds.join(', ')}`,
        });
      }

      const mismatchedMatch = childGames.find(
        (game) => game.matchId !== parentGame.matchId
      );

      if (mismatchedMatch) {
        throw new ORPCError('BAD_REQUEST', {
          message:
            'All child games must belong to the same match as the parent game to merge',
        });
      }

      const parentBeatmapId = parentGame.beatmapId ?? null;
      const mismatchedBeatmap = childGames.find(
        (game) => (game.beatmapId ?? null) !== parentBeatmapId
      );

      if (mismatchedBeatmap) {
        throw new ORPCError('BAD_REQUEST', {
          message:
            'All child games must share the same beatmap as the parent game to merge',
        });
      }

      const parentScores = await tx
        .select({ playerId: schema.gameScores.playerId })
        .from(schema.gameScores)
        .where(eq(schema.gameScores.gameId, parentGame.id));

      const parentPlayerIds = new Set(
        parentScores.map((score) => score.playerId)
      );

      const childScores = await tx
        .select({
          gameId: schema.gameScores.gameId,
          playerId: schema.gameScores.playerId,
        })
        .from(schema.gameScores)
        .where(inArray(schema.gameScores.gameId, childIds));

      const allPlayerIds = new Set<number>([
        ...parentPlayerIds,
        ...childScores.map((score) => score.playerId),
      ]);

      const playerRows = allPlayerIds.size
        ? await tx
            .select({
              id: schema.players.id,
              username: schema.players.username,
            })
            .from(schema.players)
            .where(inArray(schema.players.id, Array.from(allPlayerIds)))
        : [];

      const playerNames = new Map<number, string>();
      for (const row of playerRows) {
        playerNames.set(row.id, row.username);
      }

      for (const score of childScores) {
        if (parentPlayerIds.has(score.playerId)) {
          const username = playerNames.get(score.playerId);
          throw new ORPCError('BAD_REQUEST', {
            message: username
              ? `Player '${username}' already has a score in the parent game`
              : `Player ${score.playerId} already has a score in the parent game`,
          });
        }

        parentPlayerIds.add(score.playerId);
      }

      const movedScores = await tx
        .update(schema.gameScores)
        .set({ gameId: parentGame.id })
        .where(inArray(schema.gameScores.gameId, childIds))
        .returning({ id: schema.gameScores.id });

      await tx.delete(schema.games).where(inArray(schema.games.id, childIds));

      return {
        success: true,
        mergedGameCount: childIds.length,
        movedScoreCount: movedScores.length,
      } as const;
    });
  });

export const lookupGamesAdmin = protectedProcedure
  .input(GameAdminLookupInputSchema)
  .output(GameAdminPreviewSchema.array())
  .route({
    summary: 'Admin: fetch games by id',
    tags: ['admin'],
    path: '/games/admin/lookup',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const ids = Array.from(new Set(input.ids));

    const gameRows = await context.db
      .select({
        id: schema.games.id,
        matchId: schema.games.matchId,
        startTime: schema.games.startTime,
        beatmapOsuId: schema.beatmaps.osuId,
        beatmapTitle: schema.beatmapsets.title,
        beatmapDifficulty: schema.beatmaps.diffName,
      })
      .from(schema.games)
      .leftJoin(schema.beatmaps, eq(schema.beatmaps.id, schema.games.beatmapId))
      .leftJoin(
        schema.beatmapsets,
        eq(schema.beatmapsets.id, schema.beatmaps.beatmapsetId)
      )
      .where(inArray(schema.games.id, ids));

    if (gameRows.length !== ids.length) {
      const foundIds = new Set(gameRows.map((row) => row.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));

      throw new ORPCError('NOT_FOUND', {
        message: `Games not found: ${missingIds.join(', ')}`,
      });
    }

    const scoreRows = await context.db
      .select({ gameId: schema.gameScores.gameId })
      .from(schema.gameScores)
      .where(inArray(schema.gameScores.gameId, ids));

    const scoreCounts = new Map<number, number>();
    for (const row of scoreRows) {
      scoreCounts.set(row.gameId, (scoreCounts.get(row.gameId) ?? 0) + 1);
    }

    const rowsById = new Map(gameRows.map((row) => [row.id, row] as const));

    return ids.map((id) => {
      const row = rowsById.get(id);
      if (!row) {
        throw new ORPCError('NOT_FOUND', {
          message: `Game ${id} not found`,
        });
      }

      const parsedStartTime = (() => {
        if (!row.startTime) {
          return null;
        }

        const date = new Date(row.startTime);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      })();

      return GameAdminPreviewSchema.parse({
        id,
        matchId: row.matchId,
        beatmapOsuId: row.beatmapOsuId ?? null,
        beatmapTitle: row.beatmapTitle ?? null,
        beatmapDifficulty: row.beatmapDifficulty ?? null,
        scoresCount: scoreCounts.get(id) ?? 0,
        startTime: parsedStartTime,
      });
    });
  });
