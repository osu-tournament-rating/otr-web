import { ORPCError } from '@orpc/server';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { withAuditUserId } from '@otr/core/db';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import {
  BeatmapAdminUpdateInputSchema,
  BeatmapAdminUpdateResponseSchema,
} from '@/lib/orpc/schema/beatmap';
import type { DatabaseClient } from '@/lib/db';
import { publishFetchPlayerMessage } from '@/lib/queue/publishers';

import { adminMutationProcedure } from '../base';
import {
  ensureAdminDataMutationAllowed,
  ensureAdminSession,
} from '../shared/adminGuard';

const NOW = sql`CURRENT_TIMESTAMP`;

export const updateBeatmapAdmin = adminMutationProcedure
  .input(BeatmapAdminUpdateInputSchema)
  .output(BeatmapAdminUpdateResponseSchema)
  .route({
    summary: 'Update a deleted beatmap',
    tags: ['admin'],
    method: 'PATCH',
    path: '/beatmaps/{id}',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);
    ensureAdminDataMutationAllowed(context);

    const existing = await context.db.query.beatmaps.findFirst({
      columns: {
        id: true,
        dataFetchStatus: true,
      },
      where: eq(schema.beatmaps.id, input.id),
    });

    if (!existing) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Beatmap not found',
      });
    }

    if (existing.dataFetchStatus !== DataFetchStatus.NotFound) {
      throw new ORPCError('CONFLICT', {
        message:
          'Only beatmaps the osu! API no longer serves can be edited by hand',
      });
    }

    const creatorOsuIds = Array.from(new Set(input.creatorOsuIds));
    const queuedPlayerOsuIds: number[] = [];

    await context.db.transaction((tx) =>
      withAuditUserId(tx, adminUserId, async () => {
        const [setOwnerId] = input.setOwnerOsuId
          ? await resolveCreatorPlayerIds(
              tx,
              [input.setOwnerOsuId],
              queuedPlayerOsuIds
            )
          : [];

        await tx
          .update(schema.beatmaps)
          .set({
            diffName: input.diffName,
            ruleset: input.ruleset,
            rankedStatus: input.rankedStatus,
            totalLength: input.totalLength,
            drainLength: input.drainLength,
            bpm: input.bpm,
            countCircle: input.countCircle,
            countSlider: input.countSlider,
            countSpinner: input.countSpinner,
            cs: input.cs,
            hp: input.hp,
            od: input.od,
            ar: input.ar,
            sr: input.sr,
            maxCombo: input.maxCombo,
            title: input.title || null,
            artist: input.artist || null,
            setOwnerId: setOwnerId ?? null,
            manualOverride: true,
            updated: NOW,
          })
          .where(eq(schema.beatmaps.id, input.id));

        const previousCreators = await tx
          .select({ osuId: schema.players.osuId })
          .from(schema.joinBeatmapCreators)
          .innerJoin(
            schema.players,
            eq(schema.players.id, schema.joinBeatmapCreators.creatorsId)
          )
          .where(eq(schema.joinBeatmapCreators.createdBeatmapsId, input.id));

        const creatorPlayerIds = await resolveCreatorPlayerIds(
          tx,
          creatorOsuIds,
          queuedPlayerOsuIds
        );

        await tx
          .delete(schema.joinBeatmapCreators)
          .where(
            and(
              eq(schema.joinBeatmapCreators.createdBeatmapsId, input.id),
              creatorPlayerIds.length > 0
                ? notInArray(
                    schema.joinBeatmapCreators.creatorsId,
                    creatorPlayerIds
                  )
                : undefined
            )
          );

        if (creatorPlayerIds.length > 0) {
          await tx
            .insert(schema.joinBeatmapCreators)
            .values(
              creatorPlayerIds.map((creatorsId) => ({
                createdBeatmapsId: input.id,
                creatorsId,
              }))
            )
            .onConflictDoNothing();
        }

        await recordCreatorAudit(
          tx,
          input.id,
          adminUserId,
          previousCreators.map((row) => row.osuId).sort((a, b) => a - b),
          [...creatorOsuIds].sort((a, b) => a - b)
        );
      })
    );

    for (const osuId of queuedPlayerOsuIds) {
      try {
        await publishFetchPlayerMessage({ osuPlayerId: osuId });
      } catch (error) {
        console.error('Failed to publish player fetch message', {
          osuId,
          error,
        });
      }
    }

    return { success: true };
  });

type TransactionClient = Parameters<
  Parameters<DatabaseClient['transaction']>[0]
>[0];

/** Creates a placeholder for any creator o!TR has never seen. */
const resolveCreatorPlayerIds = async (
  tx: TransactionClient,
  creatorOsuIds: number[],
  queuedPlayerOsuIds: number[]
): Promise<number[]> => {
  if (creatorOsuIds.length === 0) {
    return [];
  }

  const known = await tx
    .select({ id: schema.players.id, osuId: schema.players.osuId })
    .from(schema.players)
    .where(inArray(schema.players.osuId, creatorOsuIds));

  const idByOsuId = new Map(known.map((row) => [row.osuId, row.id]));
  const missing = creatorOsuIds.filter((osuId) => !idByOsuId.has(osuId));

  if (missing.length > 0) {
    const inserted = await tx
      .insert(schema.players)
      .values(missing.map((osuId) => ({ osuId })))
      .onConflictDoNothing()
      .returning({ id: schema.players.id, osuId: schema.players.osuId });

    for (const row of inserted) {
      idByOsuId.set(row.osuId, row.id);
      queuedPlayerOsuIds.push(row.osuId);
    }
  }

  return creatorOsuIds
    .map((osuId) => idByOsuId.get(osuId))
    .filter((id): id is number => id != null);
};

/** The creator join table has no trigger, so the diff is written explicitly. */
const recordCreatorAudit = async (
  tx: TransactionClient,
  beatmapId: number,
  adminUserId: number,
  before: number[],
  after: number[]
) => {
  if (
    before.length === after.length &&
    before.every((osuId, index) => osuId === after[index])
  ) {
    return;
  }

  await tx.execute(sql`
    insert into beatmap_audits (
      event_id,
      reference_id_lock,
      reference_id,
      action_user_id,
      action_type,
      changes
    )
    values (
      public.resolve_audit_event_id(${adminUserId}),
      ${beatmapId},
      ${beatmapId},
      ${adminUserId},
      1,
      jsonb_build_object(
        'creators',
        jsonb_build_object(
          'originalValue', ${JSON.stringify(before)}::jsonb,
          'newValue', ${JSON.stringify(after)}::jsonb
        )
      )
    )
  `);
};
