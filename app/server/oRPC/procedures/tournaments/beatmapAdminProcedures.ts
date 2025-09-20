import { ORPCError } from '@orpc/server';
import { and, eq, inArray } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import {
  TournamentBeatmapAdminMutationInputSchema,
  TournamentBeatmapAdminMutationResponseSchema,
} from '@/lib/orpc/schema/tournament';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';

const PLACEHOLDER_DIFF_NAME = 'Pending fetch';
const PLACEHOLDER_NUMBER = 0;

type BeatmapInsert = typeof schema.beatmaps.$inferInsert;

const createPlaceholderBeatmap = (
  osuId: number,
  ruleset: number
): BeatmapInsert => ({
  osuId,
  ruleset,
  rankedStatus: PLACEHOLDER_NUMBER,
  diffName: PLACEHOLDER_DIFF_NAME,
  totalLength: PLACEHOLDER_NUMBER,
  drainLength: PLACEHOLDER_NUMBER,
  bpm: PLACEHOLDER_NUMBER,
  countCircle: PLACEHOLDER_NUMBER,
  countSlider: PLACEHOLDER_NUMBER,
  countSpinner: PLACEHOLDER_NUMBER,
  cs: PLACEHOLDER_NUMBER,
  hp: PLACEHOLDER_NUMBER,
  od: PLACEHOLDER_NUMBER,
  ar: PLACEHOLDER_NUMBER,
  sr: PLACEHOLDER_NUMBER,
  maxCombo: null,
  beatmapsetId: null,
  dataFetchStatus: PLACEHOLDER_NUMBER,
});

export const manageTournamentBeatmapsAdmin = protectedProcedure
  .input(TournamentBeatmapAdminMutationInputSchema)
  .output(TournamentBeatmapAdminMutationResponseSchema)
  .route({
    summary: 'Admin: manage pooled beatmaps',
    tags: ['admin'],
    path: '/tournaments/admin/manage-beatmaps',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const tournament = await context.db.query.tournaments.findFirst({
      columns: { id: true, ruleset: true },
      where: eq(schema.tournaments.id, input.tournamentId),
    });

    if (!tournament) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Tournament not found',
      });
    }

    const addOsuIds = Array.from(new Set(input.addBeatmapOsuIds));
    const removeIds = Array.from(new Set(input.removeBeatmapIds));

    let addedCount = 0;
    let skippedCount = 0;

    if (addOsuIds.length === 0 && removeIds.length === 0) {
      return {
        success: true,
        addedCount,
        skippedCount,
      } as const;
    }

    await context.db.transaction(async (tx) => {
      if (addOsuIds.length > 0) {
        const existingBeatmaps = await tx
          .select({
            id: schema.beatmaps.id,
            osuId: schema.beatmaps.osuId,
          })
          .from(schema.beatmaps)
          .where(inArray(schema.beatmaps.osuId, addOsuIds));

        const existingMap = new Map<number, number>();
        existingBeatmaps.forEach((beatmap) => {
          existingMap.set(Number(beatmap.osuId), beatmap.id);
        });

        const missingOsuIds = addOsuIds.filter(
          (osuId) => !existingMap.has(osuId)
        );

        if (missingOsuIds.length > 0) {
          const placeholderRows = missingOsuIds.map((osuId) =>
            createPlaceholderBeatmap(osuId, tournament.ruleset)
          );

          if (placeholderRows.length > 0) {
            const insertedBeatmaps = await tx
              .insert(schema.beatmaps)
              .values(placeholderRows)
              .onConflictDoNothing({
                target: schema.beatmaps.osuId,
              })
              .returning({
                id: schema.beatmaps.id,
                osuId: schema.beatmaps.osuId,
              });

            insertedBeatmaps.forEach((beatmap) => {
              existingMap.set(Number(beatmap.osuId), beatmap.id);
            });
          }

          if (missingOsuIds.some((osuId) => !existingMap.has(osuId))) {
            const refreshedBeatmaps = await tx
              .select({
                id: schema.beatmaps.id,
                osuId: schema.beatmaps.osuId,
              })
              .from(schema.beatmaps)
              .where(inArray(schema.beatmaps.osuId, missingOsuIds));

            refreshedBeatmaps.forEach((beatmap) => {
              existingMap.set(Number(beatmap.osuId), beatmap.id);
            });
          }

          // TODO: publish beatmap fetch request to RabbitMQ for newly created osu! beatmap IDs.
        }

        const beatmapIdsForJoin = addOsuIds
          .map((osuId) => {
            const beatmapId = existingMap.get(osuId);
            if (!beatmapId) {
              return null;
            }

            return {
              pooledBeatmapsId: beatmapId,
              tournamentsPooledInId: input.tournamentId,
            } satisfies typeof schema.joinPooledBeatmaps.$inferInsert;
          })
          .filter(Boolean) as (typeof schema.joinPooledBeatmaps.$inferInsert)[];

        if (beatmapIdsForJoin.length > 0) {
          const beatmapIds = beatmapIdsForJoin.map(
            (value) => value.pooledBeatmapsId
          );

          const existingJoins = await tx
            .select({
              beatmapId: schema.joinPooledBeatmaps.pooledBeatmapsId,
            })
            .from(schema.joinPooledBeatmaps)
            .where(
              and(
                eq(
                  schema.joinPooledBeatmaps.tournamentsPooledInId,
                  input.tournamentId
                ),
                inArray(schema.joinPooledBeatmaps.pooledBeatmapsId, beatmapIds)
              )
            );

          const existingJoinSet = new Set(
            existingJoins.map((row) => row.beatmapId)
          );

          const joinValues = beatmapIdsForJoin.filter(
            (value) => !existingJoinSet.has(value.pooledBeatmapsId)
          );

          skippedCount += beatmapIdsForJoin.length - joinValues.length;

          if (joinValues.length > 0) {
            await tx
              .insert(schema.joinPooledBeatmaps)
              .values(joinValues)
              .onConflictDoNothing();

            addedCount += joinValues.length;
          }
        }
      }

      if (removeIds.length > 0) {
        await tx
          .delete(schema.joinPooledBeatmaps)
          .where(
            and(
              eq(
                schema.joinPooledBeatmaps.tournamentsPooledInId,
                input.tournamentId
              ),
              inArray(schema.joinPooledBeatmaps.pooledBeatmapsId, removeIds)
            )
          );
      }
    });

    return {
      success: true,
      addedCount,
      skippedCount,
    } as const;
  });
