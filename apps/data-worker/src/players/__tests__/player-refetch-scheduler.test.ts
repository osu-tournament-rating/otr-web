import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { FetchOsuMessage, FetchPlayerOsuTrackMessage } from '@otr/core';
import { MessagePriority } from '@otr/core';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { Ruleset } from '@otr/core/osu';

import type { DatabaseClient } from '../../db';
import type { Logger } from '../../logging/logger';
import { PlayerRefetchScheduler } from '../player-refetch-scheduler';

const url = process.env.SEARCH_TEST_DATABASE_URL;

const FALLBACK_DAYS = 14;

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString();

type SeededPlayer = {
  osuId: number;
  lastFetch: number;
  ratings: Array<[Ruleset, number]>;
  fetching?: boolean;
  // Cadence the player should be published under, or null when this run skips them.
  expected: number | null;
};

const seed: SeededPlayer[] = [
  {
    osuId: 999_300_001,
    lastFetch: 2,
    ratings: [[Ruleset.Osu, 100]],
    expected: 1,
  },
  {
    osuId: 999_300_002,
    lastFetch: 0.5,
    ratings: [[Ruleset.Osu, 100]],
    expected: null,
  },
  {
    osuId: 999_300_003,
    lastFetch: 2,
    ratings: [[Ruleset.Osu, 3000]],
    expected: null,
  },
  {
    osuId: 999_300_004,
    lastFetch: 4,
    ratings: [[Ruleset.Osu, 3000]],
    expected: 3,
  },
  {
    osuId: 999_300_005,
    lastFetch: 8,
    ratings: [[Ruleset.Osu, 15000]],
    expected: 7,
  },
  {
    osuId: 999_300_006,
    lastFetch: 8,
    ratings: [[Ruleset.Osu, 50000]],
    expected: null,
  },
  {
    osuId: 999_300_007,
    lastFetch: 20,
    ratings: [[Ruleset.Osu, 50000]],
    expected: FALLBACK_DAYS,
  },
  { osuId: 999_300_008, lastFetch: 20, ratings: [], expected: FALLBACK_DAYS },
  {
    osuId: 999_300_009,
    lastFetch: 4,
    ratings: [[Ruleset.Taiko, 3000]],
    expected: null,
  },
  {
    osuId: 999_300_010,
    lastFetch: 8,
    ratings: [[Ruleset.Taiko, 3000]],
    expected: 7,
  },
  {
    osuId: 999_300_011,
    lastFetch: 2,
    ratings: [
      [Ruleset.Osu, 50000],
      [Ruleset.Mania7k, 300],
    ],
    expected: 1,
  },
  {
    osuId: 999_300_012,
    lastFetch: 20,
    ratings: [[Ruleset.Osu, 100]],
    fetching: true,
    expected: 1,
  },
  {
    osuId: 999_300_021,
    lastFetch: 0.5,
    ratings: [],
    fetching: true,
    expected: null,
  },
  {
    osuId: 999_300_022,
    lastFetch: 2,
    ratings: [],
    fetching: true,
    expected: FALLBACK_DAYS,
  },
  {
    osuId: 999_300_013,
    lastFetch: 2,
    ratings: [[Ruleset.Osu, 500]],
    expected: 1,
  },
  {
    osuId: 999_300_014,
    lastFetch: 2,
    ratings: [[Ruleset.Osu, 501]],
    expected: null,
  },
  {
    osuId: 999_300_015,
    lastFetch: 4,
    ratings: [[Ruleset.Osu, 5000]],
    expected: 3,
  },
  {
    osuId: 999_300_016,
    lastFetch: 4,
    ratings: [[Ruleset.Osu, 5001]],
    expected: null,
  },
  {
    osuId: 999_300_017,
    lastFetch: 8,
    ratings: [[Ruleset.Osu, 20000]],
    expected: 7,
  },
  {
    osuId: 999_300_018,
    lastFetch: 8,
    ratings: [[Ruleset.Osu, 20001]],
    expected: null,
  },
  {
    osuId: 999_300_019,
    lastFetch: 2,
    ratings: [[Ruleset.Taiko, 500]],
    expected: 1,
  },
  {
    osuId: 999_300_020,
    lastFetch: 2,
    ratings: [[Ruleset.Taiko, 501]],
    expected: null,
  },
];

