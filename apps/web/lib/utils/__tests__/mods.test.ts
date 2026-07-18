import { describe, expect, it } from 'bun:test';

import { Mods } from '@otr/core/osu';
import {
  calculateBeatmapModDistribution,
  deriveGameIsFreeMod,
  filterBeatmapModDistribution,
  getBeatmapModLabel,
  mostCommonDisplayMods,
  normalizeBeatmapDisplayMods,
  resolveGameDisplayMods,
  resolveGameModsFromScores,
} from '../mods';

describe('beatmap mod display helpers', () => {
  it('removes incidental score mods and formats the remaining combination', () => {
    expect(normalizeBeatmapDisplayMods(Mods.NoFail | Mods.SpunOut)).toBe(
      Mods.None
    );
    expect(getBeatmapModLabel(Mods.NoFail)).toBe('NM');
    expect(getBeatmapModLabel(Mods.NoFail | Mods.Hidden | Mods.HardRock)).toBe(
      'HDHR'
    );
  });

  it('aggregates score-derived combinations using the detail chart rules', () => {
    const distribution = calculateBeatmapModDistribution([
      { mods: Mods.NoFail, scoreCount: 950 },
      { mods: Mods.None, scoreCount: 9 },
      { mods: Mods.NoFail | Mods.HardRock, scoreCount: 20 },
      { mods: Mods.Hidden, scoreCount: 11 },
      { mods: Mods.DoubleTime, scoreCount: 10 },
    ]);

    expect(
      distribution.map(({ mods, label, scoreCount }) => ({
        mods,
        label,
        scoreCount,
      }))
    ).toEqual([
      { mods: Mods.None, label: 'NM', scoreCount: 959 },
      { mods: Mods.HardRock, label: 'HR', scoreCount: 20 },
      { mods: Mods.Hidden, label: 'HD', scoreCount: 11 },
      { mods: Mods.DoubleTime, label: 'DT', scoreCount: 10 },
    ]);
    expect(distribution[0].percentage).toBeCloseTo(95.9);
    expect(distribution[1].percentage).toBeCloseTo(2);
    expect(distribution[2].percentage).toBeCloseTo(1.1);
    expect(distribution[3].percentage).toBeCloseTo(1);
  });

  it('filters chart entries against their share of all scores', () => {
    expect(
      filterBeatmapModDistribution(
        calculateBeatmapModDistribution([
          { mods: Mods.None, scoreCount: 991 },
          { mods: Mods.Hidden, scoreCount: 9 },
        ])
      ).map(({ label }) => label)
    ).toEqual(['NM']);
  });

  it('returns no usage for empty or invalid counts', () => {
    expect(calculateBeatmapModDistribution([])).toEqual([]);
    expect(
      calculateBeatmapModDistribution([
        { mods: Mods.Hidden, scoreCount: 0 },
        { mods: Mods.HardRock, scoreCount: Number.NaN },
      ])
    ).toEqual([]);
  });
});

describe('resolveGameDisplayMods', () => {
  it('uses the game mods when the game is not freemod', () => {
    expect(
      resolveGameDisplayMods({ isFreeMod: false, mods: Mods.HardRock }, [
        { mods: Mods.None },
      ])
    ).toEqual({ mods: Mods.HardRock, freemod: false });
  });

  it('reports the shared score combo for a uniform freemod game', () => {
    // The reported bug: freemod game records NoMod, every player used HD.
    expect(
      resolveGameDisplayMods({ isFreeMod: true, mods: Mods.None }, [
        { mods: Mods.Hidden },
        { mods: Mods.Hidden | Mods.NoFail },
      ])
    ).toEqual({ mods: Mods.Hidden, freemod: false });
  });

  it('falls back to FM when freemod combinations genuinely differ', () => {
    expect(
      resolveGameDisplayMods({ isFreeMod: true, mods: Mods.None }, [
        { mods: Mods.Hidden },
        { mods: Mods.HardRock },
      ])
    ).toEqual({ mods: Mods.None, freemod: true });
  });

  it('keeps the FM icon for a freemod game with no scores', () => {
    expect(
      resolveGameDisplayMods({ isFreeMod: true, mods: Mods.None }, [])
    ).toEqual({ mods: Mods.None, freemod: true });
  });
});

describe('deriveGameIsFreeMod', () => {
  it('is freemod when scores vary from a NoMod game', () => {
    expect(deriveGameIsFreeMod(Mods.None, [{ mods: Mods.Hidden }])).toBe(true);
  });

  it('is not freemod when a NoMod game only has NoMod/NoFail scores', () => {
    expect(
      deriveGameIsFreeMod(Mods.None, [
        { mods: Mods.None },
        { mods: Mods.NoFail },
      ])
    ).toBe(false);
  });

  it('is freemod when the game carries the freemod-allowed flag', () => {
    expect(deriveGameIsFreeMod(Mods.FreeModAllowed, [])).toBe(true);
  });

  it('is not freemod for a forced-mod game', () => {
    expect(deriveGameIsFreeMod(Mods.HardRock, [{ mods: Mods.HardRock }])).toBe(
      false
    );
  });
});

describe('resolveGameModsFromScores', () => {
  it('resolves HD for a NoMod freemod game where everyone played HD', () => {
    expect(
      resolveGameModsFromScores(Mods.None, [
        Mods.Hidden,
        Mods.Hidden | Mods.NoFail,
      ])
    ).toEqual({ mods: Mods.Hidden, freemod: false });
  });

  it('trusts forced game mods even with empty scores', () => {
    expect(resolveGameModsFromScores(Mods.HardRock, [])).toEqual({
      mods: Mods.HardRock,
      freemod: false,
    });
  });
});

describe('mostCommonDisplayMods', () => {
  it('returns NoMod for no games', () => {
    expect(mostCommonDisplayMods([])).toEqual({
      mods: Mods.None,
      freemod: false,
    });
  });

  it('reports HD across freemod games that all played HD', () => {
    expect(
      mostCommonDisplayMods([
        { mods: Mods.None, scoreMods: [Mods.Hidden, Mods.Hidden] },
        { mods: Mods.None, scoreMods: [Mods.Hidden] },
        {
          mods: Mods.None,
          scoreMods: [Mods.Hidden, Mods.Hidden | Mods.NoFail],
        },
      ])
    ).toEqual({ mods: Mods.Hidden, freemod: false });
  });

  it('picks the most frequent effective mod across games', () => {
    expect(
      mostCommonDisplayMods([
        { mods: Mods.HardRock, scoreMods: [] },
        { mods: Mods.HardRock, scoreMods: [] },
        { mods: Mods.None, scoreMods: [Mods.Hidden] },
      ])
    ).toEqual({ mods: Mods.HardRock, freemod: false });
  });
});
