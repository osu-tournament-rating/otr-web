import { describe, expect, test } from 'bun:test';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { Ruleset } from '@otr/core/osu';

import type { DatabaseClient } from '@/lib/db';
import { BeatmapStatsSummarySchema } from '@/lib/orpc/schema/beatmapStats';
import { getRelatedBeatmapDifficulties } from '../relatedBeatmapDifficulties';

describe('related beatmap difficulty query', () => {
  test('skips the query when the beatmap has no set', async () => {
    let queried = false;
    const db = {
      select: () => {
        queried = true;
        throw new Error('query should not run');
      },
    } as unknown as DatabaseClient;

    expect(await getRelatedBeatmapDifficulties(db, null)).toEqual([]);
    expect(queried).toBeFalse();
  });

  test('admits a deleted difficulty once it is overridden by hand', async () => {
    let clause: SQL | undefined;
    const db = {
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            where: (where: SQL) => {
              clause = where;
              return { orderBy: async () => [] };
            },
          }),
        }),
      }),
    } as unknown as DatabaseClient;

    await getRelatedBeatmapDifficulties(db, 42);

    const { sql: text } = new PgDialect().sqlToQuery(clause!);
    expect(text).toContain('"beatmaps"."manual_override"');
    expect(text).toContain('"beatmaps"."data_fetch_status" !=');
  });

  test('returns the selected set difficulties in query order', async () => {
    const calls: string[] = [];
    const rows = [
      {
        osuId: 10,
        diffName: 'Normal',
        ruleset: Ruleset.Osu,
        sr: 2.1,
        // Never pooled and no stats row: both counts fall to zero.
        pooledTournamentCount: 0,
        verifiedGameCount: 0,
      },
      {
        osuId: 11,
        diffName: '[4K] Insane',
        ruleset: Ruleset.Mania4k,
        sr: 5.4,
        pooledTournamentCount: 3,
        verifiedGameCount: 17,
      },
    ];
    const db = {
      select: () => {
        calls.push('select');
        return {
          from: () => {
            calls.push('from');
            return {
              leftJoin: () => {
                calls.push('leftJoin');
                return {
                  where: () => {
                    calls.push('where');
                    return {
                      orderBy: async (...order: unknown[]) => {
                        calls.push(`order:${order.length}`);
                        return rows;
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as DatabaseClient;

    expect(await getRelatedBeatmapDifficulties(db, 42)).toEqual(rows);
    expect(calls).toEqual(['select', 'from', 'leftJoin', 'where', 'order:2']);
  });
});

describe('beatmap stats summary contract', () => {
  test('keeps pool and played-pool counts distinct', () => {
    const summary = BeatmapStatsSummarySchema.parse({
      totalGameCount: 8,
      totalTournamentCount: 4,
      verifiedTournamentCount: 3,
      totalPlayedGameCount: 13,
      pooledPlayedTournamentCount: 3,
    });

    expect(summary.totalTournamentCount).toBe(4);
    expect(summary.totalPlayedGameCount).toBe(13);
    expect(summary.pooledPlayedTournamentCount).toBe(3);
  });

  test('separates usage credit from the verified population', () => {
    // Usage credit keeps games from tournaments rejected for format reasons.
    const summary = BeatmapStatsSummarySchema.parse({
      totalGameCount: 76,
      totalTournamentCount: 9,
      verifiedTournamentCount: 6,
      totalPlayedGameCount: 92,
      pooledPlayedTournamentCount: 7,
    });

    expect(summary.totalPlayedGameCount).toBeGreaterThan(
      summary.totalGameCount
    );
    expect(summary.verifiedTournamentCount).toBeLessThanOrEqual(
      summary.totalTournamentCount
    );
  });
});