describe.skipIf(!url)('osu! auto-refetch tiers', () => {
  const namespace = `refetch_tiers_${crypto.randomUUID().replaceAll('-', '')}`;
  const pool = new Pool({
    connectionString: url,
    options: `-c search_path=${namespace}`,
  });
  const db = drizzle(pool, { schema });
  const osuIds = seed.map((player) => player.osuId);

  const published: Array<{ osuPlayerId: number; priority?: MessagePriority }> =
    [];

  const remove = () =>
    db.delete(schema.players).where(inArray(schema.players.osuId, osuIds));

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA ${namespace};
      CREATE TABLE ${namespace}.players (LIKE public.players INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING CONSTRAINTS INCLUDING INDEXES);
      CREATE TABLE ${namespace}.player_ratings (LIKE public.player_ratings INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING CONSTRAINTS INCLUDING INDEXES);`);
    await remove();

    for (const player of seed) {
      const [row] = await db
        .insert(schema.players)
        .values({
          osuId: player.osuId,
          username: `tier-${player.osuId}`,
          osuLastFetch: daysAgo(player.lastFetch),
          dataFetchStatus: player.fetching
            ? DataFetchStatus.Fetching
            : DataFetchStatus.Fetched,
        })
        .returning({ id: schema.players.id });

      if (player.ratings.length > 0) {
        await db.insert(schema.playerRatings).values(
          player.ratings.map(([ruleset, globalRank]) => ({
            playerId: row!.id,
            ruleset,
            rating: 1000,
            volatility: 100,
            percentile: 0.5,
            globalRank,
            countryRank: globalRank,
          }))
        );
      }
    }

    const scheduler = new PlayerRefetchScheduler({
      db: db as unknown as DatabaseClient,
      logger: {
        debug() {},
        info() {},
        warn() {},
        error() {},
        child() {
          return this;
        },
      } as unknown as Logger,
      osuPublisher: {
        async publish(message, options) {
          published.push({
            osuPlayerId: (message as { osuPlayerId: number }).osuPlayerId,
            priority: options?.metadata?.priority,
          });
          return message as unknown as FetchOsuMessage;
        },
      },
      osuTrackPublisher: {
        async publish(message) {
          return message as unknown as FetchPlayerOsuTrackMessage;
        },
      },
      config: {
        osu: {
          enabled: true,
          intervalMinutes: 30,
          outdatedDays: FALLBACK_DAYS,
        },
        osuTrack: { enabled: false, intervalMinutes: 30, outdatedDays: 60 },
      },
    });

    await scheduler.start();
    await scheduler.stop();
  });

  afterAll(async () => {
    await remove();
    await pool.query(`DROP SCHEMA ${namespace} CASCADE`);
    await pool.end();
  });

  const enqueued = () =>
    published
      .map((entry) => entry.osuPlayerId)
      .filter((osuPlayerId) => osuIds.includes(osuPlayerId));

  it('enqueues only players past their tier cadence', () => {
    const expected = seed
      .filter((player) => player.expected !== null)
      .map((player) => player.osuId);

    expect(new Set(enqueued())).toEqual(new Set(expected));
  });

  it('publishes the daily tier at normal priority and the rest at low', () => {
    for (const player of seed) {
      if (player.expected === null) {
        continue;
      }

      const entry = published.find(
        (candidate) => candidate.osuPlayerId === player.osuId
      );

      expect(entry?.priority).toBe(
        player.expected === 1 ? MessagePriority.Normal : MessagePriority.Low
      );
    }
  });

  it('publishes the shortest cadence first', () => {
    const cadences = enqueued().map(
      (osuPlayerId) =>
        seed.find((player) => player.osuId === osuPlayerId)!.expected!
    );

    expect(cadences).toEqual([...cadences].sort((a, b) => a - b));
  });
});

for (const source of ['osu', 'osuTrack'] as const) {
  describe.skipIf(!url)(`${source} refetch recovery`, () => {
    const namespace = `refetch_${source.toLowerCase()}_${crypto.randomUUID().replaceAll('-', '')}`;
    const pool = new Pool({
      connectionString: url,
      options: `-c search_path=${namespace}`,
    });
    const db = drizzle(pool, { schema });
    const status =
      source === 'osu' ? 'dataFetchStatus' : 'osuTrackDataFetchStatus';
    const lastFetch = source === 'osu' ? 'osuLastFetch' : 'osuTrackLastFetch';
    let fail = false;
    let completeBeforeFailure = false;
    const published: number[] = [];
    const scheduler = new PlayerRefetchScheduler({
      db: db as unknown as DatabaseClient,
      logger: { info() {}, error() {} } as unknown as Logger,
      osuPublisher: {
        async publish(message) {
          await publish(message as { osuPlayerId: number });
          return message as FetchOsuMessage;
        },
      },
      osuTrackPublisher: {
        async publish(message) {
          await publish(message);
          return message as FetchPlayerOsuTrackMessage;
        },
      },
      config: {
        osu: {
          enabled: source === 'osu',
          intervalMinutes: 30,
          outdatedDays: 14,
        },
        osuTrack: {
          enabled: source === 'osuTrack',
          intervalMinutes: 30,
          outdatedDays: 60,
        },
      },
    });
    async function publish(message: { osuPlayerId: number }) {
      published.push(message.osuPlayerId);
      if (completeBeforeFailure) {
        await db
          .update(schema.players)
          .set({
            [status]: DataFetchStatus.Fetched,
            [lastFetch]: new Date().toISOString(),
          })
          .where(eq(schema.players.osuId, message.osuPlayerId));
      }
      if (fail) throw new Error('publish failed');
      return message;
    }
    async function run() {
      await scheduler.start();
      await scheduler.stop();
    }
    async function seedPlayer(age: number | null, fetching = true) {
      fail = false;
      completeBeforeFailure = false;
      await db.delete(schema.players);
      published.length = 0;
      await db.insert(schema.players).values({
        osuId: 999_400_001,
        [status]: fetching ? DataFetchStatus.Fetching : DataFetchStatus.Fetched,
        [lastFetch]: age === null ? null : daysAgo(age),
      });
    }
    beforeAll(async () => {
      await pool.query(`CREATE SCHEMA ${namespace};
        CREATE TABLE ${namespace}.players (LIKE public.players INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING CONSTRAINTS INCLUDING INDEXES);
        CREATE TABLE ${namespace}.player_ratings (LIKE public.player_ratings INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING CONSTRAINTS INCLUDING INDEXES);`);
    });
    afterAll(async () => {
      await scheduler.stop();
      await pool.query(`DROP SCHEMA ${namespace} CASCADE`);
      await pool.end();
    });
    it('recovers stale fetching before the normal cadence and renews its lease', async () => {
      await seedPlayer(2);
      await run();
      expect(published).toEqual([999_400_001]);
      await run();
      expect(published).toHaveLength(1);
    });
    it('does not reclaim an active lease', async () => {
      await seedPlayer(0.5);
      await run();
      expect(published).toHaveLength(0);
    });
    if (source === 'osuTrack')
      it('recovers fetching with no previous fetch timestamp', async () => {
        await seedPlayer(null);
        await run();
        expect(published).toHaveLength(1);
        await run();
        expect(published).toHaveLength(1);
      });
    it('resets a failed publication and allows a later retry', async () => {
      await seedPlayer(90, false);
      fail = true;
      await run();
      const player = await db.query.players.findFirst();
      expect(player?.[status]).toBe(DataFetchStatus.Error);
      fail = false;
      await run();
      expect(published).toHaveLength(2);
    });
    it('does not overwrite completion when a publication reports failure', async () => {
      await seedPlayer(90, false);
      fail = true;
      completeBeforeFailure = true;
      await run();
      const player = await db.query.players.findFirst();
      expect(player?.[status]).toBe(DataFetchStatus.Fetched);
      fail = false;
      completeBeforeFailure = false;
    });
  });
}
