import { afterEach, describe, expect, it } from 'bun:test';

import {
  REFETCH_QUEUE_WARNING,
  refetchTournamentMatchDataHandler,
  type RefetchMatchDataArgs,
} from '../adminProcedures';
import {
  resetQueuePublishersForTesting,
  setQueuePublishersForTesting,
  type QueuePublisherRegistry,
} from '@/lib/queue/publishers';
import type { DatabaseClient } from '@/lib/db';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { MessagePriority } from '@otr/core';

interface MatchRow {
  id: number;
  tournamentId: number;
  osuId: number;
  dataFetchStatus: number;
}

interface GameRow {
  matchId: number;
  beatmapId: number | null;
}

interface JoinRow {
  pooledBeatmapsId: number;
  tournamentsPooledInId: number;
}

interface BeatmapRow {
  id: number;
  osuId: number;
  dataFetchStatus: number;
}

const extractColumnName = (condition: unknown): string | undefined => {
  if (
    condition &&
    typeof condition === 'object' &&
    'queryChunks' in condition &&
    Array.isArray((condition as { queryChunks: unknown[] }).queryChunks)
  ) {
    const chunk = (condition as { queryChunks: Array<{ name?: string }> })
      .queryChunks[1];
    return chunk?.name;
  }

  return undefined;
};

const extractNumbers = (condition: unknown): number[] => {
  if (
    !condition ||
    typeof condition !== 'object' ||
    !('queryChunks' in condition) ||
    !Array.isArray((condition as { queryChunks: unknown[] }).queryChunks)
  ) {
    return [];
  }

  const numbers: number[] = [];

  for (const chunk of (condition as { queryChunks: unknown[] }).queryChunks) {
    const value = (chunk as { value?: unknown }).value;

    if (typeof value === 'number') {
      numbers.push(value);
      continue;
    }

    if (Array.isArray(chunk)) {
      for (const item of chunk) {
        if (typeof item === 'number') {
          numbers.push(item);
        } else if (
          item &&
          typeof (item as { value?: unknown }).value === 'number'
        ) {
          numbers.push((item as { value: number }).value);
        }
      }
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'number') {
          numbers.push(entry);
        }
      }
    }

    if (chunk && typeof chunk === 'object') {
      for (const entry of Object.values(chunk as Record<string, unknown>)) {
        if (typeof entry === 'number') {
          numbers.push(entry);
        } else if (
          entry &&
          typeof (entry as { value?: unknown }).value === 'number'
        ) {
          numbers.push((entry as { value: number }).value);
        }
      }
    }
  }

  return numbers;
};

class RefetchMatchDataTestDb {
  public matches: MatchRow[];
  public games: GameRow[];
  public joins: JoinRow[];
  public beatmaps: Map<number, BeatmapRow>;

  constructor(options: {
    matches: MatchRow[];
    games: GameRow[];
    joins: JoinRow[];
    beatmaps: BeatmapRow[];
  }) {
    this.matches = options.matches.map((row) => ({ ...row }));
    this.games = options.games.map((row) => ({ ...row }));
    this.joins = options.joins.map((row) => ({ ...row }));
    this.beatmaps = new Map<number, BeatmapRow>();
    options.beatmaps.forEach((row) => {
      this.beatmaps.set(row.id, { ...row });
    });
  }

  update(table: unknown) {
    if (table === schema.matches) {
      return {
        set: (values: Partial<MatchRow>) => ({
          where: (condition: unknown) => ({
            returning: () => {
              const [tournamentId] = extractNumbers(condition);
              return this.matches
                .filter((match) => match.tournamentId === tournamentId)
                .map((match) => {
                  if (typeof values.dataFetchStatus === 'number') {
                    match.dataFetchStatus = values.dataFetchStatus;
                  }
                  return { id: match.id, osuId: match.osuId };
                });
            },
          }),
        }),
      };
    }

    if (table === schema.beatmaps) {
      return {
        set: (values: Partial<BeatmapRow>) => ({
          where: (condition: unknown) => {
            const ids = extractNumbers(condition);
            ids.forEach((id) => {
              const beatmap = this.beatmaps.get(id);
              if (beatmap && typeof values.dataFetchStatus === 'number') {
                beatmap.dataFetchStatus = values.dataFetchStatus;
              }
            });
            return undefined;
          },
        }),
      };
    }

    throw new Error('Unsupported update table in test');
  }

  select() {
    return {
      from: (table: unknown) => ({
        where: (condition: unknown) => {
          const column = extractColumnName(condition);
          const numbers = extractNumbers(condition);

          if (table === schema.games && column === 'match_id') {
            return this.games
              .filter((game) => numbers.includes(game.matchId))
              .map((game) => ({ beatmapId: game.beatmapId }));
          }

          if (
            table === schema.joinPooledBeatmaps &&
            column === 'tournaments_pooled_in_id'
          ) {
            return this.joins
              .filter((join) => numbers.includes(join.tournamentsPooledInId))
              .map((join) => ({ beatmapId: join.pooledBeatmapsId }));
          }

          if (table === schema.beatmaps && column === 'id') {
            return numbers
              .map((id) => this.beatmaps.get(id))
              .filter((row): row is BeatmapRow => Boolean(row))
              .map((row) => ({ osuId: row.osuId }));
          }

          return [];
        },
      }),
    };
  }
}

