import { describe, expect, it, mock } from 'bun:test';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import type { DatabaseClient } from '../../../db';
import type { Logger } from '../../../logging/logger';

class ApiError extends Error {
  readonly response: { status_code: number };

  constructor(status: number) {
    super(`osu! API responded with ${status}`);
    this.response = { status_code: status };
  }
}

mock.module('../../client', () => ({ APIError: ApiError }));

const { BeatmapFetchService, beatmapOwnerIds } =
  await import('../beatmap-fetch-service');
const { TournamentDataCompletionService } =
  await import('../tournament-data-completion-service');

const dialect = new PgDialect();

const render = (condition: unknown) =>
  condition
    ? dialect.sqlToQuery(condition as SQL)
    : { sql: '', params: [] as unknown[] };

const conditionColumn = (condition: unknown) =>
  render(condition).sql.match(/"[^"]+"\."([^"]+)"/)?.[1];

const conditionValues = (condition: unknown) =>
  render(condition).params.filter(
    (param): param is number => typeof param === 'number'
  );

const excludesManualOverride = (condition: unknown) =>
  render(condition).sql.includes('manual_override');

interface BeatmapRow {
  id: number;
  osuId: number;
  diffName: string;
  sr: number;
  cs: number;
  maxCombo: number | null;
  beatmapsetId: number | null;
  dataFetchStatus: number;
  manualOverride: boolean;
  updated: string;
}

type Row = Record<string, unknown> & { id: number; osuId: number };

const thenable = <T>(run: () => T) => ({
  returning: async () => run(),
  then: (
    resolve: (value: T) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise.resolve().then(run).then(resolve, reject),
});

class BeatmapFetchTestDb {
  readonly beatmaps = new Map<number, BeatmapRow>();
  readonly beatmapsets = new Map<number, Row>();
  readonly players = new Map<number, Row>();
  readonly creatorJoins: Array<{
    createdBeatmapsId: number;
    creatorsId: number;
  }> = [];

  private nextId = 1000;

  constructor(beatmaps: BeatmapRow[]) {
    beatmaps.forEach((beatmap) =>
      this.beatmaps.set(beatmap.id, { ...beatmap })
    );
  }

  readonly query = {
    beatmaps: {
      findFirst: async ({ where }: { where: unknown }) => {
        const [value] = conditionValues(where);
        const byOsuId = conditionColumn(where) === 'osu_id';

        return Array.from(this.beatmaps.values()).find((row) =>
          byOsuId ? row.osuId === value : row.id === value
        );
      },
    },
    players: {
      findFirst: async ({ where }: { where: unknown }) => {
        const [osuId] = conditionValues(where);

        return Array.from(this.players.values()).find(
          (row) => row.osuId === osuId
        );
      },
    },
  };

  insert(table: unknown) {
    return {
      values: (values: Record<string, unknown>) => {
        const write = (conflict?: {
          set: Record<string, unknown>;
          setWhere?: unknown;
        }) => this.write(table, values, conflict);

        return {
          ...thenable(() => write()),
          onConflictDoNothing: () => thenable(() => write()),
          onConflictDoUpdate: (conflict: {
            set: Record<string, unknown>;
            setWhere?: unknown;
          }) => thenable(() => write(conflict)),
        };
      },
    };
  }

  update(table: unknown) {
    return {
      set: (values: Record<string, unknown>) => ({
        where: (condition: unknown) =>
          thenable(() => {
            if (table !== schema.beatmaps) {
              return [];
            }

            const [id] = conditionValues(condition);
            const row = this.beatmaps.get(id);

            if (
              row &&
              !(excludesManualOverride(condition) && row.manualOverride)
            ) {
              Object.assign(row, values);
            }

            return [];
          }),
      }),
    };
  }

  select() {
    const builder = {
      from: () => builder,
      innerJoin: () => builder,
      where: async () => [] as Array<{ tournamentId: number | null }>,
    };

    return builder;
  }

  async transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }

  private write(
    table: unknown,
    values: Record<string, unknown>,
    conflict?: { set: Record<string, unknown>; setWhere?: unknown }
  ) {
    if (table === schema.joinBeatmapCreators) {
      this.creatorJoins.push(
        values as { createdBeatmapsId: number; creatorsId: number }
      );
      return [];
    }

    const store =
      table === schema.beatmaps
        ? (this.beatmaps as unknown as Map<number, Row>)
        : table === schema.beatmapsets
          ? this.beatmapsets
          : table === schema.players
            ? this.players
            : undefined;

    if (!store) {
      throw new Error('Unsupported insert table in test database');
    }

    const existing = Array.from(store.values()).find(
      (row) => row.osuId === values.osuId
    );

    if (!existing) {
      const row = { id: this.nextId++, ...values } as Row;
      store.set(row.id, row);
      return [row];
    }

    if (!conflict) {
      return [];
    }

    if (
      conflict.setWhere &&
      excludesManualOverride(conflict.setWhere) &&
      existing.manualOverride
    ) {
      return [];
    }

    Object.assign(existing, conflict.set);
    return [existing];
  }
}

const apiBeatmapset = {
  id: 900,
  user_id: 55,
  creator: 'Mapper',
  artist: 'Artist',
  title: 'Title',
  status: 'ranked',
  ranked_date: '2024-01-01T00:00:00Z',
  submitted_date: '2023-12-01T00:00:00Z',
  beatmaps: [
    {
      id: 111,
      user_id: 55,
      mode_int: 0,
      status: 'ranked',
      version: 'API Diff',
      total_length: 200,
      hit_length: 180,
      bpm: 190,
      count_circles: 100,
      count_sliders: 50,
      count_spinners: 2,
      cs: 4.2,
      drain: 5,
      accuracy: 8,
      ar: 9,
      difficulty_rating: 6.5,
      max_combo: 1200,
    },
    {
      id: 222,
      user_id: 55,
      mode_int: 0,
      status: 'ranked',
      version: 'API Sibling',
      total_length: 150,
      hit_length: 140,
      bpm: 175,
      count_circles: 80,
      count_sliders: 40,
      count_spinners: 1,
      cs: 3.8,
      drain: 4,
      accuracy: 7,
      ar: 8,
      difficulty_rating: 4.25,
      max_combo: 900,
    },
  ],
};

const overriddenBeatmap: BeatmapRow = {
  id: 1,
  osuId: 111,
  diffName: 'Admin Diff',
  sr: 3.5,
  cs: 4,
  maxCombo: 700,
  beatmapsetId: null,
  dataFetchStatus: DataFetchStatus.NotFound,
  manualOverride: true,
  updated: '2026-01-01T00:00:00.000Z',
};

const siblingBeatmap: BeatmapRow = {
  id: 2,
  osuId: 222,
  diffName: 'Stale Sibling',
  sr: 1,
  cs: 1,
  maxCombo: null,
  beatmapsetId: null,
  dataFetchStatus: DataFetchStatus.NotFetched,
  manualOverride: false,
  updated: '2026-01-01T00:00:00.000Z',
};

const createService = (
  db: BeatmapFetchTestDb,
  api: { getBeatmap: unknown; getBeatmapset: unknown }
) => {
  const logs: Array<{ message: string; context?: unknown }> = [];
  const published: number[] = [];

  const logger = {
    debug: () => {},
    info: (message: string, context?: unknown) => {
      logs.push({ message, context });
    },
    warn: () => {},
    error: () => {},
    child: () => logger,
  } as unknown as Logger;

  const client = db as unknown as DatabaseClient;

  const service = new BeatmapFetchService({
    db: client,
    api: api as never,
    rateLimiter: {
      schedule: <T>(task: () => Promise<T>) => task(),
    } as never,
    logger,
    dataCompletion: new TournamentDataCompletionService({
      db: client,
      logger,
    }),
    publishPlayerFetch: async (osuPlayerId) => {
      published.push(osuPlayerId);
    },
  });

  return { service, logs, published };
};

const workingApi = {
  getBeatmap: async (osuBeatmapId: number) => ({
    id: osuBeatmapId,
    beatmapset_id: apiBeatmapset.id,
  }),
  getBeatmapset: async () => apiBeatmapset,
};

type Owners = Array<{ id: number; username: string }> | undefined;

const apiWithOwners = (owners: Record<number, Owners>) => {
  const beatmapset = {
    ...apiBeatmapset,
    beatmaps: apiBeatmapset.beatmaps.map((beatmap) => ({
      ...beatmap,
      owners: owners[beatmap.id],
    })),
  };

  return {
    getBeatmap: workingApi.getBeatmap,
    getBeatmapset: async () => beatmapset,
  };
};

const creatorsOf = (db: BeatmapFetchTestDb, osuBeatmapId: number) => {
  const beatmap = Array.from(db.beatmaps.values()).find(
    (row) => row.osuId === osuBeatmapId
  );

  return db.creatorJoins
    .filter((join) => join.createdBeatmapsId === beatmap?.id)
    .map((join) => db.players.get(join.creatorsId)?.osuId);
};

const failingApi = (status: number) => ({
  getBeatmap: async () => {
    throw new ApiError(status);
  },
  getBeatmapset: async () => {
    throw new ApiError(status);
  },
});

describe('BeatmapFetchService manual override', () => {
  it('leaves an overridden beatmap alone while refreshing its siblings', async () => {
    const db = new BeatmapFetchTestDb([overriddenBeatmap, siblingBeatmap]);
    const before = { ...db.beatmaps.get(1)! };
    const { service, logs } = createService(db, workingApi);

    expect(await service.fetchAndPersist(111)).toBe(true);

    expect(db.beatmaps.get(1)).toEqual(before);
    expect(db.beatmaps.get(2)).toMatchObject({
      diffName: 'API Sibling',
      sr: 4.25,
      dataFetchStatus: DataFetchStatus.Fetched,
    });
    expect(db.beatmapsets.size).toBe(1);
    expect(db.creatorJoins.map((join) => join.createdBeatmapsId)).toEqual([2]);
    expect(logs).toContainEqual({
      message: 'Skipping manually configured beatmap',
      context: { osuBeatmapId: 111 },
    });
  });

  it('leaves an overridden beatmap alone when the osu! API returns not found', async () => {
    const db = new BeatmapFetchTestDb([overriddenBeatmap, siblingBeatmap]);
    const before = { ...db.beatmaps.get(1)! };
    const { service } = createService(db, failingApi(404));

    expect(await service.fetchAndPersist(111)).toBe(false);
    expect(await service.fetchAndPersist(222)).toBe(false);

    expect(db.beatmaps.get(1)).toEqual(before);
    expect(db.beatmaps.get(2)?.dataFetchStatus).toBe(DataFetchStatus.NotFound);
  });

  it('leaves an overridden beatmap alone when the osu! API is unauthorized', async () => {
    const db = new BeatmapFetchTestDb([overriddenBeatmap, siblingBeatmap]);
    const before = { ...db.beatmaps.get(1)! };
    const { service } = createService(db, failingApi(401));

    expect(await service.fetchAndPersist(111)).toBe(false);
    expect(await service.fetchAndPersist(222)).toBe(false);

    expect(db.beatmaps.get(1)).toEqual(before);
    expect(db.beatmaps.get(2)?.dataFetchStatus).toBe(DataFetchStatus.Error);
  });
});

describe('beatmapOwnerIds', () => {
  it('returns each positive owner id once', () => {
    expect(
      beatmapOwnerIds({
        user_id: 55,
        owners: [{ id: 66 }, { id: 55 }, { id: 66 }, { id: 0 }, { id: -1 }],
      })
    ).toEqual([66, 55]);
  });

  it('falls back to user_id when owners is missing or empty', () => {
    expect(beatmapOwnerIds({ user_id: 55 })).toEqual([55]);
    expect(beatmapOwnerIds({ user_id: 55, owners: null })).toEqual([55]);
    expect(beatmapOwnerIds({ user_id: 55, owners: [] })).toEqual([55]);
  });

  it('returns no ids without owners or a user_id', () => {
    expect(beatmapOwnerIds({ user_id: 0, owners: [] })).toEqual([]);
  });
});

describe('BeatmapFetchService creators', () => {
  it('saves every owner of a difficulty as a creator', async () => {
    const db = new BeatmapFetchTestDb([siblingBeatmap]);
    const { service, published } = createService(
      db,
      apiWithOwners({
        111: [
          { id: 55, username: 'Mapper' },
          { id: 66, username: 'Guest' },
        ],
        222: [{ id: 77, username: 'Other guest' }],
      })
    );

    expect(await service.fetchAndPersist(111)).toBe(true);

    expect(creatorsOf(db, 111)).toEqual([55, 66]);
    expect(creatorsOf(db, 222)).toEqual([77]);
    expect(published).toEqual([55, 66, 77]);
  });

  it('falls back to user_id when osu! sends no owners', async () => {
    const db = new BeatmapFetchTestDb([siblingBeatmap]);
    const { service, published } = createService(
      db,
      apiWithOwners({ 111: [], 222: undefined })
    );

    expect(await service.fetchAndPersist(111)).toBe(true);

    expect(creatorsOf(db, 111)).toEqual([55]);
    expect(creatorsOf(db, 222)).toEqual([55]);
    expect(published).toEqual([55]);
  });

  it('adds no creators to an overridden beatmap', async () => {
    const db = new BeatmapFetchTestDb([overriddenBeatmap, siblingBeatmap]);
    const { service } = createService(
      db,
      apiWithOwners({
        111: [
          { id: 55, username: 'Mapper' },
          { id: 66, username: 'Guest' },
        ],
        222: [{ id: 77, username: 'Other guest' }],
      })
    );

    expect(await service.fetchAndPersist(111)).toBe(true);

    expect(creatorsOf(db, 111)).toEqual([]);
    expect(creatorsOf(db, 222)).toEqual([77]);
  });
});
