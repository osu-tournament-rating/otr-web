import { describe, expect, it } from 'bun:test';

import { TournamentDataCompletionService } from '../../src/osu/services/tournament-data-completion-service';
import type { DatabaseClient } from '../../src/db';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import * as schema from '@otr/core/db/schema';
import { syncTournamentDateRange } from '@otr/core/db';
import type { Logger } from '../../src/logging/logger';
import { VerificationStatus } from '@otr/core/osu/enums';

interface MatchRow {
  id: number;
  tournamentId: number;
  dataFetchStatus: number;
  verificationStatus: number;
  startTime: string | null;
}

interface BeatmapRow {
  id: number;
  dataFetchStatus: number;
}

interface TournamentRow {
  id: number;
  startTime: string | null;
  endTime: string | null;
  updated?: string | null;
}

interface GameRow {
  matchId: number;
  beatmapId: number;
}

interface JoinRow {
  pooledBeatmapsId: number;
  tournamentsPooledInId: number;
}

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const extractColumnName = (condition: any): string | undefined => {
  if (
    condition &&
    Array.isArray(condition.queryChunks) &&
    condition.queryChunks[1]
  ) {
    const chunk = condition.queryChunks[1] as { name?: string };
    return chunk.name;
  }
  return undefined;
};

const extractNumbers = (condition: any): number[] => {
  if (!condition || !Array.isArray(condition.queryChunks)) {
    return [];
  }

  const numbers: number[] = [];

  for (const chunk of condition.queryChunks) {
    if (chunk && typeof (chunk as any).value === 'number') {
      numbers.push((chunk as any).value);
      continue;
    }

    if (Array.isArray(chunk)) {
      for (const item of chunk) {
        if (typeof item === 'number') {
          numbers.push(item);
        } else if (item && typeof (item as any).value === 'number') {
          numbers.push((item as any).value);
        }
      }
      continue;
    }

    if (chunk && Array.isArray((chunk as any).value)) {
      for (const value of (chunk as any).value) {
        if (typeof value === 'number') {
          numbers.push(value);
        }
      }
    }

    if (chunk && typeof chunk === 'object') {
      for (const value of Object.values(chunk as Record<string, unknown>)) {
        if (typeof value === 'number') {
          numbers.push(value);
        } else if (value && typeof (value as any).value === 'number') {
          numbers.push((value as any).value);
        }
      }
    }
  }

  return numbers;
};

class TournamentDataTestDb {
  matches = new Map<number, MatchRow>();
  beatmaps = new Map<number, BeatmapRow>();
  tournaments = new Map<number, TournamentRow>();
  games: GameRow[] = [];
  joins: JoinRow[] = [];

  constructor(options: {
    matches: MatchRow[];
    beatmaps: BeatmapRow[];
    games: GameRow[];
    joins: JoinRow[];
    tournaments?: TournamentRow[];
  }) {
    options.matches.forEach((match) =>
      this.matches.set(match.id, { ...match })
    );
    options.beatmaps.forEach((beatmap) =>
      this.beatmaps.set(beatmap.id, { ...beatmap })
    );
    options.tournaments?.forEach((tournament) =>
      this.tournaments.set(tournament.id, { ...tournament })
    );
    this.games = options.games.map((game) => ({ ...game }));
    this.joins = options.joins.map((join) => ({ ...join }));
  }

  query = {
    matches: {
      findFirst: async (args: { where: unknown }) => {
        const matchIds = extractNumbers(args.where);
        const match = matchIds
          .map((id) => this.matches.get(id))
          .find((row): row is MatchRow => Boolean(row));

        if (!match) {
          return null;
        }

        return {
          id: match.id,
          tournamentId: match.tournamentId,
          dataFetchStatus: match.dataFetchStatus,
          verificationStatus: match.verificationStatus,
        };
      },
      findMany: async (args: { where: unknown }) => {
        const tournamentIds = extractNumbers(args.where);
        const [tournamentId] = tournamentIds;

        return Array.from(this.matches.values())
          .filter((match) => match.tournamentId === tournamentId)
          .map((match) => ({
            id: match.id,
            dataFetchStatus: match.dataFetchStatus,
            startTime: match.startTime,
          }));
      },
    },
    beatmaps: {
      findFirst: async (args: { where: unknown }) => {
        const beatmapIds = extractNumbers(args.where);
        const beatmap = beatmapIds
          .map((id) => this.beatmaps.get(id))
          .find((row): row is BeatmapRow => Boolean(row));

        if (!beatmap) {
          return null;
        }

        return {
          id: beatmap.id,
          dataFetchStatus: beatmap.dataFetchStatus,
        };
      },
    },
    tournaments: {
      findFirst: async (args: { where: unknown }) => {
        const tournamentIds = extractNumbers(args.where);
        const tournament = tournamentIds
          .map((id) => this.tournaments.get(id))
          .find((row): row is TournamentRow => Boolean(row));

        if (!tournament) {
          return null;
        }

        return {
          startTime: tournament.startTime,
          endTime: tournament.endTime,
        };
      },
    },
  } as const;

