import { describe, expect, test } from 'bun:test';
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

  test('returns the selected set difficulties in query order', async () => {
    const calls: string[] = [];
    const rows = [
      { osuId: 10, diffName: 'Normal', ruleset: Ruleset.Osu, sr: 2.1 },
      { osuId: 11, diffName: '[4K] Insane', ruleset: Ruleset.Mania4k, sr: 5.4 },
    ];
    const db = {
      select: () => {
        calls.push('select');
        return {
          from: () => {
            calls.push('from');
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
    } as unknown as DatabaseClient;

    expect(await getRelatedBeatmapDifficulties(db, 42)).toEqual(rows);
    expect(calls).toEqual(['select', 'from', 'where', 'order:2']);
  });
});

describe('beatmap stats summary contract', () => {
  test('keeps verified played tournaments distinct from pool records', () => {
    const summary = BeatmapStatsSummarySchema.parse({
      totalGameCount: 8,
      totalTournamentCount: 4,
      verifiedPlayedTournamentCount: 2,
      totalPlayerCount: 12,
      firstPlayedAt: null,
      lastPlayedAt: null,
    });

    expect(summary.totalTournamentCount).toBe(4);
    expect(summary.verifiedPlayedTournamentCount).toBe(2);
  });
});
