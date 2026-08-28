import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { inArray } from 'drizzle-orm';
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
    expected: null,
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
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const osuIds = seed.map((player) => player.osuId);

  const published: Array<{ osuPlayerId: number; priority?: MessagePriority }> =
    [];

  const remove = () =>
    db.delete(schema.players).where(inArray(schema.players.osuId, osuIds));

  beforeAll(async () => {
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