  update(table: unknown) {
    if (table === schema.matches) {
      return {
        set: (values: Partial<MatchRow>) => ({
          where: (condition: unknown) => {
            const [matchId] = extractNumbers(condition);
            const match = this.matches.get(matchId);
            if (match && typeof values.dataFetchStatus === 'number') {
              match.dataFetchStatus = values.dataFetchStatus;
            }
            return undefined;
          },
        }),
      };
    }

    if (table === schema.beatmaps) {
      return {
        set: (values: Partial<BeatmapRow>) => ({
          where: (condition: unknown) => {
            const [beatmapId] = extractNumbers(condition);
            const beatmap = this.beatmaps.get(beatmapId);
            if (beatmap && typeof values.dataFetchStatus === 'number') {
              beatmap.dataFetchStatus = values.dataFetchStatus;
            }
            return undefined;
          },
        }),
      };
    }

    if (table === schema.tournaments) {
      return {
        set: (values: Partial<TournamentRow>) => ({
          where: (condition: unknown) => {
            const [tournamentId] = extractNumbers(condition);
            const tournament = this.tournaments.get(tournamentId);
            if (tournament) {
              if (Object.prototype.hasOwnProperty.call(values, 'startTime')) {
                tournament.startTime = values.startTime ?? null;
              }
              if (Object.prototype.hasOwnProperty.call(values, 'endTime')) {
                tournament.endTime = values.endTime ?? null;
              }
              if (Object.prototype.hasOwnProperty.call(values, 'updated')) {
                tournament.updated = values.updated ?? null;
              }
            }
            return undefined;
          },
        }),
      };
    }

    throw new Error('Unsupported update table in test database');
  }

  select() {
    return new SelectBuilder(this);
  }
}

class SelectBuilder {
  private table: unknown;
  private joinTable: unknown;

  constructor(private readonly db: TournamentDataTestDb) {}

  from(table: unknown) {
    this.table = table;
    return this;
  }

  innerJoin(table: unknown) {
    this.joinTable = table;
    return this;
  }

  where(condition: unknown) {
    const column = extractColumnName(condition);
    const values = extractNumbers(condition);

    if (this.table === schema.matches && column === 'tournament_id') {
      const [tournamentId] = values;
      return Array.from(this.db.matches.values())
        .filter((match) => match.tournamentId === tournamentId)
        .map((match) => ({
          id: match.id,
          dataFetchStatus: match.dataFetchStatus,
          startTime: match.startTime,
        }));
    }

    if (
      this.table === schema.joinPooledBeatmaps &&
      column === 'pooled_beatmaps_id'
    ) {
      const [beatmapId] = values;
      return this.db.joins
        .filter((join) => join.pooledBeatmapsId === beatmapId)
        .map((join) => ({ tournamentId: join.tournamentsPooledInId }));
    }

    if (
      this.table === schema.joinPooledBeatmaps &&
      column === 'tournaments_pooled_in_id'
    ) {
      const [tournamentId] = values;
      return this.db.joins
        .filter((join) => join.tournamentsPooledInId === tournamentId)
        .map((join) => ({ beatmapId: join.pooledBeatmapsId }));
    }

    if (this.table === schema.beatmaps && column === 'id') {
      return values
        .map((id) => this.db.beatmaps.get(id))
        .filter((row): row is BeatmapRow => Boolean(row))
        .map((row) => ({ dataFetchStatus: row.dataFetchStatus }));
    }

    if (this.table === schema.games) {
      if (column === 'tournament_id' && this.joinTable === schema.matches) {
        const [tournamentId] = values;
        const matchIds = Array.from(this.db.matches.values())
          .filter((match) => match.tournamentId === tournamentId)
          .map((match) => match.id);

        return this.db.games
          .filter((game) => matchIds.includes(game.matchId))
          .map((game) => ({ beatmapId: game.beatmapId }));
      }

      if (column === 'beatmap_id') {
        const [beatmapId] = values;
        return this.db.games
          .filter((game) => game.beatmapId === beatmapId)
          .map((game) => {
            const match = this.db.matches.get(game.matchId);
            return match ? { tournamentId: match.tournamentId } : null;
          })
          .filter((row): row is { tournamentId: number } => Boolean(row));
      }
    }

    return [];
  }
}

