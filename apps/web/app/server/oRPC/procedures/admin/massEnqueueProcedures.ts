import { inArray, sql } from 'drizzle-orm';
import { eventIterator } from '@orpc/server';

import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { withAuditUserId } from '@otr/core/db';
import { MessagePriority } from '@otr/core';
import {
  AdminMassEnqueueInputSchema,
  AdminMassEnqueueProgressEventSchema,
  type AdminMassEnqueueInput,
} from '@/lib/orpc/schema/admin';
import type { DatabaseClient } from '@/lib/db';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';
import { getCorrelationId } from '../logging/helpers';
import {
  publishFetchBeatmapMessage,
  publishFetchMatchMessage,
} from '@/lib/queue/publishers';

const NOW = sql`CURRENT_TIMESTAMP`;
const REFETCH_QUEUE_WARNING = 'Failed to enqueue match or beatmap fetches';
const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 100;

interface MassEnqueueContext {
  db: DatabaseClient;
  session: {
    dbUser?: {
      id: number;
      scopes?: string[] | null;
    } | null;
  } | null;
}

export interface MassEnqueueArgs {
  input: AdminMassEnqueueInput;
  context: MassEnqueueContext;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Handles mass enqueueing of beatmaps and matches for refetch.
 * Updates database records and publishes messages to the queue in batches.
 * Yields progress events during processing and a completion event at the end.
 *
 * @yields {AdminMassEnqueueProgressEvent} Progress or completion events
 * @throws {ORPCError} If user lacks admin privileges
 */
export async function* massEnqueueHandler({ input, context }: MassEnqueueArgs) {
  const { adminUserId } = ensureAdminSession(context.session);

  const { beatmapIds, matchIds, priority } = input;

  const priorityValue = (() => {
    switch (priority) {
      case 'Low':
        return MessagePriority.Low;
      case 'High':
        return MessagePriority.High;
      case 'Normal':
      default:
        return MessagePriority.Normal;
    }
  })();

  const correlationId = getCorrelationId(context);
  const warnings: string[] = [];
  let beatmapsUpdated = 0;
  let beatmapsSkipped = 0;
  let matchesUpdated = 0;
  let matchesSkipped = 0;

  if (beatmapIds.length > 0) {
    const uniqueBeatmapIds = Array.from(new Set(beatmapIds));

    const existingBeatmaps = await context.db
      .select({
        id: schema.beatmaps.id,
        osuId: schema.beatmaps.osuId,
        dataFetchStatus: schema.beatmaps.dataFetchStatus,
      })
      .from(schema.beatmaps)
      .where(inArray(schema.beatmaps.osuId, uniqueBeatmapIds));

    const beatmapsToUpdate = existingBeatmaps.filter(
      (b) => b.dataFetchStatus !== DataFetchStatus.NotFound
    );

    beatmapsSkipped = uniqueBeatmapIds.length - beatmapsToUpdate.length;

    if (beatmapsToUpdate.length > 0) {
      const beatmapDbIds = beatmapsToUpdate.map((b) => b.id);

      await context.db.transaction((tx) =>
        withAuditUserId(tx, adminUserId, () =>
          tx
            .update(schema.beatmaps)
            .set({
              dataFetchStatus: DataFetchStatus.NotFetched,
              updated: NOW,
            })
            .where(inArray(schema.beatmaps.id, beatmapDbIds))
        )
      );

      const beatmapChunks = chunkArray(beatmapsToUpdate, BATCH_SIZE);
      const totalBatches = beatmapChunks.length;
      const shouldYieldProgress = totalBatches >= 2;
      let hasQueueWarning = false;
      let beatmapsQueued = 0;

      for (let i = 0; i < beatmapChunks.length; i++) {
        const chunk = beatmapChunks[i];
        if (!chunk) continue;

        const queueTasks = chunk.map((b) => ({
          beatmapId: b.osuId,
          promise: publishFetchBeatmapMessage(
            {
              beatmapId: b.osuId,
              skipAutomationChecks: false,
            },
            {
              metadata: {
                priority: priorityValue,
                ...(correlationId && { correlationId }),
              },
            }
          ),
        }));

        const results = await Promise.allSettled(
          queueTasks.map((t) => t.promise)
        );
        const successes = results.filter((r) => r.status === 'fulfilled');
        beatmapsQueued += successes.length;

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0 && !hasQueueWarning) {
          warnings.push(REFETCH_QUEUE_WARNING);
          hasQueueWarning = true;
        }
        failures.forEach((failure, index) => {
          console.error('Failed to publish beatmap fetch message', {
            beatmapId: queueTasks[index]?.beatmapId,
            error: failure.status === 'rejected' ? failure.reason : null,
          });
        });

        if (shouldYieldProgress) {
          const itemsProcessed = (i + 1) * BATCH_SIZE;
          yield {
            type: 'progress' as const,
            phase: 'beatmaps' as const,
            currentBatch: i + 1,
            totalBatches,
            itemsProcessed: Math.min(itemsProcessed, beatmapsToUpdate.length),
            totalItems: beatmapsToUpdate.length,
            message: `Processing beatmaps (Batch ${i + 1} of ${totalBatches})`,
          };
        }

        if (i < beatmapChunks.length - 1) {
          await delay(BATCH_DELAY_MS);
        }
      }

      beatmapsUpdated = beatmapsQueued;
    }
  }

