import { describe, expect, test } from 'bun:test';

import { BeatmapListItemSchema } from '../beatmapList';

describe('BeatmapListItemSchema', () => {
  test('accepts every displayed mod category', () => {
    const result = BeatmapListItemSchema.safeParse({
      id: 1,
      osuId: 2,
      artist: 'Artist',
      title: 'Title',
      diffName: 'Difficulty',
      ruleset: 0,
      sr: 5,
      bpm: 180,
      cs: 4,
      ar: 9,
      od: 8,
      hp: 6,
      totalLength: 120,
      beatmapsetOsuId: 3,
      creator: 'Mapper',
      verifiedTournamentCount: 1,
      verifiedGameCount: 1,
      topMods: ['NM', 'HD', 'HR', 'DT'].map((mod, index) => ({
        mod,
        mods: index,
        percentage: 25,
      })),
    });

    expect(result.success).toBe(true);
  });
});
