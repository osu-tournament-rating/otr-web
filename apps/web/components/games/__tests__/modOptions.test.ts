import { describe, expect, it } from 'bun:test';
import { Mods } from '@otr/core/osu';

import { modOptions } from '@/components/games/modOptions';

describe('modOptions', () => {
  it('labels every mod with its full name and code', () => {
    const labels = new Map(
      modOptions.map(({ value, label }) => [Number(value), label])
    );

    expect(labels.get(Mods.Mirror)).toBe('Mirror (MR)');
    expect(labels.get(Mods.ScoreV2)).toBe('ScoreV2 (V2)');
    expect(labels.get(Mods.HardRock)).toBe('Hard rock (HR)');
    expect(labels.get(Mods.Key7)).toBe('Mania 7 key (7K)');
    expect(labels.has(Mods.None)).toBe(false);

    // InvalidMods is a flag mask, not a mod, and keeps its plain text label.
    const bareCodes = modOptions
      .filter(({ value }) => Number(value) !== Mods.InvalidMods)
      .filter(({ label }) => !/^\S.* \([A-Z0-9]+\)$/.test(label))
      .map(({ label }) => label);

    expect(bareCodes).toEqual([]);
  });
});