  if (matchIds.length > 0) {
    const uniqueMatchIds = Array.from(new Set(matchIds));

    const existingMatches = await context.db
      .select({
        id: schema.matches.id,
        osuId: schema.matches.osuId,
        isLazer: schema.matches.isLazer,
        dataFetchStatus: schema.matches.dataFetchStatus,
      })
      .from(schema.matches)
      .where(inArray(schema.matches.osuId, uniqueMatchIds));

    const matchesToUpdate = existingMatches.filter(
      (m) => m.dataFetchStatus !== DataFetchStatus.NotFound
    );

    matchesSkipped = uniqueMatchIds.length - matchesToUpdate.length;

    if (matchesToUpdate.length > 0) {
      const matchDbIds = matchesToUpdate.map((m) => m.id);

      await context.db.transaction((tx) =>
        withAuditUserId(tx, adminUserId, () =>
          tx
            .update(schema.matches)
            .set({
              dataFetchStatus: DataFetchStatus.NotFetched,
              updated: NOW,
            })
            .where(inArray(schema.matches.id, matchDbIds))
        )
      );

      const matchChunks = chunkArray(matchesToUpdate, BATCH_SIZE);
      const totalBatches = matchChunks.length;
      const shouldYieldProgress = totalBatches >= 2;
      let hasQueueWarning = false;
      let matchesQueued = 0;

      for (let i = 0; i < matchChunks.length; i++) {
        const chunk = matchChunks[i];
        if (!chunk) continue;

        const queueTasks = chunk.map((m) => ({
          osuMatchId: m.osuId,
          isLazer: m.isLazer,
          promise: publishFetchMatchMessage(
            {
              osuMatchId: m.osuId,
              isLazer: m.isLazer,
            },
            {
              metadata: {
                priority: priorityValue,
                ...(correlationId && { correlationId }),
              },
            }
          ),
        }));

        const results = await Promise.allSettled(
          queueTasks.map((t) => t.promise)
        );
        const successes = results.filter((r) => r.status === 'fulfilled');
        matchesQueued += successes.length;

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0 && !hasQueueWarning) {
          warnings.push(REFETCH_QUEUE_WARNING);
          hasQueueWarning = true;
        }
        failures.forEach((failure, index) => {
          console.error('Failed to publish match fetch message', {
            osuMatchId: queueTasks[index]?.osuMatchId,
            isLazer: queueTasks[index]?.isLazer,
            error: failure.status === 'rejected' ? failure.reason : null,
          });
        });

        if (shouldYieldProgress) {
          const itemsProcessed = (i + 1) * BATCH_SIZE;
          yield {
            type: 'progress' as const,
            phase: 'matches' as const,
            currentBatch: i + 1,
            totalBatches,
            itemsProcessed: Math.min(itemsProcessed, matchesToUpdate.length),
            totalItems: matchesToUpdate.length,
            message: `Processing matches (Batch ${i + 1} of ${totalBatches})`,
          };
        }

        if (i < matchChunks.length - 1) {
          await delay(BATCH_DELAY_MS);
        }
      }

      matchesUpdated = matchesQueued;
    }
  }

  yield {
    type: 'complete' as const,
    beatmapsUpdated,
    beatmapsSkipped,
    matchesUpdated,
    matchesSkipped,
    warnings: warnings.length ? warnings : undefined,
  };
}

export const massEnqueue = protectedProcedure
  .input(AdminMassEnqueueInputSchema)
  .output(eventIterator(AdminMassEnqueueProgressEventSchema))
  .route({
    summary: 'Mass enqueue beatmap and match refetch with progress updates',
    tags: ['admin'],
    method: 'POST',
    path: '/admin/mass-enqueue',
  })
  .handler(massEnqueueHandler);
