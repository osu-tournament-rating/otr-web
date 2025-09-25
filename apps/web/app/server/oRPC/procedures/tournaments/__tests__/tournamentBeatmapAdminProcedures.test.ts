import { afterEach, describe, expect, it } from 'bun:test';

import {
  manageTournamentBeatmapsAdminHandler,
  type ManageTournamentBeatmapsArgs,
} from '../beatmapAdminProcedures';
import {
  resetQueuePublishersForTesting,
  setQueuePublishersForTesting,
} from '@/lib/queue/publishers';
import type { DatabaseClient } from '@/lib/db';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { MessagePriority } from '@otr/core';

interface BeatmapRow {
  id: number;
  osuId: number;
  dataFetchStatus: number;
}

class ManageBeatmapsTestDb {
  public beatmaps: BeatmapRow[];
  public joinRows: Array<{
    pooledBeatmapsId: number;
    tournamentsPooledInId: number;
  }> = [];
  private nextBeatmapId = 10_000;

  constructor(initialBeatmaps: BeatmapRow[] = []) {
    this.beatmaps = [...initialBeatmaps];
  }

  query = {
    tournaments: {
      findFirst: async () => ({ id: 1, ruleset: 0 }),
    },
  } as const;

  async transaction<T>(
    callback: (
      tx: ReturnType<ManageBeatmapsTestDb['createTransaction']>
    ) => Promise<T>
  ): Promise<T> {
    const tx = this.createTransaction();
    return callback(tx);
  }

  private createTransaction() {
    return {
      query: this.query,
      insert: (table: unknown) => {
        if (table === schema.beatmaps) {
          return {
            values: (values: Array<{ osuId: number }>) => {
              const inserted = values.map((value) => {
                const row: BeatmapRow = {
                  id: this.nextBeatmapId++,
                  osuId: value.osuId,
                  dataFetchStatus: DataFetchStatus.NotFetched,
                };
                this.beatmaps.push(row);
                return row;
              });

              return {
                onConflictDoNothing: () => ({
                  returning: () =>
                    inserted.map((row) => ({
                      id: row.id,
                      osuId: row.osuId,
                      dataFetchStatus: row.dataFetchStatus,
                    })),
                }),
              };
            },
          };
        }

        if (table === schema.joinPooledBeatmaps) {
          return {
            values: (
              values: Array<{
                pooledBeatmapsId: number;
                tournamentsPooledInId: number;
              }>
            ) => {
              this.joinRows.push(...values);
              return {
                onConflictDoNothing: () => undefined,
              };
            },
          };
        }

        throw new Error('Unsupported insert target in test database');
      },
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === schema.beatmaps) {
              return this.beatmaps.map((row) => ({
                id: row.id,
                osuId: row.osuId,
                dataFetchStatus: row.dataFetchStatus,
              }));
            }

            if (table === schema.joinPooledBeatmaps) {
              return this.joinRows.map((row) => ({
                beatmapId: row.pooledBeatmapsId,
              }));
            }

            return [];
          },
        }),
      }),
      delete: (table: unknown) => {
        if (table === schema.joinPooledBeatmaps) {
          return {
            where: () => {
              this.joinRows = [];
              return undefined;
            },
          };
        }

        throw new Error('Unsupported delete target in test database');
      },
    };
  }
}

type AdminSession = ManageTournamentBeatmapsArgs['context']['session'];

const createAdminSession = (): AdminSession => ({
  dbUser: {
    id: 1,
    scopes: ['admin'],
  },
});

afterEach(() => {
  resetQueuePublishersForTesting();
});