type TestContext = RefetchMatchDataArgs['context'];

const createAdminSession = (): NonNullable<TestContext['session']> => ({
  dbUser: {
    id: 1,
    scopes: ['admin'],
  },
});

const noopPublishers: QueuePublisherRegistry = {
  fetchBeatmap: async ({ beatmapId }) => ({
    beatmapId,
    requestedAt: new Date().toISOString(),
    correlationId: 'noop',
    priority: MessagePriority.Normal,
  }),
  fetchMatch: async ({ osuMatchId }) => ({
    osuMatchId,
    requestedAt: new Date().toISOString(),
    correlationId: 'noop',
    priority: MessagePriority.Normal,
  }),
  fetchPlayerOsuTrack: async ({ osuPlayerId }) => ({
    osuPlayerId,
    requestedAt: new Date().toISOString(),
    correlationId: 'noop',
    priority: MessagePriority.Normal,
  }),
  processAutomationCheck: async ({ tournamentId, overrideVerifiedState }) => ({
    tournamentId,
    overrideVerifiedState,
    requestedAt: new Date().toISOString(),
    correlationId: 'noop',
    priority: MessagePriority.Normal,
  }),
};

afterEach(() => {
  resetQueuePublishersForTesting();
});

describe('refetchTournamentMatchDataHandler', () => {
  it('queues match and beatmap fetches for the tournament', async () => {
    const db = new RefetchMatchDataTestDb({
      matches: [
        {
          id: 1,
          tournamentId: 100,
          osuId: 123,
          dataFetchStatus: DataFetchStatus.Fetched,
        },
        {
          id: 2,
          tournamentId: 100,
          osuId: 456,
          dataFetchStatus: DataFetchStatus.Fetched,
        },
        {
          id: 3,
          tournamentId: 200,
          osuId: 789,
          dataFetchStatus: DataFetchStatus.Fetched,
        },
      ],
      games: [
        { matchId: 1, beatmapId: 10 },
        { matchId: 2, beatmapId: 11 },
        { matchId: 3, beatmapId: 12 },
      ],
      joins: [
        { pooledBeatmapsId: 20, tournamentsPooledInId: 100 },
        { pooledBeatmapsId: 30, tournamentsPooledInId: 200 },
      ],
      beatmaps: [
        { id: 10, osuId: 1000, dataFetchStatus: DataFetchStatus.Fetched },
        { id: 11, osuId: 1100, dataFetchStatus: DataFetchStatus.Fetched },
        { id: 20, osuId: 2000, dataFetchStatus: DataFetchStatus.Fetched },
        { id: 30, osuId: 3000, dataFetchStatus: DataFetchStatus.Fetched },
      ],
    });

    const queuedMatches: number[] = [];

    setQueuePublishersForTesting({
      fetchBeatmap: noopPublishers.fetchBeatmap,
      fetchMatch: async ({ osuMatchId }) => {
        queuedMatches.push(osuMatchId);
        return noopPublishers.fetchMatch({ osuMatchId });
      },
      fetchPlayerOsuTrack: noopPublishers.fetchPlayerOsuTrack,
      processAutomationCheck: noopPublishers.processAutomationCheck,
    });

    const result = await refetchTournamentMatchDataHandler({
      input: { id: 100 },
      context: {
        db: db as unknown as DatabaseClient,
        session: createAdminSession(),
      },
    });

    expect(result.matchesUpdated).toBe(2);
    expect(result.warnings).toBeUndefined();
    expect(queuedMatches).toEqual([123, 456]);
  });

  it('returns warnings when publishing fails', async () => {
    const db = new RefetchMatchDataTestDb({
      matches: [
        {
          id: 1,
          tournamentId: 100,
          osuId: 123,
          dataFetchStatus: DataFetchStatus.Fetched,
        },
      ],
      games: [{ matchId: 1, beatmapId: 10 }],
      joins: [],
      beatmaps: [
        { id: 10, osuId: 1000, dataFetchStatus: DataFetchStatus.Fetched },
      ],
    });

    setQueuePublishersForTesting({
      fetchBeatmap: noopPublishers.fetchBeatmap,
      fetchMatch: async () => {
        throw new Error('match queue offline');
      },
      fetchPlayerOsuTrack: noopPublishers.fetchPlayerOsuTrack,
      processAutomationCheck: noopPublishers.processAutomationCheck,
    });

    const result = await refetchTournamentMatchDataHandler({
      input: { id: 100 },
      context: {
        db: db as unknown as DatabaseClient,
        session: createAdminSession(),
      },
    });

    expect(result.warnings).toEqual([REFETCH_QUEUE_WARNING]);
  });
});
