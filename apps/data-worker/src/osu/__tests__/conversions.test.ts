import { describe, expect, it } from 'bun:test';
import { Mods } from '@otr/core/osu/enums';

import { calculateScoreWithMods, convertModsToFlags } from '../conversions';

describe('convertModsToFlags', () => {
  it('returns none when mods are missing', () => {
    expect(convertModsToFlags(undefined)).toBe(Mods.None);
    expect(convertModsToFlags(null)).toBe(Mods.None);
    expect(convertModsToFlags([])).toBe(Mods.None);
  });

  it('converts string mod acronyms to bit flags', () => {
    const result = convertModsToFlags(['HD', 'HR']);

    expect(result).toBe((Mods.Hidden | Mods.HardRock) as Mods);
  });

  it('converts osu API mod objects to bit flags', () => {
    const result = convertModsToFlags([{ acronym: 'HD' }, { acronym: 'HR' }]);

    expect(result).toBe((Mods.Hidden | Mods.HardRock) as Mods);
  });

  it('ignores unknown mod values gracefully', () => {
    const result = convertModsToFlags([
      { acronym: '??' },
      null,
      undefined,
      'unknown',
    ]);

    expect(result).toBe(Mods.None);
  });
});

describe('calculateScoreWithMods', () => {
  it('applies the easy multiplier with rounding', () => {
    expect(calculateScoreWithMods(100_001, Mods.Easy)).toBe(175_002);
  });

  it('applies the easy multiplier when combined with other mods', () => {
    expect(
      calculateScoreWithMods(200_000, (Mods.Easy | Mods.Hidden) as Mods)
    ).toBe(350_000);
  });

  it('returns the raw score without easy', () => {
    expect(calculateScoreWithMods(200_000, Mods.None)).toBe(200_000);
    expect(
      calculateScoreWithMods(200_000, (Mods.Hidden | Mods.HardRock) as Mods)
    ).toBe(200_000);
  });

  it('returns zero for non-finite scores', () => {
    expect(calculateScoreWithMods(Number.NaN, Mods.Easy)).toBe(0);
    expect(calculateScoreWithMods(Number.POSITIVE_INFINITY, Mods.None)).toBe(0);
  });
});
