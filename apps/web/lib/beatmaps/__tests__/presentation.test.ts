import { describe, expect, test } from 'bun:test';
import { Ruleset } from '@otr/core/osu';

import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  getDifficultyColor,
} from '../presentation';

describe('beatmap ruleset presentation', () => {
  test('distinguishes tournament mania key modes from difficulty names', () => {
    expect(
      getBeatmapDisplayRuleset(Ruleset.ManiaOther, "Mapper's [4K] Insane")
    ).toBe(Ruleset.Mania4k);
    expect(
      getBeatmapDisplayRuleset(Ruleset.ManiaOther, "Mapper's [7K] Expert")
    ).toBe(Ruleset.Mania7k);
  });

  test('keeps the native ruleset when no key-mode marker is present', () => {
    expect(getBeatmapDisplayRuleset(Ruleset.Taiko, 'Oni')).toBe(Ruleset.Taiko);
    expect(getBeatmapRulesetLabel(Ruleset.Catch, 'Rain')).toBe('osu!catch');
  });
});

describe('beatmap difficulty colors', () => {
  test('moves through the complete pastel difficulty spectrum', () => {
    expect(
      [1, 2, 2.5, 3.5, 4, 5, 5.5, 6.5, 7, 8].map(getDifficultyColor)
    ).toEqual([
      'var(--difficulty-light-blue)',
      'var(--difficulty-light-green)',
      'var(--difficulty-green)',
      'var(--difficulty-yellow)',
      'var(--difficulty-orange)',
      'var(--difficulty-red)',
      'var(--difficulty-violet)',
      'var(--difficulty-purple)',
      'var(--difficulty-deep-blue)',
      'var(--difficulty-black)',
    ]);
  });

  test('uses the easiest color for invalid or negative ratings', () => {
    expect(getDifficultyColor(Number.NaN)).toBe('var(--difficulty-light-blue)');
    expect(getDifficultyColor(-1)).toBe('var(--difficulty-light-blue)');
  });
});