describe('TournamentDataCompletionService', () => {
  it('queues automation checks once matches and beatmaps are fetched', async () => {
    const db = new TournamentDataTestDb({
      matches: [
        {
          id: 1,
          tournamentId: 100,
          dataFetchStatus: DataFetchStatus.NotFetched,
          verificationStatus: VerificationStatus.None,
          startTime: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          tournamentId: 100,
          dataFetchStatus: DataFetchStatus.NotFetched,
          verificationStatus: VerificationStatus.None,
          startTime: '2024-01-02T00:00:00.000Z',
        },
      ],
      beatmaps: [
        { id: 10, dataFetchStatus: DataFetchStatus.NotFetched },
        { id: 11, dataFetchStatus: DataFetchStatus.NotFetched },
      ],
      games: [{ matchId: 1, beatmapId: 11 }],
      joins: [{ pooledBeatmapsId: 10, tournamentsPooledInId: 100 }],
      tournaments: [{ id: 100, startTime: null, endTime: null, updated: null }],
    });

    const publishCalls: Array<{
      tournamentId: number;
      overrideVerifiedState: boolean;
    }> = [];

    const service = new TournamentDataCompletionService({
      db: db as unknown as DatabaseClient,
      logger: noopLogger,
      publishAutomationCheck: async (payload) => {
        publishCalls.push(payload);
      },
    });

    await service.updateMatchFetchStatus(1, DataFetchStatus.Fetched);
    expect(publishCalls).toHaveLength(0);

    await service.updateMatchFetchStatus(2, DataFetchStatus.Fetched);
    expect(publishCalls).toHaveLength(0);

    await service.updateBeatmapFetchStatus(10, DataFetchStatus.Fetched);
    expect(publishCalls).toHaveLength(0);

    await service.updateBeatmapFetchStatus(11, DataFetchStatus.Fetched);
    expect(publishCalls).toHaveLength(1);
    expect(publishCalls[0]).toEqual({
      tournamentId: 100,
      overrideVerifiedState: false,
    });
  });

  it('updates tournament start and end dates when matches are fully fetched', async () => {
    const db = new TournamentDataTestDb({
      matches: [
        {
          id: 1,
          tournamentId: 200,
          dataFetchStatus: DataFetchStatus.NotFetched,
          verificationStatus: VerificationStatus.None,
          startTime: '2024-03-01T12:00:00.000Z',
        },
        {
          id: 2,
          tournamentId: 200,
          dataFetchStatus: DataFetchStatus.NotFetched,
          verificationStatus: VerificationStatus.None,
          startTime: '2024-03-05T15:30:00.000Z',
        },
      ],
      beatmaps: [],
      games: [],
      joins: [],
      tournaments: [{ id: 200, startTime: null, endTime: null, updated: null }],
    });

    const service = new TournamentDataCompletionService({
      db: db as unknown as DatabaseClient,
      logger: noopLogger,
    });

    await service.updateMatchFetchStatus(1, DataFetchStatus.Fetched);
    const afterFirst = db.tournaments.get(200);
    expect(afterFirst?.startTime).toBeNull();
    expect(afterFirst?.endTime).toBeNull();

    await service.updateMatchFetchStatus(2, DataFetchStatus.Fetched);
    const afterSecond = db.tournaments.get(200);
    expect(afterSecond?.startTime).toBe('2024-03-01T12:00:00.000Z');
    expect(afterSecond?.endTime).toBe('2024-03-05T15:30:00.000Z');
    expect(afterSecond?.updated).toBeDefined();
  });

  it('clears tournament date range when no matches remain', async () => {
    const db = new TournamentDataTestDb({
      matches: [],
      beatmaps: [],
      games: [],
      joins: [],
      tournaments: [
        {
          id: 300,
          startTime: '2024-04-01T00:00:00.000Z',
          endTime: '2024-04-05T00:00:00.000Z',
          updated: null,
        },
      ],
    });

    await syncTournamentDateRange(db as unknown as DatabaseClient, 300, {
      logger: noopLogger,
    });

    const updated = db.tournaments.get(300);
    expect(updated?.startTime).toBeNull();
    expect(updated?.endTime).toBeNull();
    expect(updated?.updated).toBeDefined();
  });
});