describe('manageTournamentBeatmapsAdminHandler', () => {
  it('queues beatmap fetches for newly inserted placeholders', async () => {
    const db = new ManageBeatmapsTestDb();
    const queuedBeatmaps: number[] = [];

    setQueuePublishersForTesting({
      fetchBeatmap: async ({ beatmapId }) => {
        queuedBeatmaps.push(beatmapId);
        return {
          beatmapId,
          requestedAt: new Date().toISOString(),
          correlationId: 'test',
          priority: MessagePriority.Normal,
        };
      },
      fetchMatch: async () => {
        throw new Error('match queue should not be called');
      },
      fetchPlayerOsuTrack: async () => ({
        osuPlayerId: 0,
        requestedAt: new Date().toISOString(),
        correlationId: 'noop',
        priority: MessagePriority.Normal,
      }),
      processAutomationCheck: async ({
        tournamentId,
        overrideVerifiedState,
      }) => ({
        tournamentId,
        overrideVerifiedState,
        requestedAt: new Date().toISOString(),
        correlationId: 'noop',
        priority: MessagePriority.Normal,
      }),
    });

    const result = await manageTournamentBeatmapsAdminHandler({
      input: {
        tournamentId: 1,
        addBeatmapOsuIds: [111],
        removeBeatmapIds: [],
      },
      context: {
        db: db as unknown as DatabaseClient,
        session: createAdminSession(),
      },
    });

    expect(result.addedCount).toBe(1);
    expect(result.warnings).toBeUndefined();
    expect(queuedBeatmaps).toEqual([111]);
  });

  it('requeues existing beatmaps with pending data', async () => {
    const db = new ManageBeatmapsTestDb([
      {
        id: 7,
        osuId: 222,
        dataFetchStatus: DataFetchStatus.NotFetched,
      },
    ]);
    const queuedBeatmaps: number[] = [];

    setQueuePublishersForTesting({
      fetchBeatmap: async ({ beatmapId }) => {
        queuedBeatmaps.push(beatmapId);
        return {
          beatmapId,
          requestedAt: new Date().toISOString(),
          correlationId: 'test',
          priority: MessagePriority.Normal,
        };
      },
      fetchMatch: async () => {
        throw new Error('match queue should not be called');
      },
      fetchPlayerOsuTrack: async () => ({
        osuPlayerId: 0,
        requestedAt: new Date().toISOString(),
        correlationId: 'noop',
        priority: MessagePriority.Normal,
      }),
      processAutomationCheck: async ({
        tournamentId,
        overrideVerifiedState,
      }) => ({
        tournamentId,
        overrideVerifiedState,
        requestedAt: new Date().toISOString(),
        correlationId: 'noop',
        priority: MessagePriority.Normal,
      }),
    });

    const result = await manageTournamentBeatmapsAdminHandler({
      input: {
        tournamentId: 1,
        addBeatmapOsuIds: [222],
        removeBeatmapIds: [],
      },
      context: {
        db: db as unknown as DatabaseClient,
        session: createAdminSession(),
      },
    });

    expect(result.addedCount).toBe(1);
    expect(queuedBeatmaps).toEqual([222]);
  });

  it('surfaces warnings when queue publishing fails', async () => {
    const db = new ManageBeatmapsTestDb();

    setQueuePublishersForTesting({
      fetchBeatmap: async () => {
        throw new Error('queue down');
      },
      fetchMatch: async () => {
        throw new Error('unexpected match publish');
      },
      fetchPlayerOsuTrack: async () => ({
        osuPlayerId: 0,
        requestedAt: new Date().toISOString(),
        correlationId: 'noop',
        priority: MessagePriority.Normal,
      }),
      processAutomationCheck: async ({
        tournamentId,
        overrideVerifiedState,
      }) => ({
        tournamentId,
        overrideVerifiedState,
        requestedAt: new Date().toISOString(),
        correlationId: 'noop',
        priority: MessagePriority.Normal,
      }),
    });

    const result = await manageTournamentBeatmapsAdminHandler({
      input: {
        tournamentId: 1,
        addBeatmapOsuIds: [333],
        removeBeatmapIds: [],
      },
      context: {
        db: db as unknown as DatabaseClient,
        session: createAdminSession(),
      },
    });

    expect(result.warnings).toBeDefined();
    expect(result.warnings?.[0]).toContain('contact the o!TR developers');
  });
});
