import { describe, expect, it } from 'bun:test';
import { Mods } from '@otr/core/osu/enums';

import { convertModsToFlags } from '../conversions';

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
    const result = convertModsToFlags([
      { acronym: 'HD' },
      { acronym: 'HR' },
    ]);

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
