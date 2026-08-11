import { describe, expect, test } from 'bun:test';

import { Mods } from '@otr/core/osu';

import { normalizeBeatmapDisplayMods } from '@/lib/utils/mods';
import { normalizeScoreModsArithmetic } from '../beatmapStatsHelpers';

/**
 * Parity between the pure-arithmetic mirror used to build the SQL CASE
 * expression (NORMALIZED_SCORE_MODS_SQL in beatmapProcedures) and the display
 * normalization the client uses (normalizeBeatmapDisplayMods). Both must map
 * every raw score bitmask to the same normalized combination.
 */
describe('normalizeScoreModsArithmetic', () => {
  const namedCases: Array<[string, number]> = [
    ['NM', Mods.None],
    ['HD', Mods.Hidden],
    ['HR', Mods.HardRock],
    ['DT', Mods.DoubleTime],
    ['NC', Mods.Nightcore],
    ['DTNC', Mods.DoubleTime | Mods.Nightcore],
    ['HDNC', Mods.Hidden | Mods.Nightcore],
    ['NF', Mods.NoFail],
    ['SO', Mods.SpunOut],
    ['HDNF', Mods.Hidden | Mods.NoFail],
    ['HDHRNCSO', Mods.Hidden | Mods.HardRock | Mods.Nightcore | Mods.SpunOut],
    ['EZDT', Mods.Easy | Mods.DoubleTime],
    ['FL', Mods.Flashlight],
    ['HDFL', Mods.Hidden | Mods.Flashlight],
    ['NFSO', Mods.NoFail | Mods.SpunOut],
    ['EZNC', Mods.Easy | Mods.Nightcore],
  ];

  test.each(namedCases)(
    'matches normalizeBeatmapDisplayMods for %s',
    (_label, mods) => {
      expect(normalizeScoreModsArithmetic(mods)).toBe(
        normalizeBeatmapDisplayMods(mods)
      );
    }
  );

  test('matches normalizeBeatmapDisplayMods for every 14-bit bitmask', () => {
    for (let mods = 0; mods < 1 << 14; mods++) {
      const arithmetic = normalizeScoreModsArithmetic(mods);
      const reference = normalizeBeatmapDisplayMods(mods);
      if (arithmetic !== reference) {
        throw new Error(
          `Mismatch for mods=${mods}: arithmetic=${arithmetic}, reference=${reference}`
        );
      }
    }
    expect(true).toBe(true);
  });

  test('strips NoFail and SpunOut', () => {
    expect(
      normalizeScoreModsArithmetic(Mods.NoFail | Mods.SpunOut | Mods.Hidden)
    ).toBe(Mods.Hidden);
  });

  test('folds Nightcore into DoubleTime', () => {
    expect(normalizeScoreModsArithmetic(Mods.Nightcore)).toBe(Mods.DoubleTime);
    expect(normalizeScoreModsArithmetic(Mods.Nightcore | Mods.DoubleTime)).toBe(
      Mods.DoubleTime
    );
  });

  test('leaves a legitimate zero (NM) at zero', () => {
    expect(normalizeScoreModsArithmetic(0)).toBe(0);
  });
});
